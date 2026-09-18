import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Toast } from 'antd-mobile'
import DoseHistoryPage from '../pages/DoseHistoryPage.jsx'
import DoseDetailDialog from '../components/DoseDetailDialog.jsx'
import { api } from '../lib/api.js'
import { shiftDateKey, todayKey } from '../lib/format.js'
import { markDoseTaken } from '../lib/doses.js'


// 한 번에 불러오는 기간 (spec §5 화면 6 — 최근 30일, 더 필요하면 [더 보기])
const RANGE_DAYS = 30

// DoseHistoryPage({ device, doses, loading, error, hasMore, loadingMore,
//                   onSelectDose, onLoadMore, onBack })
export default function DoseHistoryScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [device, setDevice] = useState(null)
  const [doses, setDoses] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [from, setFrom] = useState(null) // 지금까지 불러온 가장 오래된 날짜
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
    const [marking, setMarking] = useState(false) // 수동 복용 처리 요청 중
  const [detailDose, setDetailDose] = useState(null)

  // 처음 열 때 — 오늘 포함 최근 30일
  async function load() {
    setLoading(true)
    setError(null)
    try {
      const to = todayKey()
      const rangeFrom = shiftDateKey(to, -(RANGE_DAYS - 1))
      const data = await api(`/api/devices/${id}/doses?from=${rangeFrom}&to=${to}`)
      setDevice(data.devices[0])
      setDoses(data.doses)
      setHasMore(data.has_more)
      setFrom(rangeFrom)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // [더 보기] — 지금 목록의 바로 이전 30일을 뒤에 붙인다
  // 그 30일이 비어 있으면, 기록이 나오거나 더 없을 때까지 이어서 거슬러 올라간다
  async function loadMore() {
    setLoadingMore(true)
    try {
      let to = shiftDateKey(from, -1)
      let rangeFrom
      let data
      do {
        rangeFrom = shiftDateKey(to, -(RANGE_DAYS - 1))
        data = await api(`/api/devices/${id}/doses?from=${rangeFrom}&to=${to}`)
        to = shiftDateKey(rangeFrom, -1)
      } while (data.doses.length === 0 && data.has_more)

      setDoses((prev) => [...prev, ...data.doses])
      setHasMore(data.has_more)
      setFrom(rangeFrom)
    } catch (err) {
      // 이미 보이는 목록을 오류 화면으로 덮지 않는다
      Toast.show({ icon: 'fail', content: err.message })
    } finally {
      setLoadingMore(false)
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
  }, [id])

  return (
    <>
      <DoseHistoryPage
        device={device}
        doses={doses}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onSelectDose={setDetailDose}
        onLoadMore={loadMore}
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
