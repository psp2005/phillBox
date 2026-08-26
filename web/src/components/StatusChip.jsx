import { resolveDoseStatus } from '../lib/doseStatus.js'
import { formatTime } from '../lib/format.js'
import styles from './StatusChip.module.css'

/**
 * 복약 상태 한 덩어리 — 아이콘 + 문구 (+ 시각).
 * 화면 2 / 4 / 6 / 7 이 모두 이걸 쓴다.
 *
 * spec §6.4 — 색만으로 구분하지 않고 반드시 아이콘을 같이 표시한다.
 *
 * @param {object|null} dose      복약 건. null 이면 "기록 없음"
 * @param {boolean}     showTime  복용/꺼냄 시각을 뒤에 붙일지
 */
export default function StatusChip({ dose, showTime = false }) {
  const status = resolveDoseStatus(dose)
  const time = showTime ? formatTime(dose?.taken_at ?? dose?.scheduled_at) : null

  return (
    <span className={styles.chip} style={{ color: status.color }}>
      <span className={styles.icon} aria-hidden="true">
        {status.icon}
      </span>
      {status.label}
      {time && <span className={styles.time}>{time}</span>}
    </span>
  )
}
