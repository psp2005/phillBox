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

  async function load(){
    setLoading(true)
    setError(null)
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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

    // 저장함의 토큰을 지우고 로그인 화면으로 (히스토리 규칙 3 — 떠나기는 replace)
  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }
  
  useEffect(() => {
    load()
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
