import { useState } from 'react'
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

/**
 * spec §6.3 규칙 3 — 데모용 화면 전환은 여기 useState 하나로 처리한다.
 * 나중에 라우터로 바꿀 때도 이 파일만 고치면 된다.
 *
 * 규칙 1 — 목업 데이터 주입도 전부 여기서만 한다.
 * 화면 컴포넌트는 데이터가 어디서 왔는지 모른다.
 */

/**
 * 퍼블리싱 확인용 스위치.
 * 값을 바꿔서 로딩/오류/비어있음 화면을 눈으로 확인할 수 있다. (spec §6.2)
 * 데이터 연결 단계에서 통째로 지운다.
 */
const DEMO = {
  loading: false,
  error: null, // 예: '네트워크 연결을 확인해 주세요'
  empty: false, // true → 기기 0대
  formError: null, // 예: '등록코드가 일치하지 않습니다' (화면 3·5 상단 띠)
  noMedication: false, // true → 약 미설정 (화면 4 빈 화면, 화면 5 빈 폼)
  noNotifications: false, // true → 알림 0건
  hasMoreHistory: true, // 화면 6 하단 [더 보기] 버튼 보이기
}

/** 알림에서 복약 건을 찾을 때 쓰는 표 (화면 7 → 공용 팝업) */
const ALL_DOSES = [...mockWeek, ...mockDoses]

export default function App() {
  const [screen, setScreen] = useState('login')
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)

  // 공용 팝업이 보여줄 복약 건. null 이면 팝업이 닫혀 있다.
  // 화면 4·6·7 이 모두 이 상태 하나를 쓴다. (spec §5 공용 팝업)
  const [detailDose, setDetailDose] = useState(null)

  // 목업이 상수라 읽음 처리를 흉내내기 위한 임시 상태.
  // 데이터 연결 단계에서 POST /api/notifications/:id/read 로 대체된다.
  const [readIds, setReadIds] = useState([])

  const devices = DEMO.empty ? [] : mockDevices
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null
  const week = DEMO.noMedication ? [] : mockWeek

  const notifications = DEMO.noNotifications
    ? []
    : mockNotifications.map((n) =>
        readIds.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n,
      )
  const unreadCount = notifications.filter((n) => !n.read_at).length

  // 화면 1은 팝업이 필요 없으므로 따로 뺀다
  if (screen === 'login') {
    return (
      <LoginPage
        loading={false}
        error={null}
        onLogin={() => setScreen('devices')}
        onSignup={() => setScreen('devices')}
      />
    )
  }

  return (
    <>
      {renderScreen()}

      <DoseDetailDialog
        dose={detailDose}
        visible={!!detailDose}
        marking={false}
        onClose={() => setDetailDose(null)}
        onMarkTaken={(doseId) => {
          // 목업 단계라 목록의 상태는 바뀌지 않는다.
          // 데이터 연결 단계에서 POST /api/doses/:id/taken 로 바뀔 자리.
          console.log('수동 복용 처리:', doseId)
          Toast.show({ icon: 'success', content: '복용으로 기록했습니다' })
          setDetailDose(null)
        }}
      />
    </>
  )

  function renderScreen() {
    // --- 하단 탭이 있는 화면 (2, 7) ---
    if (screen === 'devices' || screen === 'notifications') {
      return (
        <TabBarLayout
          activeKey={screen}
          unreadCount={unreadCount}
          onChange={setScreen}
        >
          {screen === 'devices' ? (
            <DeviceListPage
              devices={devices}
              loading={DEMO.loading}
              error={DEMO.error}
              onSelectDevice={(id) => {
                setSelectedDeviceId(id)
                setScreen('device')
              }}
              onAddDevice={() => setScreen('register')}
              onRefresh={() => {}}
              onLogout={() => setScreen('login')}
            />
          ) : (
            <NotificationListPage
              notifications={notifications}
              loading={DEMO.loading}
              error={DEMO.error}
              onRefresh={() => {}}
              onSelectNotification={(n) => {
                // 탭 한 번에 두 가지가 일어난다: 읽음 처리 + 공용 팝업 (spec §5 화면 7)
                setReadIds((prev) =>
                  prev.includes(n.id) ? prev : [...prev, n.id],
                )
                const dose = ALL_DOSES.find((d) => d.id === n.dose_id)
                if (dose) setDetailDose(dose)
              }}
            />
          )}
        </TabBarLayout>
      )
    }

    // --- 화면 3 ---
    if (screen === 'register') {
      return (
        <DeviceRegisterPage
          loading={DEMO.loading}
          error={DEMO.formError}
          onSubmit={(values) => {
            console.log('등록 요청:', values)
            Toast.show({ icon: 'success', content: '기기를 등록했습니다' })
            setScreen('devices')
          }}
          onCancel={() => setScreen('devices')}
        />
      )
    }

    // --- 화면 4 ---
    if (screen === 'device') {
      return (
        <DeviceDetailPage
          device={selectedDevice}
          week={week}
          loading={DEMO.loading}
          error={DEMO.error}
          onSelectDose={setDetailDose}
          onOpenMedication={() => setScreen('medication')}
          onOpenHistory={() => setScreen('history')}
          onBack={() => setScreen('devices')}
        />
      )
    }

    // --- 화면 5 ---
    if (screen === 'medication') {
      return (
        <MedicationPage
          medication={DEMO.noMedication ? null : mockMedication}
          deviceName={selectedDevice?.nickname ?? ''}
          saving={DEMO.loading}
          error={DEMO.formError}
          onSave={(values) => {
            console.log('약 설정 저장:', values)
            Toast.show({ icon: 'success', content: '저장했습니다' })
            setScreen('device')
          }}
          onBack={() => setScreen('device')}
        />
      )
    }

    // --- 화면 6 ---
    return (
      <DoseHistoryPage
        device={selectedDevice}
        doses={DEMO.noMedication ? [] : mockDoses}
        loading={DEMO.loading}
        error={DEMO.error}
        hasMore={DEMO.hasMoreHistory}
        loadingMore={false}
        onSelectDose={setDetailDose}
        onLoadMore={() => Toast.show({ content: '다음 30일치를 불러올 자리' })}
        onBack={() => setScreen('device')}
      />
    )
  }
}
