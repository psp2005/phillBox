import { useNavigate, useParams } from 'react-router'
import { Toast } from 'antd-mobile'
import MedicationPage from '../pages/MedicationPage.jsx'
import { mockDevices, mockMedication } from '../mocks/data.js'

// MedicationPage({ medication, deviceName, saving, error, onSave, onBack })
export default function MedicationScreen() {
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
        navigate(-1)
      }}
      onBack={() => navigate(-1)}
    />
  )
}
