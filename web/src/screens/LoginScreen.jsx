import { useNavigate } from 'react-router'
import LoginPage from '../pages/LoginPage.jsx'

// LoginPage({ loading, error, onLogin, onSignup })
export default function LoginScreen() {
  const navigate = useNavigate()
  return (
    <LoginPage
      loading={false}
      error={null}
      onLogin={() => navigate('/devices', { replace: true })}
      onSignup={() => navigate('/devices', { replace: true })}
    />
  )
}
