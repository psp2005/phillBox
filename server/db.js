import pg from 'pg'

const {Pool} = pg//구조분해할당
//DB 연결 풀 - 서버 전체가 이걸 공유

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {rejectUnauthorized: false},//ssl의 인증서 검사가 실패해도 그냥 연결하도록 설정, 왜냐하면 이 인증서는 supabase가 스스로 발급한 인증서라서
})

/*
supabase에 올린 db랑 연결하는 방식에는 3가지가 있다.
1.Direct connection - db에 직통연결 (PORT 5432)
2.Session pooler - 중간에 연결 관리자를 하나 둠 (PORT 5432)  --내가 채택한 방법
3.Transaction pooler - 같은 관리자인데 더 짧게 끊음 (PORT 6543)

연결풀(connection pool)은 미리 만들어둔 연결을 돌려쓰는 대기실이다
db연결을 새로 만드는건 품이 많이 든다(인사+신분확인+준비),그래서 
몇 개 미리 만들어두고 돌려쓴다. pooler는 그 대기실을 supabase쪽에서
대신 관리해주는 서비스이다

그래서 위 new Pool로 생성한 pool은 위에서 이야기한 대기실이다.
(이때 new는 그 설계도(Pool)로 실제 물건 하나를 만든 것이다.)
참고로 pg는 미리 만들어둔 연결을 기본값(10개)를 쓴다
*/
