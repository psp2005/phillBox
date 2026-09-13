import { useState } from 'react'
import {Routes, Route, Navigate, useNavigate, useParams, useLocation, Outlet} from 'react-router'
import { Toast } from 'antd-mobile'
import DoseDetailDialog from './components/DoseDetailDialog.jsx'
import TabBarLayout from './components/TabBarLayout.jsx'
import DeviceDetailPage from './pages/DeviceDetailPage.jsx'
import DeviceListPage from './pages/DeviceListPage.jsx'
import DeviceRegisterPage from './pages/DeviceRegisterPage.jsx'
import DoseHistoryPage from './pages/DoseHistoryPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MedicationPage from './pages/MedicationPage.jsx'
import NotificationListPage from './pages/NotificationListPage.jsx'
import {
  mockDevices,
  mockDoses,
  mockMedication,
  mockNotifications,
  mockWeek,
} from './mocks/data.js'

/*
맨 처음에 목업 데이터로, 화면 퍼블리싱까지 확인하기위해
같은 이름의 ~~~Screen()컴포넌트와 ~~~Page()컴포넌트를 따로 두는 한 겹이 더 있는 구조로 시작함
목업데이터 사용대신 api연결한 후에도 이 구조는 유지
~Page()컴포넌트는 실제 화면그리기용이고
~Screen()은 데이터들을 API로부터 받아와 1:1대응되는 ~Page()의 props로 넣어주는 껍데기 역할임
*/





/*
안드로이드 백버튼 이슈는 "돌아올 이유 있는 경우만 history에 쌓는다"는 방향으로 해결
1.안으로 들어가는 경우 - history에 쌓기
2.뒤로가기 - nigate(-1) 
3. 로그인/등록완료...등 완료하기 작업 - {replace : true}
4.기기목록/알림목록 단순 하단 탭 전환 - - {replace : true}
*/


function LoginScreen(){
    const navigate = useNavigate()
    return(
      <LoginPage
        loading={false}
        error={null}
        onLogin={() => navigate('/devices', {replace: true})}
        onSignup={() => navigate('/devices', {replace: true})}
      />
    )
  }

function DeviceListScreen(){
  const navigate = useNavigate()
  return (
    <DeviceListPage
      devices={mockDevices}
      loading={false}
      error={null}
      onSelectDevice={(id) => navigate(`/devices/${id}`)}
      onAddDevice={() => navigate('/devices/new')}
      onRefresh={() => {}}
      onLogout={() => navigate('/login', {replace: true})}
    />
  )
}

// DeviceRegisterPage({ loading, error, onSubmit, onCancel })
function DeviceRegisterScreen() {
  const navigate = useNavigate()
  return (
    <DeviceRegisterPage
      loading={false}
      error={null}
      onSubmit={(values) => {
        console.log('등록 요청:', values)
        Toast.show({ icon: 'success', content: '기기를 등록했습니다' })
        navigate('/devices', {replace: true})
      }}
      onCancel={() => navigate(-1)}
    />
  )
}

// DeviceDetailPage({ device, week, loading, error,
//                    onSelectDose, onOpenMedication, onOpenHistory, onBack })
function DeviceDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams()//라우트 주소 url에서 값을 꺼내옴, 
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


// MedicationPage({ medication, deviceName, saving, error, onSave, onBack })
function MedicationScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const device = mockDevices.find((d) => d.id === id) ?? null

  return (
    <MedicationPage
      medication={mockMedication}
      deviceName={device?.nickname ?? ''}
      saving={false}
      error={null}
      onSave={(values) => {
        console.log('약 설정 저장:', values)
        Toast.show({ icon: 'success', content: '저장했습니다' })
        navigate(`/devices/${id}`, {replace: true})
      }}
      onBack={() => navigate(-1)}
    />
  )
}

// DoseHistoryPage({ device, doses, loading, error, hasMore, loadingMore,
//                   onSelectDose, onLoadMore, onBack })
function DoseHistoryScreen() {
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

// NotificationListPage({ notifications, loading, error, onSelectNotification, onRefresh })
function NotificationsScreen() {
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

// TabBarLayout({ activeKey, unreadCount, onChange, children })
function TabLayout() {
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
      onChange={(key) => navigate(key === 'devices' ? '/devices' : '/notifications', {replace: true})}
      //기기목록,알림목록 화면전환시에는 뒤로가기에도 반응하지 않게 hitory에 기록되지 않게 replace적용
    >
      <Outlet />
    </TabBarLayout>
  )
}



/** 알림에서 복약 건을 찾을 때 쓰는 표 (화면 7 → 공용 팝업) */
const ALL_DOSES = [...mockWeek, ...mockDoses]

export default function App() {
  // const [screen, setScreen] = useState('login')
  // const [selectedDeviceId, setSelectedDeviceId] = useState(null)

  // // 공용 팝업이 보여줄 복약 건. null 이면 팝업이 닫혀 있다.
  // // 화면 4·6·7 이 모두 이 상태 하나를 쓴다. (spec §5 공용 팝업)
  // const [detailDose, setDetailDose] = useState(null)

  // // 목업이 상수라 읽음 처리를 흉내내기 위한 임시 상태.
  // // 데이터 연결 단계에서 POST /api/notifications/:id/read 로 대체된다.
  // const [readIds, setReadIds] = useState([])

  // const devices = DEMO.empty ? [] : mockDevices
  // const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null
  // const week = DEMO.noMedication ? [] : mockWeek

  // const notifications = DEMO.noNotifications
  //   ? []
  //   : mockNotifications.map((n) =>
  //       readIds.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n,
  //     )
  // const unreadCount = notifications.filter((n) => !n.read_at).length

  // 화면 1은 팝업이 필요없으므로 따로 뺀다
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace/>}/>
      {/* replace는 "/"주소로 접속시 히스토리에 "/login"으로 기록하라는뜻, 이걸 사용하지않으면 history에 /,/login둘 다 남음 */}
      <Route path="/login" element={<LoginScreen/>} />



      {/* 하단 탭이 있는 화면만 path없는 레이아웃 전용 Route로 감싸기*/}
      <Route element={<TabLayout/>}>
        <Route path="/devices" element={<DeviceListScreen/>} />{/*홈*/}
        <Route path="/notifications" element={<NotificationsScreen />} />{/*알림목록*/}
      </Route>



      <Route path="/devices/new" element={<DeviceRegisterScreen />} />{/*기기등록*/}
      <Route path="/devices/:id" element={<DeviceDetailScreen />} />{/*기기상세*/}
      <Route path="/devices/:id/medications" element={<MedicationScreen />} />{/*약설정*/}
      <Route path="/devices/:id/history" element={<DoseHistoryScreen />} />{/*복약기록*/}
      {/*팝업(DoseDetailDialog)은 기기상세,복약기록,알림목록 각 페이지에 배치 */}
    </Routes>
  )
}
