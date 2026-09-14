import { useState } from 'react'
import {Routes, Route, Navigate, useNavigate, useParams, useLocation, Outlet} from 'react-router'
import { Toast } from 'antd-mobile'
import DeviceDetailScreen from './screens/DeviceDetailScreen.jsx'
import DeviceListScreen from './screens/DeviceListScreen.jsx'
import DeviceRegisterScreen from './screens/DeviceRegisterScreen.jsx'
import DoseHistoryScreen from './screens/DoseHistoryScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import MedicationScreen from './screens/MedicationScreen.jsx'
import NotificationsScreen from './screens/NotificationsScreen.jsx'
import TabLayout from './screens/TabLayout.jsx'
import {
  mockDevices,
  mockDoses,
  mockMedication,
  mockNotifications,
  mockWeek,
} from './mocks/data.js'

/*
맨 처음에 목업 데이터로, 화면 퍼블리싱까지 확인하기위해
같은 이름의 /web/src/screes속 '~~~Screen()'컴포넌트와 /web/src/pages속 '~~~Page()'컴포넌트를 따로 두는 한 겹이 더 있는 구조로 시작함
목업데이터 사용대신 api연결한 후에도 이 구조는 유지
~Page()컴포넌트는 실제 화면그리기용이고
~Screen()은 데이터들을 API로부터 받아와 1:1대응되는 ~Page()의 props로 넣어주는 껍데기 역할임
*/



/*
/web/src/screes속 파일들

안드로이드 백버튼 이슈는 "돌아올 이유 있는 경우만 history에 쌓는다"는 방향으로 해결
1.배너 탭/약설정/기기등록...등 안으로 들어가는 작업 - history에 쌓기
2.[뒤로] · [취소] · 등록/저장 완료..등 되돌아 나오는 경우 - navigate(-1)
3.로그인/로그아웃/하단 탭 전환...등 - {replace : true}
*/





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


      {/* 파고 들어가는 화면 (3, 4, 5, 6) — 탭 없음 */}
      <Route path="/devices/new" element={<DeviceRegisterScreen />} />{/*기기등록*/}
      <Route path="/devices/:id" element={<DeviceDetailScreen />} />{/*기기상세*/}
      <Route path="/devices/:id/medications" element={<MedicationScreen />} />{/*약설정*/}
      <Route path="/devices/:id/history" element={<DoseHistoryScreen />} />{/*복약기록*/}
      {/*팝업(DoseDetailDialog)은 기기상세,복약기록,알림목록 각 페이지에 배치 */}
    </Routes>
  )
}
