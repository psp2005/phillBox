import { createClient } from '@supabase/supabase-js'

/**
 * Supabase 연결 — 이 앱에서는 **인증(로그인/로그아웃/세션)** 에만 쓴다.
 *
 * 복약 데이터는 우리 Express 서버를 통해서만 주고받는다.
 * 테이블에 직접 접근하지 않는 이유: 접근 제어(§8.5)를 서버 한 곳에서만 판단하기 위해서다.
 * (anon 키로는 어차피 테이블이 안 열린다 — RLS 전면 차단)
 */

//createClient(주소, 키)는 supabase랑 통신 창구 객체를 하나 만듬, api.js가 내 서버랑 통신하듯
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
//export한 supabase는 api.js
