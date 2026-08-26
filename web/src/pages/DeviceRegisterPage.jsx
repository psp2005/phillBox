import { Button, Form, Input, NavBar } from 'antd-mobile'
import styles from './DeviceRegisterPage.module.css'

/**
 * 화면 3 — 기기 등록 (spec §5)
 *
 * 일련번호(주소)와 등록코드(열쇠)를 함께 요구한다.
 * 일련번호만으로 등록되면 옆번호를 찍어 남의 복약 기록을 볼 수 있기 때문. (spec §5 화면 3)
 *
 * 여기서 하는 검증은 "모양"까지만이다 — 빈칸인지, 6자리인지.
 * "그 일련번호가 실제로 있는지 / 이미 등록된 기기인지"는 서버만 알 수 있으므로
 * error props 로 받아서 보여주기만 한다. (spec §6.2)
 *
 * 별명·환자 전화번호는 기기가 아니라 **이 보호자의** 값이다(spec §7).
 * 아들과 딸이 같은 기기를 공동 관리해도 각자 다르게 부를 수 있고,
 * 한 사람이 번호를 잘못 입력해도 다른 보호자에게 번지지 않는다.
 *
 * @param {boolean} loading
 * @param {string}  error   서버가 돌려준 오류 (예: '등록코드가 일치하지 않습니다')
 * @param {(v: {serial: string, code: string, nickname: string, patient_phone: string|null}) => void} onSubmit
 * @param {() => void} onCancel
 */
export default function DeviceRegisterPage({
  loading = false,
  error = null,
  onSubmit,
  onCancel,
}) {
  return (
    <div className={styles.page}>
      <NavBar onBack={onCancel}>기기 등록</NavBar>

      <div className={styles.hint}>
        <span className={styles.hintTitle}>등록 정보는 어디에 있나요?</span>
        일련번호와 등록코드는 <strong>기기 뒷면 스티커</strong>에 적혀 있습니다.
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Form
        layout="horizontal"
        onFinish={(values) =>
          onSubmit?.({
            serial: values.serial.trim().toUpperCase(),
            code: values.code.trim().toUpperCase(),
            nickname: values.nickname?.trim() || '',
            // 하이픈을 떼고 숫자만 보낸다 (spec §8.0 — 하이픈은 화면이 붙인다)
            patient_phone: values.patient_phone?.replace(/\D/g, '') || null,
          })
        }
        footer={
          <div className={styles.actions}>
            <Button block type="submit" color="primary" loading={loading}>
              등록하기
            </Button>
            <Button block fill="none" disabled={loading} onClick={onCancel}>
              취소
            </Button>
          </div>
        }
      >
        <Form.Item
          name="serial"
          label="일련번호"
          rules={[{ required: true, message: '일련번호를 입력해 주세요' }]}
        >
          <Input placeholder="PB-2026-0001" clearable />
        </Form.Item>

        <Form.Item
          name="code"
          label="등록코드"
          rules={[
            { required: true, message: '등록코드를 입력해 주세요' },
            {
              pattern: /^[A-Za-z0-9]{6}$/,
              message: '영문·숫자 6자리입니다',
            },
          ]}
        >
          <Input
            className={styles.codeInput}
            placeholder="6자리"
            maxLength={6}
            clearable
          />
        </Form.Item>

        <Form.Item
          name="nickname"
          label={
            <>
              기기 별명<span className={styles.optional}>선택</span>
            </>
          }
        >
          <Input placeholder="예: 할아버지 기기" clearable />
        </Form.Item>

        <Form.Item
          name="patient_phone"
          label={
            <>
              환자 전화번호<span className={styles.optional}>선택</span>
            </>
          }
          description="약을 놓치셨을 때 기기 화면에서 바로 전화를 걸 수 있습니다"
          rules={[
            {
              // 선택 항목이라 비어 있으면 통과. 모양만 본다 (spec §6.2)
              validator: (_, value) => {
                if (!value) return Promise.resolve()
                const digits = value.replace(/\D/g, '')
                return digits.length >= 9 && digits.length <= 11
                  ? Promise.resolve()
                  : Promise.reject(new Error('전화번호를 다시 확인해 주세요'))
              },
            },
          ]}
        >
          <Input placeholder="010-1234-5678" type="tel" clearable />
        </Form.Item>
      </Form>
    </div>
  )
}
