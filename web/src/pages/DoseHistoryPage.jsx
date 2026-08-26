import { Button, ErrorBlock, NavBar, Skeleton } from 'antd-mobile'
import StatusChip from '../components/StatusChip.jsx'
import { formatDate, formatTime } from '../lib/format.js'
import styles from './DoseHistoryPage.module.css'

/**
 * 화면 6 — 복약 기록 (spec §5)
 *
 * 날짜 내림차순 목록. 항목을 탭하면 공용 팝업이 열리고,
 * 지난 날짜의 수동 체크도 거기서 한다.
 *
 * 최근 30일만 보여주고, 더 필요하면 [더 보기]. (spec §5 화면 6)
 *
 * @param {object}  device
 * @param {Array}   doses     GET /api/devices/:id/doses 응답 (날짜 내림차순)
 * @param {boolean} loading
 * @param {string}  error
 * @param {boolean} hasMore   더 불러올 기록이 남았는지
 * @param {boolean} loadingMore
 * @param {(dose: object) => void} onSelectDose
 * @param {() => void} onLoadMore
 * @param {() => void} onBack
 */
export default function DoseHistoryPage({
  device,
  doses = [],
  loading = false,
  error = null,
  hasMore = false,
  loadingMore = false,
  onSelectDose,
  onLoadMore,
  onBack,
}) {
  return (
    <div className={styles.page}>
      <NavBar onBack={onBack}>복약 기록</NavBar>
      {renderBody()}
    </div>
  )

  function renderBody() {
    if (loading) {
      return (
        <div className={styles.list}>
          {[0, 1, 2, 3].map((i) => (
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

    if (doses.length === 0) {
      return (
        <div className={styles.stateBox}>
          <ErrorBlock
            status="empty"
            title="복약 기록이 없습니다"
            description="복약 시각이 지나면 여기에 하나씩 쌓입니다."
          />
        </div>
      )
    }

    return (
      <>
        <p className={styles.rangeNote}>
          {device?.nickname ? `${device.nickname} · ` : ''}최근 30일
        </p>

        <div className={styles.list}>
          {doses.map((dose) => (
            <button
              key={dose.id}
              type="button"
              className={styles.item}
              onClick={() => onSelectDose?.(dose)}
            >
              <span className={styles.when}>
                <span className={styles.date}>{formatDate(dose.scheduled_at)}</span>
                <span className={styles.scheduled}>
                  예정 {formatTime(dose.scheduled_at)}
                </span>
              </span>
              {/* showTime → 복용했으면 복용 시각, 아니면 예정 시각을 뒤에 붙인다 */}
              <StatusChip dose={dose} showTime />
            </button>
          ))}
        </div>

        {hasMore ? (
          <div className={styles.more}>
            <Button fill="outline" loading={loadingMore} onClick={onLoadMore}>
              더 보기
            </Button>
          </div>
        ) : (
          <p className={styles.endNote}>모든 기록을 불러왔습니다</p>
        )}
      </>
    )
  }
}
