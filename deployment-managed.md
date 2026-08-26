# 복약기 프로젝트 배포 구성 정리 (무료/저가 관리형 서비스 방식)

> 프론트·서버·DB는 직접 개발하고, 배포/호스팅은 관리형 서비스의 무료 티어를 조합하는 방식.
> (자체 호스팅 방식과의 비교는 별도 주제 — 이 문서는 관리형 방식만 다룸)

---

## 1. 전체 구조 한눈에

```
[복약기 디바이스]                 [보호자 PWA (React)]
 노트북 시뮬레이터 → 라즈베리파이      갤럭시 Chrome, 홈 화면 설치
      │                                 │
      │ REST (이벤트 보고, 스케줄 폴링)    │ REST (JSON API) + 로그인
      ▼                                 ▼
              [Express 서버]  ← 직접 개발, Render에 배포
                    │
                    │ supabase-js (service_role 키)
                    ▼
              [Supabase]  = PostgreSQL + Auth + Storage (임대)
                    +
              [Firebase FCM]  ← 서버가 푸시 발송 시에만 사용
```

- 코드를 올리는 "진짜 배포"는 **Vercel(프론트)과 Render(서버)** 두 곳뿐
- Supabase와 Firebase는 배포가 아니라 **콘솔에서 프로젝트 만들고 키만 받아오는 서비스**
- 디바이스는 어디에도 배포하지 않음 (로컬 실행되는 클라이언트)

---

## 2. 역할 분담표

| 계층 | 우리 코드 | 배포/제공처 | 방식 | 비유 |
|---|---|---|---|---|
| 프론트 | React PWA (web/) | **Vercel** | 깃 푸시 → 자동 빌드·배포 | 손님이 오는 매장 |
| WAS(서버) | Express (server/) | **Render** | 깃 푸시 → 자동 빌드·배포 | 24시간 주방 |
| DB/인증/파일 | 테이블 설계만 우리가 | **Supabase** | 임대. SQL Editor로 테이블 생성 | 경비원 딸린 창고 |
| 푸시 | 발송 코드만 우리가 | **Firebase(FCM)** | 콘솔에서 키 발급 | 우편 배달부 |

왜 셋으로 쪼개나: 각 서비스가 잘하는 것만 무료로 제공하기 때문.
한 곳에 다 올리면 유료지만, 조합하면 0원.

---

## 3. 각 서비스 이해하기

### Supabase — "다른 컴퓨터에 있는 내 PostgreSQL"
- 표준 PostgreSQL을 클라우드에서 임대 (자체 개발 DB 아님 → 배운 SQL 그대로 사용)
- MySQL과 문법 95% 동일 (백틱 대신 쌍따옴표, AUTO_INCREMENT 대신 IDENTITY 정도)
- 표준이라 종속(lock-in) 없음: 언제든 덤프 떠서 다른 PostgreSQL로 이사 가능
- DB에 얹어주는 보너스:
  - **Auth**: 회원가입/로그인 시스템 통째로 (구글/카카오 OAuth 포함)
  - **Storage**: 파일 저장소 (음성 녹음 mp3 등)
  - 테이블마다 자동 생성되는 API
- ★ 두 가지 사용 방식이 있음 — 혼동 주의:
  - 방식 A (BaaS): 서버 없이 프론트가 Supabase에 직접 붙음
    → 자유도 낮아 복잡한 로직에 불리 ("Supabase는 불리하다"는 말은 이 방식 얘기)
  - **방식 B (우리 방식)**: Supabase는 DB+Auth+Storage 창고로만 쓰고,
    서버 로직은 전부 내가 만든 Express가 담당 → 자유도 100%
    백엔드 취업 포트폴리오라면 방식 B가 정답 (백엔드를 직접 보여줘야 하므로)
- 무료 티어: DB 500MB, 프로젝트 2개, 1주일 무접속 시 일시정지
  (기기가 매일 이벤트를 보내므로 실사용 중엔 안 잠듦)

### Vercel — 정적 파일 호스팅
- React는 `npm run build` 하면 정적 파일(html/js/css)이 나옴
  → 이 파일들은 내용이 안 변하므로 "정적 배포"
- 동적인 동작(화면 렌더링, 라우팅)은 전부 **사용자 브라우저 안에서** JS가 수행 (SPA)
- 데이터는 브라우저가 Express 서버에 fetch로 요청
- 정적 파일 전달은 서버 계산이 없어 비용이 거의 0 → 무료 티어가 후한 이유

### Render — Node 서버 상시 실행
- Express는 요청마다 코드를 실행(DB 조회, 로직)해야 해서 CPU가 계속 필요
- 무료 티어 주의점: **15분 유휴 시 잠듦** → 첫 요청이 30초~1분 느림
  - 우리 서버는 30초 크론이 돌아 실질적으로 안 잠들 가능성 높음 (배포 후 확인)
  - 월 750시간 한도 확인 필요, 정 안 되면 시연 기간만 유료($7/월)
- 참고: Railway는 과거 무료로 유명했으나 현재는 1회성 $5 크레딧 + 이후 월 $1 수준
  → 몇 달 켜둘 프로젝트에는 부적합. 상시 무료 Node 호스팅은 사실상 Render

### Firebase (FCM) — 푸시 발송 인프라
- 서버(Express)가 firebase-admin으로 푸시를 쏠 때 사용
- PWA 쪽은 firebase JS로 토큰 발급 + service worker로 수신
- 콘솔에서 프로젝트 생성 + 키 발급만 하면 됨 (배포 아님)

---

## 4. 서비스를 잇는 것 = 주소와 키 (환경변수)

```
Vercel(web)의 환경변수:
  - Express 서버 URL (Render 주소)
  - Supabase URL + anon 키        ← 공개되어도 되는 키 (로그인용)

Render(server)의 환경변수:
  - Supabase URL + service_role 키 ← 절대 비밀! 깃 커밋 금지
  - Firebase(FCM) 관리자 키         ← 절대 비밀!
```

- anon 키: 브라우저에 노출돼도 되는 공개 키 (RLS가 지켜줌)
- service_role 키: 모든 권한을 가진 서버 전용 키 → .env로만 관리, 깃 금지
- 배포처의 환경변수 설정 화면에 서로의 주소/키를 넣는 게 "연결" 작업의 전부

---

## 5. Supabase 프로젝트 만들기 (한 번만)

1. supabase.com → GitHub 계정으로 가입
2. New Project:
   - Name: pillbox
   - Database Password: 생성 버튼 → **꼭 복사해 보관** (다시 못 봄)
   - Region: **Northeast Asia (Seoul)** (접속 속도)
3. 생성 후 Settings → API에서 3가지 확보:
   - Project URL / anon 키 / service_role 키
4. 테이블 생성: 마이그레이션 SQL을 대시보드의 SQL Editor에 붙여넣고 Run
   (MySQL 워크벤치에서 쿼리 실행하는 것과 같은 개념)
- 무료 프로젝트 2개 한도. 안 쓰는 프로젝트는 Resume 후
  Settings → General → Delete project로 삭제 가능

---

## 6. 배포 순서 (개발 완료 후, Phase 5)

1. 코드를 GitHub 저장소에 푸시 (server/, web/ 모노레포)
2. Render: New Web Service → 저장소 연결 → server/ 지정 → 환경변수 입력
3. Vercel: New Project → 저장소 연결 → web/ 지정 → 환경변수 입력
4. Google OAuth 리다이렉트 URL에 **배포 도메인 추가** (놓치기 쉬움!)
5. 갤럭시 Chrome에서 접속 → 홈 화면에 설치 → 전 과정 테스트

개발 중에는 배포 없이 전부 로컬(localhost)에서 진행.

---

## 7. PWA에 관하여

- PWA = 브라우저로 설치되는 웹앱. 홈 화면 아이콘, 전체화면, 푸시 수신(앱 꺼져도),
  오프라인 캐싱 지원 → 안드로이드에선 일반 앱과 체감 차이 거의 없음
- 임시방편이 아니라 진짜 앱으로 가는 정거장:
  - 나중에 **Capacitor**로 감싸면 같은 React 코드로 APK 생성 → 플레이스토어 등록 가능
  - TWA로 PWA를 그대로 스토어에 올리는 방법도 있음
  - 지금 하는 작업이 버려질 게 없음
- 주의: 아이폰(사파리)은 웹푸시 제약 있음. 시연은 갤럭시 기준이면 문제없음

---

## 8. 비용 요약

| 서비스 | 평상시 | 비고 |
|---|---|---|
| Vercel | 0원 | 개인 프로젝트 여유 |
| Render | 0원 | 슬립 이슈만 관리, 필요시 $7/월 |
| Supabase | 0원 | 500MB면 텍스트+음성 몇 개는 충분 |
| Firebase FCM | 0원 | 푸시는 무료 |
| **합계** | **0원/월** | 시연 기간 최대 $7 |
