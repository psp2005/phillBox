import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Toast } from 'antd-mobile'
import DeviceDetailPage from '../pages/DeviceDetailPage.jsx'
import DoseDetailDialog from '../components/DoseDetailDialog.jsx'
import { mockDevices, mockWeek } from '../mocks/data.js'

// DeviceDetailPage({ device, week, loading, error,
//                    onSelectDose, onOpenMedication, onOpenHistory, onBack })
export default function DeviceDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams() // 라우트 주소 url에서 값을 꺼내옴
  const device = mockDevices.find((d) => d.id === id) ?? null
  const [detailDose, setDetailDose] = useState(null)

  return (
    <>
      <DeviceDetailPage
        device={device}
        week={mockWeek}
        loading={false}
        error={null}
        onSelectDose={setDetailDose}
        onOpenMedication={() => navigate(`/devices/${id}/medications`)}
        onOpenHistory={() => navigate(`/devices/${id}/history`)}
        onBack={() => navigate(-1)}
      />

      <DoseDetailDialog
        dose={detailDose}
        visible={!!detailDose}
        marking={false}
        onClose={() => setDetailDose(null)}
        onMarkTaken={() => {
          Toast.show({ icon: 'success', content: '복용으로 기록했습니다' })
          setDetailDose(null)
        }}
      />
    </>
  )
}
