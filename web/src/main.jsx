import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'//주소를 감시하는 감시자, 앱 전체를 감싸야 안쪽 컴포넌트들이 지금 주소가 뭔지 알 수 있다.
import 'antd-mobile/es/global'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
