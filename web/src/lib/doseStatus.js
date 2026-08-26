/**
 * 복약 건(dose)의 상태를 화면에 어떻게 보여줄지 한 곳에서 정한다.
 *
 * spec §6.4 — 색만으로 구분하지 않는다. 반드시 아이콘을 같이 표시한다.
 * (적록색약이면 초록/빨강 구분이 안 되는데, 이 앱 사용자는 중장년층 보호자가 많다)
 *
 * spec §3.3 — missed 는 두 종류인데 status 값만으로는 구분이 안 된다.
 *   dispensed_at 이 비었으면  -> "약을 안 꺼내셨어요"
 *   dispensed_at 이 있으면    -> "꺼내셨는데 아직 안 드셨어요"
 */

/** tone -> 실제 색. antd-mobile 이 :root 에 심어둔 CSS 변수를 그대로 쓴다. */
export const TONE_COLOR = {
  success: 'var(--adm-color-success)',
  danger: 'var(--adm-color-danger)',
  warning: 'var(--adm-color-warning)',
  muted: 'var(--adm-color-weak)',
}

/**
 * @returns {{ key: string, tone: string, icon: string, label: string, color: string }}
 */
export function resolveDoseStatus(dose) {
  const base = (() => {
    if (!dose) {
      return { key: 'empty', tone: 'muted', icon: '·', label: '기록 없음' }
    }
    switch (dose.status) {
      case 'taken':
        return { key: 'taken', tone: 'success', icon: '✓', label: '복용 완료' }
      // 아이콘까지 다르게 준다. 색(빨강)은 같으므로 색맹이어도 두 경우가 구분된다
      case 'missed':
        return dose.dispensed_at
          ? {
              key: 'missed_not_taken',
              tone: 'danger',
              icon: '⚠',
              label: '꺼냈으나 미복용',
            }
          : {
              key: 'missed_not_dispensed',
              tone: 'danger',
              icon: '✕',
              label: '약을 안 꺼냄',
            }
      case 'dispensed':
        return { key: 'dispensed', tone: 'warning', icon: '⏳', label: '꺼냄' }
      case 'notified':
        return { key: 'notified', tone: 'warning', icon: '⏳', label: '안내함' }
      case 'scheduled':
      default:
        return { key: 'scheduled', tone: 'muted', icon: '·', label: '예정' }
    }
  })()

  return { ...base, color: TONE_COLOR[base.tone] }
}

/** 복용을 무엇이 판정했는지 (공용 팝업에서 "자동/수동" 표기) */
export const TAKEN_SOURCE_LABEL = {
  ir: '센서 자동 확인',
  camera: '카메라 자동 확인',
  manual: '보호자 직접 확인',
}
