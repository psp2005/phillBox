// console.log('API주소 : ', import.meta.env.VITE_API_URL)
// console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
// console.log('KEY:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'//주소를 감시하는 감시자, 앱 전체를 감싸야 안쪽 컴포넌트들이 지금 주소가 뭔지 알 수 있다.
import 'antd-mobile/es/global'
import './index.css'
import App from './App.jsx'
import { unstableSetRender } from 'antd-mobile'


// antd-mobile v5 는 React 16~18 기준이라, Dialog·Toast 처럼 함수로 띄우는 부품이
// React 19 에서 조용히 아무것도 안 그린다. 그리는 방법을 직접 알려준다.
// https://mobile.ant.design/guide/v5-for-19
unstableSetRender((node, container) => {
  container._reactRoot ||= createRoot(container)
  const root = container._reactRoot
  root.render(node)
  return async () => {
    // 그리는 도중에 없애면 React 가 경고하므로 한 박자 뒤로 미룬다
    await new Promise((resolve) => setTimeout(resolve, 0))
    root.unmount()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
