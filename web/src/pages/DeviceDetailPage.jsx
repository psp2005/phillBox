import { Button, ErrorBlock, NavBar, Skeleton } from 'antd-mobile'
import { resolveDoseStatus } from '../lib/doseStatus.js'
import {
  dayNumber,
  formatPhone,
  toDateKey,
  todayKey,
} from '../lib/format.js'
import styles from './DeviceDetailPage.module.css'

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

/**
 * 범례 — 색만으로 구분하지 않기 위해 아이콘 뜻을 화면에 적어둔다 (spec §6.4)
 * 놓침은 두 종류라 아이콘도 둘로 나눈다 (spec §5 화면 6)
 */
const LEGEND = [
  { icon: '✓', label: '복용', color: 'var(--adm-color-success)' },
  { icon: '✕', label: '안 꺼냄', color: 'var(--adm-color-danger)' },
  { icon: '⚠', label: '미복용', color: 'var(--adm-color-danger)' },
  { icon: '⏳', label: '진행중', color: 'var(--adm-color-warning)' },
  { icon: '·', label: '예정', color: 'var(--adm-color-weak)' },
]

/**
 * 화면 4 — 기기 상세 (이번 주, spec §5)
 *
 * 주간 7칸은 "복약 건이 7개"가 아니다.
 * 복용 요일이 월·수·금이면 복약 건은 3개만 오므로,
 * 날짜 7칸을 먼저 그리고 해당 날짜의 복약 건을 찾아 끼운다.
 *
 * @param {object} device   기기 (별명, 일련번호, patient_phone)
  * @param {Array}  week     GET /api/devices/:id/doses 의 doses (7개가 아닐 수 있다)
 * @param {string[]} dateKeys  이번 주 월~일 "2026-09-14" 7개 — Screen 이 요청한 from~to
 * @param {boolean} hasMedication  약 설정이 있는가 (medications.length > 0)
 * @param {boolean} loading
 * @param {string}  error
 * @param {(dose: object) => void} onSelectDose  칸 탭 → 공용 팝업
 * @param {() => void} onOpenMedication
 * @param {() => void} onOpenHistory
 * @param {() => void} onBack
 */
export default function DeviceDetailPage({
  device,
  week = [],
  dateKeys = [],
  hasMedication = false,
  plannedDoseOf,
  loading = false,
  error = null,
  onSelectDose,
  onOpenMedication,
  onOpenHistory,
  onUnregister,
  unregistering = false,
  onBack,
}) {
  return (
    <div className={styles.page}>
      <NavBar
        onBack={onBack}
        right={
          <span
            className={styles.navUnregister}
            onClick={unregistering ? undefined : onUnregister}
          >
            {unregistering ? '해제 중…' : '연결 해제'}
          </span>
        }
      >
        {device?.nickname ?? '기기'} · 이번주
      </NavBar>

      {renderBody()}
    </div>
  )

  function renderBody() {
    if (loading) {
      return (
        <div className={styles.card}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={3} animated />
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

    // 약을 아직 설정하지 않은 기기 — 주간에 그릴 게 없다
    if (!hasMedication) {
      return (
        <div className={styles.stateBox}>
          <ErrorBlock
            status="empty"
            title="약이 설정되지 않았습니다"
            description="복용할 약과 시간을 먼저 설정해 주세요."
          />
          <div className={styles.stateActions}>
            <Button color="primary" onClick={onOpenMedication}>
              약 설정하기
            </Button>
          </div>
        </div>
      )
    }

    // 이번 주 월~일 날짜 7개를 만들고, 각 날짜에 해당하는 복약 건을 찾아 끼운다
    const today = todayKey()
    
    const slots = dateKeys.map((key) => {
      const dose = week.find((d) => toDateKey(d.scheduled_at) === key) ?? null
      // 기록이 없는 날도 복용 요일이면 탭할 수 있다 — 기기가 꺼져 있던 날의 수동 체크 (spec §10)
      return { key, dose, planned: dose ? null : (plannedDoseOf?.(key) ?? null) }
    })
    return (
      <>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>주간 현황</h2>
            <span className={styles.cardRange}>
              {dayNumber(dateKeys[0])}일 ~ {dayNumber(dateKeys[6])}일
            </span>
          </div>

          <div className={styles.week}>
            {slots.map((slot, i) => {
              const status = resolveDoseStatus(slot.dose)
              const isToday = slot.key === today
              const target = slot.dose ?? slot.planned // 탭했을 때 팝업에 넘길 건
              return (
                <button
                  key={slot.key}
                  type="button"
                  className={`${styles.cell} ${isToday ? styles.today : ''}`}
                  disabled={!target}
                  onClick={() => target && onSelectDose?.(target)}
                  aria-label={`${dayNumber(slot.key)}일 ${status.label}`}
                >
                  <span className={styles.weekday}>{WEEKDAY_LABELS[i]}</span>
                  <span className={styles.day}>{dayNumber(slot.key)}</span>
                  <span
                    className={`${styles.mark} ${slot.dose ? '' : styles.blank}`}
                    style={slot.dose ? { color: status.color } : undefined}
                    aria-hidden="true"
                  >
                    {slot.dose ? status.icon : ''}
                  </span>
                </button>
              )
            })}
          </div>

          <div className={styles.legend}>
            {LEGEND.map((item) => (
              <span key={item.label} className={styles.legendItem}>
                <span style={{ color: item.color }}>{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <Button block color="primary" fill="outline" onClick={onOpenMedication}>
            약 설정
          </Button>
          <Button block fill="outline" onClick={onOpenHistory}>
            복약 기록
          </Button>

          {/* tel: 은 순수한 링크라 on___ props 없이 그대로 둔다.
              a 태그로 두어야 길게 눌러 번호 복사도 된다.
              href 에는 저장된 원본(숫자만)을, 화면에는 하이픈을 넣어 보여준다 */}
          {device?.patient_phone && (
            <a className={styles.callLink} href={`tel:${device.patient_phone}`}>
              <Button block color="success">
                전화 걸기 ({formatPhone(device.patient_phone)})
              </Button>
            </a>
          )}
        </div>
      </>
    )
  }
}
