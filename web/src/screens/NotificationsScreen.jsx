import { useState } from 'react'
import { Toast } from 'antd-mobile'
import NotificationListPage from '../pages/NotificationListPage.jsx'
import DoseDetailDialog from '../components/DoseDetailDialog.jsx'
import { mockDoses, mockNotifications, mockWeek } from '../mocks/data.js'

/** 알림에서 복약 건을 찾을 때 쓰는 표 (화면 7 → 공용 팝업) */
const ALL_DOSES = [...mockWeek, ...mockDoses]

// NotificationListPage({ notifications, loading, error, onSelectNotification, onRefresh })
export default function NotificationsScreen() {
  const [readIds, setReadIds] = useState([])
  const [detailDose, setDetailDose] = useState(null)

  const notifications = mockNotifications.map((n) =>
    readIds.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n,
  )

  return (
    <>
      <NotificationListPage
        notifications={notifications}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onSelectNotification={(n) => {
          // 탭 한 번에 두 가지: 읽음 처리 + 공용 팝업 (spec §5 화면 7)
          setReadIds((prev) => (prev.includes(n.id) ? prev : [...prev, n.id]))
          const dose = ALL_DOSES.find((d) => d.id === n.dose_id)
          if (dose) setDetailDose(dose)
        }}
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
