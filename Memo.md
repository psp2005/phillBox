web/
├─ index.html                     ← 제목 "복약기", lang="ko", 라이트 테마 고정
└─ src/
   ├─ main.jsx                    ← antd-mobile 전역 스타일 import 추가
   ├─ index.css                   ← 리셋 + PC에서도 폰 폭(480px) + .sr-only
   ├─ App.jsx                     ← 화면 전환 + 목업 주입의 유일한 장소 (spec §6.3 규칙 1·3)
   │                                 · 공용 팝업(detailDose)도 여기서 한 번만 그린다
   │
   ├─ lib/                        ← 화면이 아닌 "계산·변환" 코드. 여러 화면이 공유
   │  ├─ format.js                ← UTC → KST 변환 / 날짜·시각·요일 문자열 (spec §3.4)
   │  │                              · weekDateKeys() = 이번 주 월~일 날짜 7개 만들기
   │  │                              · isFuture()     = 아직 안 온 복약인지 (팝업 버튼 감추기)
   │  │                              · formatListDateTime() = 오늘이면 "08:05", 아니면 "8월 12일 08:05"
   │  └─ doseStatus.js            ← 복약 상태 → 색·아이콘·문구 (spec §6.4)
   │                                 · missed 를 ✕ "안 꺼냄" / ⚠ "꺼냈으나 미복용" 으로 구분
   │
   ├─ mocks/
   │  └─ data.js                  ← §8 API 응답 모양 그대로의 목업 (기기·주간·기록·약설정·알림)
   │
   ├─ components/                 ← 여러 화면이 재사용하는 조각
   │  ├─ icons.jsx                ← 탭·화살표 SVG 아이콘 (아이콘 패키지 설치 없이 직접 그림)
   │  ├─ StatusChip.jsx           ← 상태 아이콘+문구 한 덩어리 (화면 2·4·6 공용)
   │  ├─ StatusChip.module.css
   │  ├─ TabBarLayout.jsx         ← 하단 탭 껍데기 (기기 / 알림 2개 + 안읽음 배지)
   │  ├─ TabBarLayout.module.css     · 화면 2·7 에서만 사용. 3·4·5·6 은 탭 없이 파고듦
   │  ├─ DoseDetailDialog.jsx     ← 공용 팝업. 복약 상세 (화면 4·6·7 이 함께 씀)
   │  └─ DoseDetailDialog.module.css · 이미 복용 → 판정근거 표시 / 미래 → 체크버튼 감춤
   │                                 · 상태를 App.jsx 가 들고 있어 세 화면이 같은 팝업을 연다
   │
   └─ pages/                      ← 화면 1장 = 파일 1개. fetch·store 없이 props 만 받는다
      ├─ LoginPage.jsx            ← 화면 1 로그인/회원가입 (+ 소셜 로그인 자리)
      ├─ LoginPage.module.css
      ├─ DeviceListPage.jsx       ← 화면 2 기기 목록 (첫 화면)
      ├─ DeviceListPage.module.css   · 정상/비어있음/로딩/오류 4가지 상태 모두 구현
      ├─ DeviceRegisterPage.jsx   ← 화면 3 기기 등록 (일련번호 + 등록코드 + 별명)
      ├─ DeviceRegisterPage.module.css
      ├─ DeviceDetailPage.jsx     ← 화면 4 기기 상세 (주간 7칸 + 약설정/기록/전화 버튼)
      ├─ DeviceDetailPage.module.css · 7칸은 "복약 건 7개"가 아니라 "날짜 7칸 + 끼워넣기"
      ├─ MedicationPage.jsx       ← 화면 5 약 설정 (약이름·용량·복용시간·요일)
      ├─ MedicationPage.module.css
      ├─ DoseHistoryPage.jsx      ← 화면 6 복약 기록 (날짜 내림차순 + [더 보기])
      ├─ DoseHistoryPage.module.css
      ├─ NotificationListPage.jsx ← 화면 7 알림 목록 (시간순 + 안읽음 강조)
      └─ NotificationListPage.module.css · 탭하면 읽음 처리 + 공용 팝업이 함께 일어남


※ *.module.css = CSS Modules. 클래스 이름이 빌드할 때 고유하게 바뀌어
   다른 화면의 같은 이름과 절대 안 부딪힘. import styles from '...' 후 styles.클래스명 으로 사용.

※ 색은 직접 #eee 로 박지 말고 var(--adm-color-...) 를 쓴다.
   antd-mobile 이 :root 에 심어둔 값이라 버튼·NavBar 와 색이 저절로 맞는다.

※ App.jsx 맨 위 DEMO 스위치로 로딩/오류/비어있음 화면을 눈으로 확인할 수 있다.
   데이터 연결 단계에서 통째로 지운다.


-----------------------------------------------------------------------


묶음 |	내용                                                        | 상태
A	|  템플릿 청소 + 공용 기반(목업 데이터, 상태 색/아이콘, 시간 포맷) + 화면 1 로그인 | 완료
B	|  화면 2 기기목록 + 하단 탭                                    | 완료
C	|  화면 3 기기등록 + 화면 5 약설정                              | 완료
D	|  화면 4 기기상세 + 공용 팝업                                  | 완료
E	|  화면 6 복약기록 + 화면 7 알림목록                            | 완료

→ spec §9 의 2단계(화면 7장 퍼블리싱) 끝.
→ 3단계(API 응답 모양 고정) 끝 (2026-08-23)
   · 최종 결정은 api-decisions.md, 이유는 api-worksheet.md
   · 앱용 8개 + 디바이스용 2개 = API 10개
   · 화면 4·6 을 같은 API 로 합치고, unread-count 별도 API 를 없애 초안 11개에서 줄었다
   · spec.md §8 동기화 완료 (2026-08-23). §8 이 최종 계약서
→ 다음은 4단계 "DB 테이블 설계 + Supabase 에 생성" (직접 타이핑 구간)


docs/api-handoff.pdf   ← ★ 화면별 API 명세서 (13페이지, A4 가로)
docs/api-handoff.html     한 페이지에 [화면 목업 | 그 화면이 호출하는 API + 요청/응답]
                          전직장에서 백엔드팀이 프론트에 넘겨주던 그 형식.
                          HTML 을 고친 뒤 아래 명령으로 PDF 를 다시 만든다:

  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
    --no-pdf-header-footer --print-to-pdf="C:\Dev\pillbox\docs\api-handoff.pdf" \
    "file:///C:/Dev/pillbox/docs/api-handoff.html"

  ⚠ .page 에 height 고정 + overflow:hidden 이라 내용이 넘치면 조용히 잘린다.
    고친 뒤에는 각 페이지 끝이 온전한지 확인할 것 (PyMuPDF 로 텍스트 추출)

api-decisions.md  ← API 명세 "결정만" 짧은 버전 (프로젝트 루트)
   워크시트는 이유까지 있어 길다. 참고할 땐 이 파일을 볼 것.
   워크시트가 끝나면 이 내용으로 spec.md §8 을 한 번에 동기화한다.

api-worksheet.md  ← API 설계 연습용 학습지 (프로젝트 루트)
   빈칸을 먼저 채운 뒤 spec.md §8 과 대조하는 용도.
   채우기 전에 §8 을 열면 의미가 없어짐.
   · 0번(공통 규칙)은 대화로 함께 정해서 채워둠 — 결정 + 선택지 + 이유
   · 1~9번(화면별)은 비어 있음

withAi.md  ← AI 와 어떤 순서로 무엇을 요구해 여기까지 왔는지 기록 (프로젝트 루트)
   역할 분담 / 진행 순서 / 반복해서 쓴 요구 패턴 7가지 / 남은 단계


-----------------------------------------------------------------------


spec 초안과 달라진 것 (§6.5 "구현 직전 공식 문서로 검증" 에 따라)
※ spec.md §6.5 에도 같은 내용을 적어두었다.

· 화면 5 복용 시간: DatePicker → Picker (시/분 2칸)
  이유 = antd-mobile 의 DatePicker 는 연도부터 순서대로 칸이 생겨서
         "시각만" 고르게 만들 수 없다. Picker 로 시·분 2칸을 직접 만든다.
· 화면 5 요일 선택: Checkbox.Group → Selector (multiple)
  이유 = 체크박스 7개를 세로로 쌓는 것보다 요일 알약 7개가 한 줄에 들어가 더 잘 맞는다.
· 놓침 아이콘: ⚠ 하나 → ✕(안 꺼냄) / ⚠(꺼냈으나 미복용) 둘로 분리
  이유 = spec §5 화면 6 이 두 경우를 다른 아이콘으로 요구한다. §6.4 표보다 이쪽이 더 자세하다.


-----------------------------------------------------------------------


6단계(데이터 연결)에서 상태를 어디에 둘지 — 지금 정해둔 것

Zustand 기준은 "서버에서 왔냐"가 아니라 "여러 화면이 공유하냐" 다.

  상태                              | 어디로
  devices / week / doses / notifications | Zustand (서버 데이터)
  unreadCount                       | Zustand — notifications 에서 파생 계산
  로그인 세션·토큰                   | Zustand
  selectedDeviceId                  | 라우터 URL (/devices/:id)
                                       · 새로고침·링크 공유에도 같은 기기가 나와야 하므로
                                         상태가 아니라 주소가 맞는 자리
  detailDose (공용 팝업 열림)        | useState 유지 (화면 안에서만 사는 상태)
  폼에 입력 중인 글자                | useState 유지 (antd-mobile Form 이 이미 들고 있음)

※ 화면이 store 를 보는 방식 — (나) 로 결정 (2026-08-20)

    (가) App.jsx 가 store 에서 꺼내 props 로 내려준다   ← 지금 구조 그대로
    (나) 화면이 직접 store 를 본다                      ← ★ 이걸로 간다

      function DeviceListPage() {
        const devices = useDeviceStore(s => s.devices)
        ...
      }

  · 화면 파일은 바뀌지만 prop drilling 이 사라진다
  · 규칙 1 이 진짜로 지키는 것은 "props 를 쓰느냐" 가 아니라
    "응답 모양을 아는 코드가 한 곳에 모여 있느냐" 다.
    (나) 로 가도 fetch·모양변환은 store 한 곳에 모여 있으므로 규칙 1 은 지켜진다

※ 그때 한 줄 고칠 것 — detailDose 는 지금 복약 건 "사본"을 통째로 들고 있어서
  원본이 바뀌어도 팝업 내용이 안 따라온다. 아래처럼 id 만 들고 원본에서 찾아 쓰도록 바꾼다.

    const [detailDoseId, setDetailDoseId] = useState(null)
    const detailDose = doses.find(d => d.id === detailDoseId)

※ spec §6.3 규칙 1("화면 안에 fetch·store 없음")은 퍼블리싱 단계 한정 규칙이다.
  목적은 목업 → 실데이터 교체 때 화면 파일을 안 건드리는 것.
