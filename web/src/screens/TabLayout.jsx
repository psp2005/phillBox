import {useState} from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import TabBarLayout from '../components/TabBarLayout.jsx'
// import { mockNotifications } from '../mocks/data.js'

// TabBarLayout({ activeKey, unreadCount, onChange, children })
export default function TabLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // 배지 숫자. 여기서 안불러오고, app.jsx에서 
  //tabLayout의 자식인 device/notification각 페이지에서 GET으로 unread_count불러옴(배지 숫자)
  //setUnreadCount를 Outlet의 context라는 프롭을 통 device/notification에전달하여 unreadCount를 직접 수정할 수 있게해야함
  const [unreadCount, setUnreadCount] = useState(0)

  const activeKey = location.pathname.startsWith('/devices')
    ? 'devices' : 'notifications'

  //  API 대신 목데이터
  // const unreadCount = mockNotifications.filter((n) => !n.read_at).length

  return (
    <TabBarLayout
      activeKey={activeKey}
      unreadCount={unreadCount}
      // 기기목록·알림목록 전환은 history 에 쌓지 않는다 → 탭에서 뒤로가기 = 앱 종료
      onChange={(key) =>
        navigate(key === 'devices' ? '/devices' : '/notifications', { replace: true })
      }
    >
      <Outlet context={{ setUnreadCount }}/>
    </TabBarLayout>
  )
}
