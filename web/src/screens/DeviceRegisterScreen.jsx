import { useNavigate } from 'react-router'
import { Toast } from 'antd-mobile'
import DeviceRegisterPage from '../pages/DeviceRegisterPage.jsx'

// DeviceRegisterPage({ loading, error, onSubmit, onCancel })
export default function DeviceRegisterScreen() {
  const navigate = useNavigate()
  return (
    <DeviceRegisterPage
      loading={false}
      error={null}
      onSubmit={(values) => {
        console.log('등록 요청:', values)
        Toast.show({ icon: 'success', content: '기기를 등록했습니다' })
        navigate(-1)
      }}
      onCancel={() => navigate(-1)}
    />
  )
}
