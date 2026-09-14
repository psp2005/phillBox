import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Toast } from 'antd-mobile'
import MedicationPage from '../pages/MedicationPage.jsx'
import { api } from '../lib/api.js'

// MedicationPage({ medication, deviceName, loading, loadError, saving, error, onSave, onBack })
export default function MedicationScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [medication, setMedication] = useState(null)
  const [deviceName, setDeviceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await api(`/api/devices/${id}/medications`)
      setDeviceName(data.devices[0].nickname)
      // 미설정이면 medications 가 [] → null 을 넘겨 빈 폼 (spec §8.2 4번)
      setMedication(data.medications[0] ?? null)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function save(values) {
    setSaving(true)
    setError(null)
    try {
      await api(`/api/devices/${id}/medications`, { method: 'PUT', body: values })
      Toast.show({ icon: 'success', content: '저장했습니다' })
      navigate(-1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  return (
    <MedicationPage
      medication={medication}
      deviceName={deviceName}
      loading={loading}
      loadError={loadError}
      saving={saving}
      error={error}
      onSave={save}
      onBack={() => navigate(-1)}
    />
  )
}
