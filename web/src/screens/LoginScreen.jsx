import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Toast } from 'antd-mobile'
import LoginPage from '../pages/LoginPage.jsx'
import { supabase } from '../lib/supabase.js'

// Supabase 가 주는 영어 오류를 화면용 한국어로 (code 는 @supabase/auth-js 의 error-codes)
function messageOf(error) {
  switch (error.code) {
    case 'invalid_credentials':
      return '이메일 또는 비밀번호가 올바르지 않습니다'
    case 'user_already_exists':
      return '이미 가입된 이메일입니다'
    case 'email_not_confirmed':
      return '이메일 인증이 끝나지 않은 계정입니다'
    case 'weak_password':
      return '비밀번호가 너무 약합니다'
    case 'email_address_invalid':
      return '사용할 수 없는 이메일 주소입니다'
    case 'over_email_send_rate_limit':
      return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요'
    default:
      return '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요'
  }
}

// LoginPage({ loading, error, onLogin, onSignup })
export default function LoginScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function login({ email, password }) {
    setLoading(true)
    setError(null)
    // 비밀번호는 우리 서버를 거치지 않고 Supabase 인증 서버로 바로 간다.
    // 성공하면 supabase-js 가 토큰을 localStorage 에 알아서 저장한다.
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(messageOf(error))
      return
    }
    navigate('/devices', { replace: true })
  }

  async function signup({ email, password }) {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(messageOf(error))
      return
    }
    // 대시보드에서 이메일 인증이 켜져 있으면 세션 없이 돌아온다 → 바로 들어갈 수 없다
    if (!data.session) {
      Toast.show({ content: '가입 확인 메일을 보냈습니다. 인증 후 로그인해 주세요' })
      return
    }
    navigate('/devices', { replace: true })
  }

  return (
    <LoginPage loading={loading} error={error} onLogin={login} onSignup={signup} />
  )
}
