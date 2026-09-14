import {useEffect, useState} from 'react'
import { useNavigate } from 'react-router'
import DeviceListPage from '../pages/DeviceListPage.jsx'
import {api} from '../lib/api.js'

// DeviceListPage({ devices, loading, error, onSelectDevice, onAddDevice, onRefresh, onLogout })
export default function DeviceListScreen() {

  const navigate = useNavigate()
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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
      onLogout={() => navigate('/login', { replace: true })}
    />
  )
}
