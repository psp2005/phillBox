import { createRemoteJWKSet, jwtVerify } from 'jose'
import { fail } from './errors.js'

// Supabase 가 토큰 도장을 확인하라고 공개해 둔 "공개키 목록" 주소.
// 처음 한 번 받아오고 기억해 둔다 (요청마다 Supabase 에 묻지 않는다)
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
)

/**
 * 요청 헤더의 토큰을 확인하고 req.userId 에 사용자 id 를 넣는다 (Ⓒ ⑤)
 * requireMyDevice 가 req.device 를 채우는 것과 같은 방식이다.
 *
 * 토큰이 없거나 · 도장이 가짜이거나 · 만료됐으면 401
 */
export async function requireAuth(req, res, next) {
  // "Bearer eyJ..." → ["Bearer", "eyJ..."]
  const [scheme, token] = (req.headers.authorization ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) {
    return fail(res, 401, 'UNAUTHORIZED', '로그인이 필요합니다')
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`, // 우리 Supabase 프로젝트가 발급한 토큰인가
      audience: 'authenticated', // 로그인한 사용자용 토큰인가
    })
    req.userId = payload.sub // 토큰 주인의 id (auth.users 의 UUID)
    next()
  } catch (err) {
    // 어떤 검사에서 떨어졌는지 서버 터미널에만 남긴다 (만료 / 도장 불일치 / 발급처 불일치 …)
    console.warn('토큰 확인 실패:', err.code)
    return fail(res, 401, 'UNAUTHORIZED', '로그인이 만료되었습니다. 다시 로그인해 주세요')
  }
}
