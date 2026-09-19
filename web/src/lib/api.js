/**
 * 서버 API 호출 유틸.
 *
 * 모든 화면이 이 함수 하나로 서버에 요청한다.
 * 서버 주소 붙이기 · JSON 변환 · 오류 처리를 여기서 한 번에 한다.
 * (Ⓒ 인증 단계에서 토큰을 헤더에 붙이는 것도 여기 한 곳만 고친다)
 */
import { supabase } from './supabase.js'

const BASE_URL = import.meta.env.VITE_API_URL
//BASE_URL은 npm run dev로 로컬에서는 express서버인 http://localhost:3000
//배포한 vercel에서는 대시보드에 적은 https://pillbox-server-wdjx.onrender.com가
//vercel에서 재배포되면서 VITE_API_URL에 들어가서 BASE_URL이 바뀜

/**
 * @param {string} path   "/api/devices" 처럼 슬래시로 시작하는 경로
 * @param {{ method?: string, body?: object }} options
 * @returns 서버가 보낸 JSON (성공일 때)
 * @throws  Error — message 는 화면에 그대로 띄울 한국어 문구
 */


/*
api컴포넌트 사용예시

api('/api/devices')                                          // 조회 (GET)
api('/api/notifications/1/read', { method: 'POST' })         // 본문 없는 POST
api('/api/user-devices', { method: 'POST', body: { serial, code } })  // 본문 있는 POST


*/

export async function api(path, { method = 'GET', body } = {}) {
  // 로그인 토큰을 꺼낸다 (localStorage 에서). 만료됐으면 supabase-js 가 새로 받아서 준다
  const { data: auth } = await supabase.auth.getSession()
  const token = auth.session?.access_token

  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  // 서버가 "누가 보낸 요청인지" 알 수 있게 (Ⓒ ⑤ 에서 서버가 이걸 확인한다)
  if (token) headers.Authorization = `Bearer ${token}`


  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    //네트워크로는 글자만 보낼 수 있으니 
    // JSON.stringfy()로 JS객체인 body를 JSON글자로 바꿈
    //{ serial: 'PB-2026-0001' }   →   '{"serial":"PB-2026-0001"}'

  } catch {
    //서버가 오류 코드(404·500)를 보내도 오류 응답이 오긴왔으니깐 실패로 치지 않는다,
    //catch로 빠지는건 서버가 꺼져 있거나, 인터넷이 끊겼거나, CORS 에 막혀서 응답자체가 없을때
    throw new Error('서버에 연결할 수 없습니다')
  }

  // 본문이 JSON 이 아닐 수도 있다 (ex: Express 기본 404 페이지)
  const data = await res.json().catch(() => null)
  //res.json() - 응답 본문(글자)을 자바스크립트 객체로 전환
  
  //.catch(() => null) — 본문이 JSON이 아니면 해석이 실패한다 
  // 예를 들어 없는 주소로 요청하면 Express가 Cannot GET /api/... 라는 HTML 응답
  // 그때 앱이 터지지 않고 data 가 null 이 되게함 - 예방

  if (!res.ok) {//상태코드가 200~299면 res.ok는 true, 그 외엔 false
    // 401 = 토큰이 없거나 만료·위조 → 로그아웃. RequireAuth 가 알아채고 /login 으로 보낸다
    if (res.status === 401) 
      await supabase.auth.signOut()
    const error = new Error(data?.error?.message ?? '요청에 실패했습니다')
    error.status = res.status
    error.code = data?.error?.code
    error.type = data?.error?.type
    throw error
  }

  return data
}


