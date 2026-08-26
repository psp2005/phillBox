/**
 * 목업 데이터.
 *
 * spec §6.3 규칙 2 — 목업의 모양은 §8 API 응답 모양과 똑같이 만든다.
 * 나중에 fetch 결과를 그대로 꽂았을 때 화면을 다시 손볼 일이 없게 하려는 것.
 *
 * 시각은 전부 UTC(Z) 다. 화면에서 lib/format.js 가 KST 로 바꿔 보여준다.
 * (KST 08:00 = 전날 UTC 23:00)
 *
 * 기준 주: 2026-08-10(월) ~ 08-16(일), 오늘은 08-13(목).
 */

/* ------------------------------------------------------------------ *
 * GET /api/devices  — 내 기기 목록 + 오늘 상태 (화면 2)
 * ------------------------------------------------------------------ */
export const mockDevices = [
  {
    id: 'dev_1',
    serial: 'PB-2026-0001',
    nickname: '할아버지 기기',
    patient_phone: '01012345678', // 숫자만 저장. 화면에서 formatPhone() 이 하이픈을 넣는다
    timezone: 'Asia/Seoul',
    today: {
      id: 'dose_4',
      scheduled_at: '2026-08-12T23:00:00Z',
      status: 'missed',
      notified_at: '2026-08-12T23:00:00Z',
      dispensed_at: null,
      taken_at: null,
      taken_source: null,
    },
  },
  {
    id: 'dev_2',
    serial: 'PB-2026-0042',
    nickname: '어머니 기기',
    patient_phone: null,
    timezone: 'Asia/Seoul',
    today: {
      id: 'dose_104',
      scheduled_at: '2026-08-13T00:30:00Z',
      status: 'taken',
      notified_at: '2026-08-13T00:30:00Z',
      dispensed_at: '2026-08-13T00:31:00Z',
      taken_at: '2026-08-13T00:33:00Z',
      taken_source: 'camera',
    },
  },
]

/* ------------------------------------------------------------------ *
 * GET /api/devices/:id/week  — 이번 주 복약 건 7개 (화면 4)
 * ------------------------------------------------------------------ */
export const mockWeek = [
  {
    id: 'dose_1',
    device_id: 'dev_1',
    scheduled_at: '2026-08-09T23:00:00Z', // 8/10(월) 08:00
    status: 'taken',
    notified_at: '2026-08-09T23:00:00Z',
    dispensed_at: '2026-08-09T23:02:00Z',
    taken_at: '2026-08-09T23:03:00Z',
    taken_source: 'ir',
  },
  {
    id: 'dose_2',
    device_id: 'dev_1',
    scheduled_at: '2026-08-10T23:00:00Z', // 8/11(화)
    status: 'taken',
    notified_at: '2026-08-10T23:00:00Z',
    dispensed_at: '2026-08-10T23:01:00Z',
    taken_at: '2026-08-10T23:05:00Z',
    taken_source: 'camera',
  },
  {
    id: 'dose_3',
    device_id: 'dev_1',
    scheduled_at: '2026-08-11T23:00:00Z', // 8/12(수) — 꺼냈으나 미복용
    status: 'missed',
    notified_at: '2026-08-11T23:00:00Z',
    dispensed_at: '2026-08-11T23:03:00Z',
    taken_at: null,
    taken_source: null,
  },
  {
    id: 'dose_4',
    device_id: 'dev_1',
    scheduled_at: '2026-08-12T23:00:00Z', // 8/13(목, 오늘) — 꺼내지도 않음
    status: 'missed',
    notified_at: '2026-08-12T23:00:00Z',
    dispensed_at: null,
    taken_at: null,
    taken_source: null,
  },
  {
    id: 'dose_5',
    device_id: 'dev_1',
    scheduled_at: '2026-08-13T23:00:00Z', // 8/14(금) — 아직 안 옴
    status: 'scheduled',
    notified_at: null,
    dispensed_at: null,
    taken_at: null,
    taken_source: null,
  },
  {
    id: 'dose_6',
    device_id: 'dev_1',
    scheduled_at: '2026-08-14T23:00:00Z', // 8/15(토)
    status: 'scheduled',
    notified_at: null,
    dispensed_at: null,
    taken_at: null,
    taken_source: null,
  },
  {
    id: 'dose_7',
    device_id: 'dev_1',
    scheduled_at: '2026-08-15T23:00:00Z', // 8/16(일)
    status: 'scheduled',
    notified_at: null,
    dispensed_at: null,
    taken_at: null,
    taken_source: null,
  },
]

/* ------------------------------------------------------------------ *
 * GET /api/devices/:id/doses  — 복약 기록 (화면 6, 날짜 내림차순)
 * ------------------------------------------------------------------ */
export const mockDoses = [
  ...mockWeek.filter((d) => d.status !== 'scheduled'),
  {
    id: 'dose_0',
    device_id: 'dev_1',
    scheduled_at: '2026-08-08T23:00:00Z', // 8/9(일)
    status: 'taken',
    notified_at: '2026-08-08T23:00:00Z',
    dispensed_at: '2026-08-08T23:10:00Z',
    taken_at: '2026-08-08T23:12:00Z',
    taken_source: 'manual',
  },
  {
    id: 'dose_m1',
    device_id: 'dev_1',
    scheduled_at: '2026-08-07T23:00:00Z', // 8/8(토)
    status: 'taken',
    notified_at: '2026-08-07T23:00:00Z',
    dispensed_at: '2026-08-07T23:04:00Z',
    taken_at: '2026-08-07T23:06:00Z',
    taken_source: 'ir',
  },
  {
    id: 'dose_m2',
    device_id: 'dev_1',
    scheduled_at: '2026-08-06T23:00:00Z', // 8/7(금)
    status: 'missed',
    notified_at: '2026-08-06T23:00:00Z',
    dispensed_at: null,
    taken_at: null,
    taken_source: null,
  },
].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))

/* ------------------------------------------------------------------ *
 * GET /api/devices/:id/medication  — 약 설정 (화면 5)
 * days: 0=일 ~ 6=토 (JS Date.getDay() 와 같은 번호)
 * ------------------------------------------------------------------ */
export const mockMedication = {
  device_id: 'dev_1',
  name: '혈압약',
  dosage: '1정',
  time: '08:00', // 기기 타임존 기준 벽시계 시각
  days: [0, 1, 2, 3, 4, 5, 6],
}

/* ------------------------------------------------------------------ *
 * GET /api/notifications  — 알림 목록 (화면 7, 시간순)
 * ------------------------------------------------------------------ */
export const mockNotifications = [
  {
    id: 'noti_1',
    device_id: 'dev_1',
    device_nickname: '할아버지 기기',
    dose_id: 'dose_4',
    type: 'missed_not_dispensed',
    message: '약을 안 꺼내셨어요',
    created_at: '2026-08-12T23:05:00Z',
    read_at: null,
  },
  {
    id: 'noti_2',
    device_id: 'dev_1',
    device_nickname: '할아버지 기기',
    dose_id: 'dose_3',
    type: 'missed_not_taken',
    message: '꺼내셨는데 아직 안 드셨어요',
    created_at: '2026-08-11T23:08:00Z',
    read_at: null,
  },
  {
    id: 'noti_3',
    device_id: 'dev_1',
    device_nickname: '할아버지 기기',
    dose_id: 'dose_m2',
    type: 'missed_not_dispensed',
    message: '약을 안 꺼내셨어요',
    created_at: '2026-08-06T23:05:00Z',
    read_at: '2026-08-07T01:00:00Z',
  },
]

/** 안 읽은 알림 개수 — 하단 탭의 빨간 배지에 쓴다 */
export const mockUnreadCount = mockNotifications.filter(
  (n) => !n.read_at,
).length
