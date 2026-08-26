import { ErrorBlock, NavBar, PullToRefresh, Skeleton } from 'antd-mobile'
import { formatListDateTime } from '../lib/format.js'
import styles from './NotificationListPage.module.css'

/**
 * 화면 7 — 알림 목록 (spec §5)
 *
 * 기기별로 묶지 않고 시간순 한 줄 목록이다.
 * 기기가 몇 대 안 되어 묶으면 오히려 한 번 더 눌러야 한다. (spec §11 결정 기록)
 *
 * ★ 푸시(FCM)와 이 목록은 별개다. 푸시는 던지면 끝이라 사본이 남지 않으므로,
 *   서버가 missed 판정을 받을 때 알림 테이블에 한 줄 저장해 둔 것을 여기서 읽는다. (spec §5)
 *
 * 항목을 탭하면 읽음 처리 + 공용 팝업이 함께 일어난다.
 * 30초 폴링은 데이터 연결 단계의 몫이라 여기엔 없다. (spec §6.2)
 *
 * @param {Array}   notifications  GET /api/notifications 응답 (시간 내림차순)
 * @param {boolean} loading
 * @param {string}  error
 * @param {(notification: object) => void} onSelectNotification
 * @param {() => (void|Promise)} onRefresh
 */
export default function NotificationListPage({
  notifications = [],
  loading = false,
  error = null,
  onSelectNotification,
  onRefresh,
}) {
  return (
    <>
      <NavBar backArrow={false}>알림</NavBar>
      <PullToRefresh onRefresh={async () => onRefresh?.()}>
        {renderBody()}
      </PullToRefresh>
    </>
  )

  function renderBody() {
    if (loading) {
      return (
        <div className={styles.list}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeletonItem}>
              <Skeleton.Paragraph lineCount={2} animated />
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className={styles.stateBox}>
          <ErrorBlock status="default" title="불러오지 못했습니다" description={error} />
        </div>
      )
    }

    if (notifications.length === 0) {
      return (
        <div className={styles.stateBox}>
          <ErrorBlock
            status="empty"
            title="알림이 없습니다"
            description="약을 놓치면 여기로 알려드립니다."
          />
        </div>
      )
    }

    return (
      <div className={styles.list}>
        {notifications.map((n) => {
          const unread = !n.read_at
          return (
            <button
              key={n.id}
              type="button"
              className={`${styles.item} ${unread ? styles.unread : ''}`}
              onClick={() => onSelectNotification?.(n)}
            >
              <span
                className={`${styles.dot} ${unread ? '' : styles.dotRead}`}
                aria-hidden="true"
              />
              <span className={styles.body}>
                <span className={styles.deviceName}>{n.device_nickname}</span>
                <span className={styles.message}>
                  {unread && <span className="sr-only">안 읽음 </span>}
                  {n.message}
                </span>
              </span>
              <span className={styles.time}>
                {formatListDateTime(n.created_at)}
              </span>
            </button>
          )
        })}
      </div>
    )
  }
}
