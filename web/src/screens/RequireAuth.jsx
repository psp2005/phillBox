import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import { supabase } from '../lib/supabase.js'

/**
 * 로그인해야 들어갈 수 있는 화면들을 감싸는 문지기 (Ⓒ ③)
 *
 * TabLayout 과 같은 "path 없는 레이아웃 라우트". 통과하면 <Outlet />, 아니면 /login.
 * 서버의 requireMyDevice 와 같은 발상 — 통과 여부를 입구 한 곳에서만 판단한다.
 */
export default function RequireAuth() {
  // undefined = 아직 확인 중 / null = 로그인 안 함 / 객체 = 로그인함
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // ① 앱이 켜질 때 저장함(localStorage)에 로그인 정보가 있는지 확인
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    // ② 이후 로그인·로그아웃·토큰 만료가 일어날 때마다 알려달라고 등록
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // 이 화면이 사라질 때 등록을 해제한다 (안 하면 알림 받는 곳이 계속 쌓인다)
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // 확인 중 — 아주 잠깐 빈 화면
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
