"""
복약기 에뮬레이터 (spec.md §4 · §8.3)

실물:       라즈베리파이 + 아두이노(요일별 7칸 IR·LED) + 스피커 + 카메라
에뮬레이터: 화면의 7칸 LED + 키보드(IR·카메라 대신) + 노트북 음성

서버와 주고받는 API 는 실물과 똑같다.
  GET  /api/device/schedule   내 약 시간표 받아오기   (기본 60초마다)
  POST /api/device/events     안내·꺼냄·복용·놓침 보고

실행:
  python emulator.py
  python emulator.py --server https://pillbox-server-wdjx.onrender.com
  python emulator.py --key dk_test_0001 --serial PB-2026-0001
"""

import argparse
import subprocess
import threading
from datetime import datetime, timedelta, timezone

import requests
import tkinter as tk

# ── 기본값 (명령줄 옵션으로 덮어쓸 수 있다) ─────────────────────────
DEFAULT_SERVER = "http://localhost:3000"
DEFAULT_KEY = "dk_test_0002"      # seed 의 PB-2026-0002
DEFAULT_SERIAL = "PB-2026-0002"

# 화면 배치 순서. datetime.weekday() 와 같다 (월=0 … 일=6)
WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]

# LED 색 — 앱 화면의 상태 색과 뜻을 맞춘다
COLOR = {
    "off": "#d9d9d9",        # 할 일 없음 / 복용 요일 아님
    "waiting": "#e8f0ff",    # 오늘 복용 예정 (아직 시각 전)
    "notified": "#ffbe4d",   # 안내함 — 꺼내기 기다리는 중
    "dispensed": "#4d94ff",  # 꺼냄 — 복용 확인 기다리는 중
    "taken": "#3ecf8e",      # 복용 완료
    "missed": "#ff5a5a",     # 놓침
}

KST = timezone(timedelta(hours=9))


# ── 시간 유틸 ────────────────────────────────────────────────────
def tz_of(name):
    """기기 타임존 이름 → 파이썬 시간대. 한국은 서머타임이 없어 +09:00 고정으로 충분하다."""
    if name == "Asia/Seoul":
        return KST
    try:  # 다른 나라를 쓰게 되면 (윈도우는 tzdata 패키지가 필요할 수 있다)
        from zoneinfo import ZoneInfo

        return ZoneInfo(name)
    except Exception:
        return KST


def to_utc_iso(dt):
    """2026-09-21 15:25+09:00 → '2026-09-21T06:25:00Z' (서버가 쓰는 모양)"""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def now_utc_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Emulator:
    def __init__(self, root, args):
        self.root = root
        self.server = args.server.rstrip("/")
        self.key = args.key
        self.serial = args.serial
        self.poll_sec = args.poll
        self.timeout_sec = args.timeout
        self.mute = args.mute

        # 서버에서 받아온 시간표
        self.tz = KST
        self.medication = None          # {'name','dosage','time','days'} 또는 None

        # 지금 진행 중인 복약 건
        self.active = None              # {'scheduled_at': dt, 'state': 'notified'|'dispensed'}
        self.done_slots = set()         # 이미 처리한 복약 건 (중복 안내 방지)
        self.timer_job = None           # 5분(데모 30초) 타이머 취소용

        self._build_ui()
        self.log(f"에뮬레이터 시작 — {self.serial} → {self.server}")
        self.fetch_schedule()
        self.tick()

    # ── 화면 ────────────────────────────────────────────────────
    def _build_ui(self):
        self.root.title(f"복약기 에뮬레이터 — {self.serial}")

        self.status_var = tk.StringVar(value="상태: 준비 중")
        tk.Label(self.root, textvariable=self.status_var,
                 font=("맑은 고딕", 13, "bold")).pack(pady=(14, 4))

        self.schedule_var = tk.StringVar(value="시간표: 받아오는 중…")
        tk.Label(self.root, textvariable=self.schedule_var,
                 font=("맑은 고딕", 10), fg="#666666").pack()

        slots = tk.Frame(self.root)
        slots.pack(pady=12)
        today = datetime.now(KST).weekday()

        self.leds = []
        for i, name in enumerate(WEEKDAYS):
            column = tk.Frame(slots)
            column.pack(side="left", padx=9)

            led = tk.Label(column, width=5, height=2,
                           bg=COLOR["off"], relief="ridge", borderwidth=2)
            led.pack()
            self.leds.append(led)

            label = f"{name} ←오늘" if i == today else name
            tk.Label(column, text=label, font=("맑은 고딕", 10)).pack(pady=(4, 0))

        tk.Label(
            self.root,
            text="[a] 약 꺼냄(IR 감지)    [s] 복용 확인(카메라)    [d] 지금 바로 안내(데모)    [q] 종료",
            font=("맑은 고딕", 9), fg="#666666",
        ).pack(pady=(4, 8))

        self.log_box = tk.Text(self.root, width=74, height=12, font=("Consolas", 9))
        self.log_box.pack(padx=14, pady=(0, 14))

    def log(self, text):
        stamp = datetime.now(KST).strftime("%H:%M:%S")
        self.log_box.insert("end", f"[{stamp}] {text}\n")
        self.log_box.see("end")

    def set_status(self, text):
        self.status_var.set(f"상태: {text}")

    def set_led(self, weekday_index, state):
        self.leds[weekday_index].config(bg=COLOR[state])

    # ── 서버 통신 (창이 멈추지 않도록 딴 갈래에서 돌린다) ───────────
    def call(self, fn, on_done=None):
        def worker():
            try:
                result = fn()
            except Exception as err:               # 연결 실패·서버 오류
                self.root.after(0, lambda: self.log(f"⚠ 서버 통신 실패: {err}"))
                return
            if on_done:
                self.root.after(0, lambda: on_done(result))

        threading.Thread(target=worker, daemon=True).start()

    def fetch_schedule(self):
        """GET /api/device/schedule — 기본 60초마다"""
        def request():
            res = requests.get(
                f"{self.server}/api/device/schedule",
                headers={"X-Device-Key": self.key},
                timeout=15,
            )
            res.raise_for_status()
            return res.json()

        self.call(request, self.apply_schedule)
        self.root.after(self.poll_sec * 1000, self.fetch_schedule)

    def apply_schedule(self, data):
        self.tz = tz_of(data["devices"][0].get("timezone", "Asia/Seoul"))
        meds = data.get("medications", [])
        before = self.medication
        self.medication = meds[0] if meds else None

        if self.medication is None:
            self.schedule_var.set("시간표: 약 설정 없음 (앱에서 설정하세요)")
        else:
            m = self.medication
            days = " ".join(WEEKDAYS[(d - 1) % 7] for d in sorted(m["days"]))
            self.schedule_var.set(f"시간표: {m['name']} {m['dosage']} · {m['time']} · {days}")

        if before != self.medication:
            self.log(f"시간표 갱신 — {self.schedule_var.get()}")
            self.paint_week()

    def report(self, scheduled_dt, status, taken_source=None):
        """POST /api/device/events — 상태 보고"""
        body = {
            "scheduled_at": to_utc_iso(scheduled_dt),
            "status": status,
            "occurred_at": now_utc_iso(),
        }
        if taken_source:
            body["taken_source"] = taken_source

        def request():
            res = requests.post(
                f"{self.server}/api/device/events",
                headers={"X-Device-Key": self.key, "Content-Type": "application/json"},
                json=body,
                timeout=15,
            )
            res.raise_for_status()
            return res.json()

        def done(data):
            saved = data["doses"][0]
            self.log(f"→ 서버 기록됨: {saved['status']}")

        self.log(f"보고: {status}" + (f" ({taken_source})" if taken_source else ""))
        self.call(request, done)

    # ── 주간 LED 칠하기 ─────────────────────────────────────────
    def paint_week(self):
        """오늘·복용 요일 표시. 진행 중인 건은 tick 에서 따로 칠한다."""
        today = datetime.now(self.tz).weekday()
        for i in range(7):
            if self.is_dose_day(i):
                self.set_led(i, "waiting" if i == today else "off")
            else:
                self.set_led(i, "off")

    def is_dose_day(self, weekday_index):
        """weekday_index: 월=0 … 일=6 / medications.days: 일=0 … 토=6 (JS getDay 기준)"""
        if not self.medication:
            return False
        js_day = (weekday_index + 1) % 7
        return js_day in self.medication["days"]

    # ── 복약 흐름 ───────────────────────────────────────────────
    def tick(self):
        """1초마다 '지금이 복약 시각인가' 확인"""
        self.root.after(1000, self.tick)
        if self.medication is None or self.active is not None:
            return

        now = datetime.now(self.tz)
        if not self.is_dose_day(now.weekday()):
            return

        hh, mm = self.medication["time"].split(":")
        slot = now.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
        key = to_utc_iso(slot)

        # 시각이 지났고 아직 처리 안 한 건이면 시작 (60초 안에 들어온 것만 — 한참 전 건은 건너뛴다)
        if key not in self.done_slots and 0 <= (now - slot).total_seconds() <= 60:
            self.start_dose(slot)

    def start_dose(self, slot):
        """복약 시각 도달 — 음성 안내 + notified 보고 + 타이머 시작"""
        self.active = {"scheduled_at": slot, "state": "notified"}
        self.done_slots.add(to_utc_iso(slot))

        self.set_led(slot.weekday(), "notified")
        self.set_status(f"{slot.strftime('%H:%M')} 복약 안내 중 — [a] 약 꺼냄")
        name = self.medication["name"] if self.medication else "약"
        self.log(f"🔊 음성 안내: {name} 드실 시간입니다")
        self.speak(f"{name} 드실 시간입니다")

        self.report(slot, "notified")
        self.start_timer(self.on_dispense_timeout)

    def on_key(self, event):
        key = event.char.lower()
        if key == "q":
            self.root.destroy()
        elif key == "a":
            self.on_dispensed()
        elif key == "s":
            self.on_taken()
        elif key == "d":
            self.demo_start()

    def on_dispensed(self):
        if not self.active or self.active["state"] != "notified":
            self.log("(지금은 꺼낼 약이 없습니다)")
            return
        slot = self.active["scheduled_at"]
        self.active["state"] = "dispensed"
        self.cancel_timer()

        self.set_led(slot.weekday(), "dispensed")
        self.set_status("약을 꺼냈습니다 — [s] 복용 확인")
        self.log("IR 감지 — 약을 꺼냈습니다")
        self.report(slot, "dispensed")
        self.start_timer(self.on_take_timeout)   # 이제 카메라가 복용을 확인할 차례

    def on_taken(self):
        if not self.active:
            self.log("(지금은 확인할 복약 건이 없습니다)")
            return
        slot = self.active["scheduled_at"]
        source = "camera" if self.active["state"] == "dispensed" else "ir"
        self.cancel_timer()
        self.active = None

        self.set_led(slot.weekday(), "taken")
        self.set_status("복용 완료")
        self.log("복용 확인됨")
        self.report(slot, "taken", source)

    def on_dispense_timeout(self):
        """5분(데모 30초) 안에 안 꺼냄 → 놓침 (dispensed_at 없음)"""
        slot = self.active["scheduled_at"]
        self.active = None
        self.set_led(slot.weekday(), "missed")
        self.set_status("놓침 — 약을 안 꺼내셨습니다")
        self.log("타이머 종료 — 약을 꺼내지 않았습니다")
        self.report(slot, "missed")

    def on_take_timeout(self):
        """꺼냈지만 복용 확인 실패 → 놓침 (dispensed_at 있음)"""
        slot = self.active["scheduled_at"]
        self.active = None
        self.set_led(slot.weekday(), "missed")
        self.set_status("놓침 — 꺼냈으나 복용 확인 안 됨")
        self.log("타이머 종료 — 복용이 확인되지 않았습니다")
        self.report(slot, "missed")

    def demo_start(self):
        """[d] 시연용 — 지금 시각을 복약 건으로 삼아 흐름을 시작한다"""
        if self.active:
            self.log("(이미 진행 중입니다)")
            return
        now = datetime.now(self.tz).replace(second=0, microsecond=0)
        self.log("데모: 지금 시각으로 복약 안내를 시작합니다")
        self.start_dose(now)

    # ── 타이머 ─────────────────────────────────────────────────
    def start_timer(self, on_timeout):
        self.timer_job = self.root.after(self.timeout_sec * 1000, on_timeout)
        self.log(f"{self.timeout_sec}초 타이머 시작")

    def cancel_timer(self):
        if self.timer_job:
            self.root.after_cancel(self.timer_job)
            self.timer_job = None

    # ── 음성 ───────────────────────────────────────────────────
    def speak(self, text):
        """윈도우 내장 음성 합성(SAPI). 설치할 것이 없다."""
        if self.mute:
            return
        safe = text.replace("'", "")

        def run():
            try:
                subprocess.run(
                    ["powershell", "-NoProfile", "-Command",
                     "Add-Type -AssemblyName System.Speech; "
                     f"(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{safe}')"],
                    capture_output=True, timeout=30,
                )
            except Exception as err:
                self.root.after(0, lambda: self.log(f"(음성 재생 실패: {err})"))

        threading.Thread(target=run, daemon=True).start()


def main():
    parser = argparse.ArgumentParser(description="복약기 에뮬레이터")
    parser.add_argument("--server", default=DEFAULT_SERVER, help="서버 주소")
    parser.add_argument("--key", default=DEFAULT_KEY, help="기기 API 키 (X-Device-Key)")
    parser.add_argument("--serial", default=DEFAULT_SERIAL, help="창 제목에 쓸 일련번호")
    parser.add_argument("--poll", type=int, default=60, help="시간표 조회 주기(초). 실물은 300")
    parser.add_argument("--timeout", type=int, default=30, help="5분 타이머 대신 쓸 초. 실물은 300")
    parser.add_argument("--mute", action="store_true", help="음성 끄기")
    args = parser.parse_args()

    root = tk.Tk()
    app = Emulator(root, args)
    root.bind("<Key>", app.on_key)
    root.mainloop()


if __name__ == "__main__":
    main()
