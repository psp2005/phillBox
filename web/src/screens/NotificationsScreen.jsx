import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Toast } from 'antd-mobile'
import NotificationListPage from '../pages/NotificationListPage.jsx'
import DoseDetailDialog from '../components/DoseDetailDialog.jsx'
import { api } from '../lib/api.js'
import { markDoseTaken } from '../lib/doses.js'

// import { mockDoses, mockNotifications, mockWeek } from '../mocks/data.js'

// /** 알림에서 복약 건을 찾을 때 쓰는 표 (화면 7 → 공용 팝업) */
// const ALL_DOSES = [...mockWeek, ...mockDoses]

// NotificationListPage({ notifications, loading, error, onSelectNotification, onRefresh })
export default function NotificationsScreen() {
  // const [readIds, setReadIds] = useState([])
  const { setUnreadCount } = useOutletContext() // 부모 TabLayout 이 건넨 배지 갱신 함수
  const [notifications, setNotifications] = useState([])
  const [doses, setDoses] = useState([]) // 항목을 탭했을 때 팝업에 넣을 복약 건들
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detailDose, setDetailDose] = useState(null)
  const [marking, setMarking] = useState(false) // 수동 복용 처리 요청 중


   async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api('/api/notifications')
      // Page 는 한 줄에 device_nickname 을 기대한다 → devices 에서 찾아 붙인다
      const merged = data.notifications.map((n) => ({
        ...n,
        device_nickname:
          data.devices.find((d) => d.id === n.device_id)?.nickname ?? '기기',
      }))
      setNotifications(merged)
      setDoses(data.doses)
      setUnreadCount(data.unread_count)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  
  // 탭 한 번에 두 가지: 공용 팝업 + 읽음 처리 (spec §5 화면 7)
  async function selectNotification(n) {
    //  팝업 — 이미 받아둔 doses 에서 찾아 바로 연다 (요청 없음)
    const dose = doses.find((d) => d.id === n.dose_id) ?? null
    if (dose) setDetailDose(dose)

    //  읽음 처리 — 이미 읽은 알림이면 보내지 않는다
    if (n.read_at) return
    try {
      const data = await api(`/api/notifications/${n.id}/read`, { method: 'POST' })
      const updated = data.notifications[0]
      // 바뀐 한 줄만 갈아끼운다 (목록 전체를 다시 안 불러온다)
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, read_at: updated.read_at } : item,
        ),
      )
      setUnreadCount(data.unread_count)
    } catch {
      // 읽음 처리 실패는 조용히 넘긴다 — 팝업은 이미 떴고, 다음에 탭하면 다시 시도된다
    }
  }

  // 공용 팝업 [먹었어요로 표시]
  async function markTaken() {
    setMarking(true)
    try {
      const updated = await markDoseTaken(detailDose)
      setDoses((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setDetailDose(null)
      Toast.show({ icon: 'success', content: '복용으로 기록했습니다' })
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.message })
    } finally {
      setMarking(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <>
      <NotificationListPage
        notifications={notifications}
        loading={loading}
        error={error}
        onRefresh={load}
        onSelectNotification={selectNotification}
      />

      <DoseDetailDialog
        dose={detailDose}
        visible={!!detailDose}
        marking={marking}
        onClose={() => setDetailDose(null)}
        onMarkTaken={markTaken}
      />
    </>
  )
}
