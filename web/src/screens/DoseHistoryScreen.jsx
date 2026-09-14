import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Toast } from 'antd-mobile'
import DoseHistoryPage from '../pages/DoseHistoryPage.jsx'
import DoseDetailDialog from '../components/DoseDetailDialog.jsx'
import { mockDevices, mockDoses } from '../mocks/data.js'

// DoseHistoryPage({ device, doses, loading, error, hasMore, loadingMore,
//                   onSelectDose, onLoadMore, onBack })
export default function DoseHistoryScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const device = mockDevices.find((d) => d.id === id) ?? null
  const [detailDose, setDetailDose] = useState(null)

  return (
    <>
      <DoseHistoryPage
        device={device}
        doses={mockDoses}
        loading={false}
        error={null}
        hasMore={true}
        loadingMore={false}
        onSelectDose={setDetailDose}
        onLoadMore={() => Toast.show({ content: '다음 30일치를 불러올 자리' })}
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
