# 복약기 에뮬레이터

실물 복약기(라즈베리파이 + 아두이노 7칸 IR·LED + 스피커 + 카메라) 대신 **노트북에서 복약기 흉내**를 낸다.
서버와 주고받는 API 는 실물과 **똑같다**(`spec.md` §8.3). IR 센서 자리에 키보드, 스피커 자리에 노트북 음성이 들어간다.

```
GET  /api/device/schedule   내 약 시간표 받아오기 (기본 60초마다)
POST /api/device/events     notified / dispensed / taken / missed 보고
```

## 준비

```bash
pip install requests
```

`tkinter`(창 그리기)는 파이썬에 기본 포함돼 있어 따로 설치하지 않는다.

## 실행

```bash
cd emulator
python emulator.py                                            # 로컬 서버 + PB-2026-0002
python emulator.py --server https://pillbox-server-wdjx.onrender.com   # 배포 서버
python emulator.py --key dk_test_0001 --serial PB-2026-0001   # 다른 기기로 (가상 기기 2대 동시 실행 가능)
python emulator.py --timeout 300 --poll 300                   # 실물과 같은 5분 타이머
python emulator.py --mute                                     # 음성 끄기
```

| 옵션 | 기본값 | 뜻 |
|---|---|---|
| `--server` | `http://localhost:3000` | 서버 주소 |
| `--key` | `dk_test_0002` | 기기 API 키 (`devices.device_api_key`) |
| `--serial` | `PB-2026-0002` | 창 제목 표시용 |
| `--poll` | `60` | 시간표 조회 주기(초). **실물은 300** |
| `--timeout` | `30` | 5분 타이머 대신 쓸 초. **실물은 300** |
| `--mute` | — | 음성 안내 끄기 |

## 키

| 키 | 실물에서는 | 하는 일 |
|---|---|---|
| `a` | IR 센서가 칸이 열린 것을 감지 | `dispensed` 보고 |
| `s` | 카메라가 복용을 확인 | `taken` 보고 (`taken_source=camera`) |
| `d` | — (에뮬레이터 전용) | **지금 시각**을 복약 건으로 삼아 안내 시작. 시연에서 시각을 못 맞출 때 |
| `q` | — | 종료 |

## LED 색

| 색 | 상태 |
|---|---|
| 회색 | 복용 요일 아님 / 할 일 없음 |
| 연파랑 | 오늘 복용 예정 (시각 전) |
| 노랑 | `notified` — 안내함, 꺼내기 기다리는 중 |
| 파랑 | `dispensed` — 꺼냄, 복용 확인 기다리는 중 |
| 초록 | `taken` — 복용 완료 |
| 빨강 | `missed` — 놓침 |

## 복약 흐름 (spec.md §4)

```
복약 시각 도달 → 🔊 음성 안내 + notified 보고 + 타이머 시작
   ├ 타이머 안에 [a]      → dispensed 보고 → 다시 타이머
   │    ├ 타이머 안에 [s] → taken(camera) 보고            ✅ 초록
   │    └ 시간 초과        → missed 보고 (꺼냈으나 미복용)  ❌ 빨강
   └ 시간 초과            → missed 보고 (약을 안 꺼냄)     ❌ 빨강
```

`missed` 보고가 서버에 닿으면 서버가 **연결된 보호자 전원에게 알림**을 만든다(`user_devices` 기준).
보호자 앱은 30초마다 다시 불러오므로 **손대지 않아도 화면이 바뀐다**.

## 시연 순서 (권장)

1. 서버(Render)와 Supabase 를 미리 깨워 둔다
2. 앱에서 **화면 5(약 설정)** → 복용 시각을 **1~2분 뒤**로, 요일에 **오늘**을 포함해 저장
3. 에뮬레이터 실행 (`--server` 를 배포 서버로) → 로그에 `시간표 갱신` 이 뜨는지 확인
4. 그 시각이 되면 **음성 안내 + 노란 LED**
5. 시나리오에 따라
   - 그냥 둔다 → 빨강 + **폰에 알림·배지**
   - `a` → 파랑, 이어서 `s` → 초록 + **폰 주간 칸 ✓**
6. 폰 화면은 **30초 안에 스스로** 바뀐다 (당겨서 새로고침 불필요)

## 가상 기기 여러 대

`devices` 에 줄이 있어야 키가 동작한다(앱은 `devices` 에 쓰지 않는다 — `spec.md` §7).
새 가상 기기가 필요하면 SQL 로 한 대 "출고"한 뒤 그 키로 실행한다.

```sql
insert into devices (serial, serial_normalized, registration_code, device_api_key)
values ('PB-2026-0004', 'PB20260004', 'K1K2K3', 'dk_test_0004');
```

## 겪을 수 있는 것

- **음성이 안 나온다** — 윈도우 내장 음성(SAPI)을 PowerShell 로 부른다. 한국어 음성이 없으면 어색하게 읽거나 조용할 수 있다. `--mute` 로 끄고 로그만 봐도 시연은 된다
- **`⚠ 서버 통신 실패`** — 서버가 꺼져 있거나(로컬), Render 가 자고 있다(첫 요청 30초+). 키가 틀리면 `401`
- **시각이 지난 건은 건너뛴다** — 시작하자마자 과거 복약 건을 몰아서 보고하지 않도록, 복약 시각 **60초 안**에 들어온 것만 시작한다. 시각을 놓쳤으면 `d` 키를 쓴다
- **상태는 앞으로만 간다**(서버 규칙) — 이미 `taken` 인 복약 건에 `missed` 를 보고해도 바뀌지 않는다. 같은 슬롯으로 다시 시연하려면 다른 시각으로 설정하거나 `d` 를 쓴다
