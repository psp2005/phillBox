import { Button, Form, Input, NavBar, Picker, Selector } from 'antd-mobile'
import styles from './MedicationPage.module.css'

/**
 * 화면 5 — 약 설정 (spec §5)
 *
 * 여기서 고치는 것은 "시간표"(medication) 이지 "출석부"(dose) 가 아니다. (spec §3.1)
 * 그래서 저장해도 이미 지난 복약 기록은 바뀌지 않는다.
 *
 * 약이 1종·하루 1회이므로 칸 번호 입력은 없다. (spec §5 화면 5)
 */

/** 시(時) 칸 — 00 ~ 23 */
const HOUR_COLUMN = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0')
  return { label: v, value: v }
})

/** 분(分) 칸 — 5분 단위. 복약 시각에 1분 단위는 필요 없고, 굴리기가 훨씬 편하다 */
const MINUTE_COLUMN = Array.from({ length: 12 }, (_, i) => {
  const v = String(i * 5).padStart(2, '0')
  return { label: v, value: v }
})

/** 요일. value 는 JS Date.getDay() 와 같은 번호(0=일). 배치는 월요일부터 */
const DAY_OPTIONS = [
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
  { label: '일', value: 0 },
]

/** '08:00' -> ['08', '00'] (Picker 는 칸별 값의 배열로 다룬다) */
function timeToColumns(time) {
  if (!time) return undefined
  const [h, m] = time.split(':')
  return [h, m]
}

/**
 * @param {object|null} medication  GET /api/devices/:id/medication 응답. 없으면 빈 폼
 * @param {string} deviceName       헤더에 보여줄 기기 별명
 * @param {boolean} saving
 * @param {string} error
 * @param {(v: {name, dosage, time, days}) => void} onSave
 * @param {() => void} onBack
 */
export default function MedicationPage({
  medication = null,
  deviceName = '',
  saving = false,
  error = null,
  onSave,
  onBack,
}) {
  const initialValues = {
    name: medication?.name ?? '',
    dosage: medication?.dosage ?? '',
    time: timeToColumns(medication?.time),
    days: medication?.days ?? [1, 2, 3, 4, 5, 6, 0],
  }

  return (
    <div className={styles.page}>
      <NavBar onBack={onBack}>약 설정</NavBar>

      {deviceName && <p className={styles.deviceName}>{deviceName}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <Form
        layout="vertical"
        initialValues={initialValues}
        onFinish={(values) =>
          onSave?.({
            name: values.name.trim(),
            dosage: values.dosage.trim(),
            // Picker 가 준 ['08','00'] 을 API 모양인 '08:00' 으로 되돌린다
            time: values.time.join(':'),
            days: [...values.days].sort(),
          })
        }
        footer={
          <>
            <p className={styles.footerNote}>
              저장하면 <strong>다음 복약분부터</strong> 적용됩니다. 이미 지난 기록은
              바뀌지 않습니다.
            </p>
            <Button block type="submit" color="primary" loading={saving}>
              저장
            </Button>
          </>
        }
      >
        <Form.Item
          name="name"
          label="약 이름"
          rules={[{ required: true, message: '약 이름을 입력해 주세요' }]}
        >
          <Input placeholder="예: 혈압약" clearable />
        </Form.Item>

        <Form.Item
          name="dosage"
          label="용량"
          rules={[{ required: true, message: '용량을 입력해 주세요' }]}
        >
          <Input placeholder="예: 1정" clearable />
        </Form.Item>

        {/* Picker 는 팝업이라 "값을 눌러서 연다".
            trigger='onConfirm' = 확인을 눌렀을 때의 값을 폼에 넣어라
            onClick 의 두 번째 인자로 Picker 손잡이(ref)가 들어와 open() 을 부를 수 있다 */}
        <Form.Item
          name="time"
          label="복용 시간"
          trigger="onConfirm"
          onClick={(e, pickerRef) => pickerRef.current?.open()}
          rules={[{ required: true, message: '복용 시간을 선택해 주세요' }]}
        >
          <Picker columns={[HOUR_COLUMN, MINUTE_COLUMN]} title="복용 시간">
            {(items) =>
              items[0] && items[1] ? (
                <span className={styles.pickerValue}>
                  {items[0].label}:{items[1].label}
                </span>
              ) : (
                <span className={styles.pickerPlaceholder}>시간을 선택하세요</span>
              )
            }
          </Picker>
        </Form.Item>

        <Form.Item
          name="days"
          label="복용 요일"
          rules={[
            {
              validator: (_, value) =>
                value?.length
                  ? Promise.resolve()
                  : Promise.reject(new Error('요일을 하나 이상 선택해 주세요')),
            },
          ]}
        >
          <Selector
            className={styles.daySelector}
            options={DAY_OPTIONS}
            multiple
            columns={7}
          />
        </Form.Item>

        <p className={styles.helpText}>선택한 요일에만 음성 안내를 합니다.</p>
      </Form>
    </div>
  )
}
