/**
 * 시간 표시 유틸.
 *
 * spec §3.4 규칙: 서버가 주는 값은 UTC(예: "2026-08-12T23:00:00Z"),
 * 화면에는 항상 한국시간(KST)으로 바꿔 보여준다.
 *
 * 브라우저의 시계가 한국이 아니어도 똑같이 보이도록
 * 아래 함수들은 timeZone 을 명시적으로 지정한다.
 */

const KST = 'Asia/Seoul'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** "2026-08-12T23:00:00Z" -> "08:00" */
export function formatTime(iso) {
  if (!iso) return null
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** "2026-08-12T23:00:00Z" -> "8월 13일 (목)" */
export function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d)
  const month = parts.find((p) => p.type === 'month').value
  const day = parts.find((p) => p.type === 'day').value
  return `${month}월 ${day}일 (${weekdayLabel(iso)})`
}

/** "2026-08-12T23:00:00Z" -> "목" */
export function weekdayLabel(iso) {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: KST,
    weekday: 'short',
  }).format(new Date(iso))
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return WEEKDAYS[map[short]]
}

/** KST 기준 날짜 문자열 "2026-08-13" — 같은 날인지 비교할 때 쓴다 */
export function toDateKey(iso) {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/** 아직 오지 않은 시각인가 (공용 팝업의 [먹었어요] 버튼을 감출 때 쓴다) */
export function isFuture(iso) {
  if (!iso) return false
  return new Date(iso).getTime() > Date.now()
}

/** 오늘(KST)인가 */
export function isToday(iso) {
  return toDateKey(iso) === toDateKey(new Date().toISOString())
}

/** 월요일을 0으로 두는 요일 번호 (화면 4의 월~일 7칸 배치용) */
export function mondayFirstIndex(iso) {
  const label = weekdayLabel(iso)
  return ['월', '화', '수', '목', '금', '토', '일'].indexOf(label)
}

/**
 * 주어진 시각이 속한 주(월~일)의 날짜 7개를 "2026-08-10" 형태로 돌려준다.
 *
 * 화면 4는 7칸을 항상 그려야 하는데, 복약 요일이 월·수·금이면 복약 건은 3개만 온다.
 * 그래서 "날짜 7칸"과 "그 날짜에 해당하는 복약 건"을 따로 구해서 맞춰 끼운다.
 */
export function weekDateKeys(anyIsoInWeek) {
  const key = toDateKey(anyIsoInWeek)
  const index = mondayFirstIndex(anyIsoInWeek)

  // 날짜 계산은 시차에 흔들리지 않도록 UTC 자정 기준으로만 더하고 뺀다
  const monday = new Date(`${key}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - index)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/** "2026-08-10" -> 10 (주간 현황 칸에 찍을 날짜 숫자) */
export function dayNumber(dateKey) {
  return Number(dateKey.slice(8, 10))
}

/** 오늘(KST)의 "2026-08-14" */
export function todayKey() {
  return toDateKey(new Date().toISOString())
}

/**
 * 알림 목록용 시각 — 오늘이면 "08:05", 다른 날이면 "8월 12일 08:05".
 * 오늘 것에까지 날짜를 붙이면 목록이 지저분해진다.
 */
export function formatListDateTime(iso) {
  if (!iso) return null
  const time = formatTime(iso)
  if (toDateKey(iso) === todayKey()) return time

  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(iso))
  const month = parts.find((p) => p.type === 'month').value
  const day = parts.find((p) => p.type === 'day').value
  return `${month}월 ${day}일 ${time}`
}

/**
 * "01012345678" -> "010-1234-5678"
 *
 * 전화번호는 DB·API 에 숫자만 담는다. 하이픈을 넣어 저장하면
 * "010-1234-5678" / "010 1234 5678" / "01012345678" 이 서로 다른 값이 되어
 * 검색·중복확인이 안 걸린다.
 *
 * 시각을 UTC 로 저장하고 화면에서 KST 로 바꾸는 것과 같은 원칙 —
 * 저장은 원본, 표시는 변환.
 *
 * tel: 링크에는 변환하지 않은 원본을 그대로 쓴다.
 */
export function formatPhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')

  // 010-1234-5678 (11자리) / 02-123-4567 같은 지역번호는 다루지 않는다.
  // 이 프로젝트가 받는 것은 환자 휴대폰 번호뿐이다.
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone // 예상 밖의 길이면 그대로 보여준다
}
