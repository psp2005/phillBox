import {useEffect, useState} from 'react'
import { useNavigate, useOutletContext } from 'react-router'
import DeviceListPage from '../pages/DeviceListPage.jsx'
import {api} from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

// DeviceListPage({ devices, loading, error, onSelectDevice, onAddDevice, onRefresh, onLogout })
export default function DeviceListScreen() {

  const navigate = useNavigate()
  const { setUnreadCount } = useOutletContext() // 부모 TabLayout 이 건넨 배지 갱신 함수
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)


  // silent = true 면 30초 자동 갱신 — 뼈대를 띄우지 않고 실패해도 화면을 지우지 않는다
  async function load({ silent = false } = {}) {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const data = await api('/api/devices')
      // 서버는 devices 와 today_doses 를 따로 준다 → Page 가 기대하는 device.today 로 합친다
      const merged = data.devices.map((device) => ({
        ...device,
        today: data.today_doses.find((dose) => dose.device_id === device.id) ?? null,
      }))
      setDevices(merged)
      setUnreadCount(data.unread_count)
    } catch (err) {
      if (!silent) setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

    // 저장함의 토큰을 지우고 로그인 화면으로 (히스토리 규칙 3 — 떠나기는 replace)
  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    load()
    // 복약기가 보고하면 폰 화면이 스스로 바뀌도록 30초마다 다시 불러온다 (spec §8.2 1번)
    const timer = setInterval(() => load({ silent: true }), 30000)
    return () => clearInterval(timer) // 화면을 떠나면 반드시 멈춘다
  }, [])

  return (
    <DeviceListPage
      devices={devices}
      loading={loading}
      error={error}
      onSelectDevice={(id) => navigate(`/devices/${id}`)}
      onAddDevice={() => navigate('/devices/new')}
      onRefresh={load}
      onLogout={logout}
    />
  )
}
