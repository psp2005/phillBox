import { useNavigate } from 'react-router'
import DeviceListPage from '../pages/DeviceListPage.jsx'
import { mockDevices } from '../mocks/data.js'

// DeviceListPage({ devices, loading, error, onSelectDevice, onAddDevice, onRefresh, onLogout })
export default function DeviceListScreen() {
  const navigate = useNavigate()
  return (
    <DeviceListPage
      devices={mockDevices}
      loading={false}
      error={null}
      onSelectDevice={(id) => navigate(`/devices/${id}`)}
      onAddDevice={() => navigate('/devices/new')}
      onRefresh={() => {}}
      onLogout={() => navigate('/login', { replace: true })}
    />
  )
}
