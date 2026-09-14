import { Outlet, useLocation, useNavigate } from 'react-router'
import TabBarLayout from '../components/TabBarLayout.jsx'
import { mockNotifications } from '../mocks/data.js'

// TabBarLayout({ activeKey, unreadCount, onChange, children })
export default function TabLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeKey = location.pathname.startsWith('/notifications')
    ? 'notifications'
    : 'devices'

  // Ⓑ 단계에서 API 응답의 unread_count 로 바뀐다
  const unreadCount = mockNotifications.filter((n) => !n.read_at).length

  return (
    <TabBarLayout
      activeKey={activeKey}
      unreadCount={unreadCount}
      // 기기목록·알림목록 전환은 history 에 쌓지 않는다 → 탭에서 뒤로가기 = 앱 종료
      onChange={(key) =>
        navigate(key === 'devices' ? '/devices' : '/notifications', { replace: true })
      }
    >
      <Outlet />
    </TabBarLayout>
  )
}
