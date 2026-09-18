import { useState , useEffect} from 'react'
import { useNavigate, useParams } from 'react-router'
import { Toast } from 'antd-mobile'
import DeviceDetailPage from '../pages/DeviceDetailPage.jsx'
import DoseDetailDialog from '../components/DoseDetailDialog.jsx'
import { api } from '../lib/api.js'
import { markDoseTaken } from '../lib/doses.js'
import { weekdayNumber, weekDateKeys } from '../lib/format.js'


// import { mockDevices, mockWeek } from '../mocks/data.js'

// DeviceDetailPage({ device, week, loading, error,
//                    onSelectDose, onOpenMedication, onOpenHistory, onBack })
export default function DeviceDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams() // 라우트 주소 url에서 값을 꺼내옴
  const [device, setDevice] = useState(null)
  const [week, setWeek] = useState([])
  // const [hasMedication, setHasMedication] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detailDose, setDetailDose] = useState(null)
  const [marking, setMarking] = useState(false) // 수동 복용 처리 요청 중
  const [medication, setMedication] = useState(null) // 약 설정 — 빈 칸의 예정 시각 계산에 쓴다



  // 오늘(KST)이 속한 주의 월~일 날짜 7개 — 요청 기간(from~to)이자 화면의 7칸
  const dateKeys = weekDateKeys(new Date().toISOString())

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api(`/api/devices/${id}/doses?from=${dateKeys[0]}&to=${dateKeys[6]}`)
      setDevice(data.devices[0])
      setWeek(data.doses)
      // medications 가 [] 이면 약 미설정 (spec §8.2 3번). doses 개수로 판단하지 않는다
      setMedication(data.medications[0] ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 공용 팝업 [먹었어요로 표시]
  async function markTaken() {
    setMarking(true)
    try {
      const updated = await markDoseTaken(detailDose)
      // setWeek((prev) => prev.map((d) => (d.id === updated.id ? updated : d))) //바뀐 한 건만 갈아끼운다 (목록 전체를 다시 안 불러온다 — spec §8.2 8번)
      // 빈 칸에서 처리하면 없던 복약 건이 새로 생기므로, 있으면 교체하고 없으면 추가한다
      setWeek((prev) =>
        prev.some((d) => d.id === updated.id)
          ? prev.map((d) => (d.id === updated.id ? updated : d))
          : [...prev, updated],
      )
      setDetailDose(null)
      Toast.show({ icon: 'success', content: '복용으로 기록했습니다' })
    } catch (err) {
      // 실패하면 팝업을 닫지 않는다 — 사용자가 다시 시도할 수 있게
      Toast.show({ icon: 'fail', content: err.message })
    } finally {
      setMarking(false)
    }
  }

    // 복약 건이 없는 날짜 칸을 탭했을 때 팝업에 넘길 "가상 복약 건"
  // 약 설정의 요일·시각으로 예정 시각을 계산한다. 저장은 [복약처리] 를 눌러야 서버에서 일어난다 (spec §10)
  function plannedDoseOf(dateKey) {
    if (!medication) return null
    // 그 날이 복용 요일이 아니면 누를 수 없다
    if (!medication.days.includes(weekdayNumber(`${dateKey}T00:00:00+09:00`))) return null

    return {
      id: null,
      device_id: id,
      // '2026-09-18' + '08:00' → 한국시간 08:00 을 UTC 로 (spec §3.4)
      scheduled_at: new Date(`${dateKey}T${medication.time}:00+09:00`).toISOString(),
      status: 'scheduled',
      notified_at: null,
      dispensed_at: null,
      taken_at: null,
      taken_source: null,
    }
  }

  useEffect(() => {
    load()
  }, [id])


  return (
    <>
      <DeviceDetailPage
        device={device}
        week={week}
        loading={loading}
        error={error}
        dateKeys={dateKeys}
        hasMedication={!!medication}
        plannedDoseOf={plannedDoseOf}
        onSelectDose={setDetailDose}
        onOpenMedication={() => navigate(`/devices/${id}/medications`)}
        onOpenHistory={() => navigate(`/devices/${id}/history`)}
        onBack={() => navigate(-1)}
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
