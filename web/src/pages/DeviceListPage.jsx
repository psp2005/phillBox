import { Button, ErrorBlock, NavBar, PullToRefresh, Skeleton } from 'antd-mobile'
import StatusChip from '../components/StatusChip.jsx'
import { ChevronRightIcon } from '../components/icons.jsx'
import styles from './DeviceListPage.module.css'

/**
 * 화면 2 — 기기 목록 (첫 화면, spec §5)
 *
 * spec §6.2 — 한 화면은 네 가지 모습을 모두 가져야 한다:
 *   로딩 중 / 오류 / 비어있음 / 정상
 *
 * @param {Array}    devices   GET /api/devices 응답 모양
 * @param {boolean}  loading
 * @param {string}   error
 * @param {(deviceId: string) => void} onSelectDevice
 * @param {() => void} onAddDevice
 * @param {() => (void|Promise)} onRefresh   당겨서 새로고침
 * @param {() => void} onLogout
 */
export default function DeviceListPage({
  devices = [],
  loading = false,
  error = null,
  onSelectDevice,
  onAddDevice,
  onRefresh,
  onLogout,
}) {
  return (
    <>
      <NavBar
        backArrow={false}
        left={
          <span className={styles.navLeft} onClick={onLogout}>
            로그아웃
          </span>
        }
        right={
          <span className={styles.navRight} onClick={onAddDevice}>
            + 등록
          </span>
        }
      >
        기기
      </NavBar>

      <PullToRefresh onRefresh={async () => onRefresh?.()}>
        {renderBody()}
      </PullToRefresh>
    </>
  )

  function renderBody() {
    // 1) 로딩 — 실제 카드와 같은 모양의 회색 뼈대를 보여준다.
    //    스피너만 돌리는 것보다 화면이 덜 튄다.
    if (loading) {
      return (
        <div className={styles.list}>
          {[0, 1].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton.Title animated />
              <Skeleton.Paragraph lineCount={2} animated />
            </div>
          ))}
        </div>
      )
    }

    // 2) 오류
    if (error) {
      return (
        <div className={styles.stateBox}>
          <ErrorBlock status="default" title="불러오지 못했습니다" description={error} />
          <div className={styles.emptyActions}>
            <Button color="primary" fill="outline" onClick={onRefresh}>
              다시 시도
            </Button>
          </div>
        </div>
      )
    }

    // 3) 비어있음
    if (devices.length === 0) {
      return (
        <div className={styles.stateBox}>
          <ErrorBlock
            status="empty"
            title="등록된 기기가 없습니다"
            description="기기 뒷면 스티커의 일련번호와 등록코드로 복약기를 등록해 주세요."
          />
          <div className={styles.emptyActions}>
            <Button color="primary" onClick={onAddDevice}>
              기기 등록하기
            </Button>
          </div>
        </div>
      )
    }

    // 4) 정상
    return (
      <div className={styles.list}>
        {devices.map((device) => (
          <button
            key={device.id}
            type="button"
            className={styles.card}
            onClick={() => onSelectDevice?.(device.id)}
          >
            <div className={styles.cardMain}>
              <div className={styles.nickname}>{device.nickname || '이름 없는 기기'}</div>
              <div className={styles.serial}>{device.serial}</div>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>오늘</span>
                <StatusChip dose={device.today} />
              </div>
            </div>
            <ChevronRightIcon className={styles.chevron} />
          </button>
        ))}
      </div>
    )
  }
}
