import { Button, CenterPopup, Dialog } from 'antd-mobile'
import { TAKEN_SOURCE_LABEL, resolveDoseStatus } from '../lib/doseStatus.js'
import { formatDate, formatTime, isFuture } from '../lib/format.js'
import StatusChip from './StatusChip.jsx'
import styles from './DoseDetailDialog.module.css'

/**
 * 공용 팝업 — 복약 상세 (spec §5)
 *
 * 화면 4(주간 칸 탭) · 화면 6(기록 항목 탭) · 화면 7(알림 항목 탭)이 이걸 함께 쓴다.
 * 화면을 늘리지 않고 세 곳에서 재사용하려고 팝업으로 만든 것. (spec §11 결정 기록)
 *
 * 보여주는 규칙 세 가지:
 *   1) 이미 taken   → 버튼 대신 "완료 + 무엇이 판정했는지"
 *   2) 미래 날짜     → [먹었어요로 표시] 를 감춘다 (아직 안 온 복약은 체크 불가)
 *   3) 그 외        → [먹었어요로 표시] + [닫기]
 *
 * @param {object|null} dose      복약 건. null 이면 아무것도 안 그린다
 * @param {boolean} visible
 * @param {boolean} marking       수동 복용 처리 요청 중
 * @param {() => void} onClose
 * @param {(doseId: string) => void} onMarkTaken
 */
export default function DoseDetailDialog({
  dose,
  visible = false,
  marking = false,
  onClose,
  onMarkTaken,
}) {
  const status = resolveDoseStatus(dose)

  // 되돌리기 어려운 동작이라 한 번 더 묻는다.
  // "물어보고 닫기"는 화면 안에서만 사는 상태라 퍼블 담당이다. (spec §6.2)
  const confirmMarkTaken = async () => {
    const ok = await Dialog.confirm({
      content: '복용하신 것으로 기록할까요?',
      confirmText: '기록하기',
      cancelText: '취소',
    })
    if (ok) onMarkTaken?.(dose.id)
  }

  return (
    <CenterPopup
      className={styles.popup}
      visible={visible && !!dose}
      onMaskClick={onClose}
      onClose={onClose}
      destroyOnClose
    >
      {dose && (
        <div className={styles.body}>
          <h3 className={styles.date}>{formatDate(dose.scheduled_at)}</h3>

          <div className={styles.rows}>
            <Row label="예정" value={formatTime(dose.scheduled_at)} />
            <Row label="꺼냄" value={formatTime(dose.dispensed_at)} />
            <Row label="복용" value={formatTime(dose.taken_at)} />
            <div className={styles.row}>
              <span className={styles.label}>상태</span>
              <StatusChip dose={dose} />
            </div>
          </div>

          <div className={styles.divider} />

          {renderFooter()}
        </div>
      )}
    </CenterPopup>
  )

  function renderFooter() {
    // 1) 이미 복용 완료 — 무엇이 판정했는지 같이 보여준다 (spec §3.3 taken_source)
    if (status.key === 'taken') {
      return (
        <>
          <div className={styles.doneBox}>
            <span aria-hidden="true">✓</span>
            복용 완료
            {dose.taken_source && ` · ${TAKEN_SOURCE_LABEL[dose.taken_source]}`}
          </div>
          <div style={{ height: 8 }} />
          <Button block fill="none" onClick={onClose}>
            닫기
          </Button>
        </>
      )
    }

    // 2) 아직 오지 않은 복약 — 체크 버튼을 감춘다
    if (isFuture(dose.scheduled_at)) {
      return (
        <>
          <div className={styles.futureNote}>
            아직 복약 시각이 되지 않았습니다.
          </div>
          <div style={{ height: 8 }} />
          <Button block fill="none" onClick={onClose}>
            닫기
          </Button>
        </>
      )
    }

    // 3) 놓쳤거나 진행 중 — 보호자가 직접 확인할 수 있다 (미탐의 안전망, spec §4.1)
    return (
      <div className={styles.actions}>
        <Button fill="outline" onClick={onClose} disabled={marking}>
          닫기
        </Button>
        <Button color="primary" loading={marking} onClick={confirmMarkTaken}>
          먹었어요로 표시
        </Button>
      </div>
    )
  }
}

function Row({ label, value }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${value ? '' : styles.empty}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}
