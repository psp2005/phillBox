import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Toast } from 'antd-mobile'
import DeviceRegisterPage from '../pages/DeviceRegisterPage.jsx'
import { api } from '../lib/api.js'

// DeviceRegisterPage({ loading, error, onSubmit, onCancel })
export default function DeviceRegisterScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(values) {
    setLoading(true)
    setError(null)
    try {
      // 만드는 것은 기기가 아니라 "보호자 ↔ 기기 연결" 이다 (spec §8.2 2번)
      await api('/api/user-devices', { method: 'POST', body: values })
      Toast.show({ icon: 'success', content: '기기를 등록했습니다' })
      // 목록으로 돌아가면 화면 2가 다시 불러온다 — 가나다순이라 프론트가 끼워 넣을 자리를 못 정한다
      navigate(-1)
    } catch (err) {
      // 서버가 보낸 문구를 그대로 보여준다 (일련번호 없음 / 코드 불일치 / 이미 등록)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DeviceRegisterPage
      loading={loading}
      error={error}
      onSubmit={submit}
      onCancel={() => navigate(-1)}
    />
  )
}
