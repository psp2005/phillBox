import { Button, Form, Input } from 'antd-mobile'
import styles from './LoginPage.module.css'

/**
 * 화면 1 — 로그인 / 회원가입 (spec §5)
 *
 * spec §6.3 규칙 1: 이 파일 안에는 fetch 도 store 도 없다.
 * 데이터와 동작은 전부 props 로 받는다.
 *
 * @param {boolean} loading  로그인/가입 요청 중인지 (버튼 비활성 + 스피너)
 * @param {string}  error    서버가 돌려준 오류 메시지 (없으면 null)
 * @param {(v: {email: string, password: string}) => void} onLogin
 * @param {(v: {email: string, password: string}) => void} onSignup
 */
export default function LoginPage({ loading, error, onLogin, onSignup }) {
  const [form] = Form.useForm()

  // 회원가입은 submit 버튼이 아니므로 검증을 직접 돌린 뒤 넘긴다
  const handleSignup = async () => {
    try {
      const values = await form.validateFields()
      onSignup?.(values)
    } catch {
      // 검증 실패 시 Form 이 각 칸 아래에 메시지를 띄운다
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <div className={styles.logo}>💊</div>
        <h1 className={styles.title}>복약기</h1>
        <p className={styles.subtitle}>부모님의 복약을 함께 챙깁니다</p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Form
        form={form}
        layout="vertical"
        className={styles.form}
        onFinish={(values) => onLogin?.(values)}
        footer={
          <div className={styles.actions}>
            <Button block type="submit" color="primary" loading={loading}>
              로그인
            </Button>
            <Button block fill="outline" disabled={loading} onClick={handleSignup}>
              회원가입
            </Button>
          </div>
        }
      >
        <Form.Item
          name="email"
          label="이메일"
          rules={[
            { required: true, message: '이메일을 입력해 주세요' },
            { type: 'email', message: '이메일 형식이 아닙니다' },
          ]}
        >
          <Input
            placeholder="example@email.com"
            type="email"
            clearable
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="비밀번호"
          rules={[
            { required: true, message: '비밀번호를 입력해 주세요' },
            { min: 6, message: '6자 이상 입력해 주세요' },
          ]}
        >
          <Input
            placeholder="6자 이상"
            type="password"
            clearable
            autoComplete="current-password"
          />
        </Form.Item>
      </Form>

      <div className={styles.socialSlot}>
        <div className={styles.divider}>또는</div>
        <p className={styles.socialHint}>소셜 로그인은 추후 제공됩니다</p>
      </div>
    </div>
  )
}
