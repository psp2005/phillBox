# API 명세 — 결정만 (짧은 버전)

> 이유·비교·검토 과정은 **`api-worksheet.md`** 에 있다.
> 최종 계약서는 **`spec.md` §8** — 워크시트를 다 채운 뒤 여기 내용으로 한 번에 동기화한다.
>
> 진행: **전부 완료 (2026-08-23).** 다음은 `spec.md` §8 동기화 → 4단계 DB 설계

---

## 0. 공통 규칙

| 항목 | 결정 |
|---|---|
| Base URL | `/api` |
| 앱 인증 | `Authorization: Bearer <Supabase access token>` |
| 디바이스 인증 | `X-Device-Key: <기기 API 키>` |
| 시각 | UTC 기준 ISO 8601 문자열 (`"2026-08-13T23:00:00Z"`) · KST 변환은 화면이 |
| id | DB 는 UUID / JSON 으로는 **문자열** |
| 전화번호 | 숫자만 저장 (`"01012345678"`) · 하이픈은 화면에서 |
| 응답 최상위 | **전부 객체로 감싼다** (하나만 돌려줄 때도) |
| 목록 표현 | **하나만 돌려줄 때도 배열에 담는다** — `{ "devices": [ {...} ] }` |
| "없음" 표현 | `null` 이 아니라 **빈 배열** — `{ "medications": [] }` |
| 404 vs 빈 배열 | 경로가 가리키는 자원 자체가 없으면 `404` / 그 자원의 부속물이 없으면 `200` + `[]` |
| 자원 vs 조건 | 자원은 경로, 거르는 조건은 쿼리스트링 |

### 오류 응답

```json
{ "error": { "type": "validation_error", "code": "INVALID_CODE",
             "message": "등록코드가 일치하지 않습니다" } }
```

| type | 프론트의 대응 |
|---|---|
| `auth_error` | 로그인 화면으로 |
| `permission_error` | 목록으로 되돌리고 안내 |
| `validation_error` | 그 화면에 머물며 입력 수정 |
| `state_error` | 이미 처리됐거나 사라짐 → 화면을 새로 불러옴 |

| HTTP | code | type | 언제 |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `validation_error` | 필수값 누락, 형식 오류 |
| 400 | `SERIAL_NOT_FOUND` | `validation_error` | 등록 폼 — 그런 일련번호가 없음 |
| 400 | `INVALID_CODE` | `validation_error` | 등록 폼 — 등록코드 불일치 |
| 400 | `DOSE_NOT_DUE` | `validation_error` | 아직 오지 않은 복약 건을 복용 처리 |
| 401 | `UNAUTHORIZED` | `auth_error` | 토큰 없음·만료 |
| 401 | `INVALID_DEVICE_KEY` | `auth_error` | 기기 API 키 틀림 |
| 403 | `FORBIDDEN` | `permission_error` | 내 기기/내 알림이 아님 |
| 404 | `DEVICE_NOT_FOUND` | `state_error` | 경로의 기기 id 없음 |
| 404 | `NOT_FOUND` | `state_error` | 경로의 복약 건·알림 id 없음 |
| 409 | `ALREADY_REGISTERED` | `state_error` | 이미 등록된 기기 |
| 409 | `ALREADY_TAKEN` | `state_error` | 이미 복용 처리된 복약 건 |

**422 는 쓰지 않는다.**

---

## 1. 공통 객체

### Device

```json
{
  "id": "d3f1a2b4-...",//DB가 자동생성, 이게 Dose의 device_id가 된다
  //같은 복약기를 여러명이 등록할때 각 사람별로 구분하기 위한 값
  "serial": "PB-2026-0001",//제조사가 미리 만든 제품일련번호
  //registration_code, 제조사가 미리 만든 등록코드 API에는 절대 넣지 않음, DB에만 존재
  "nickname": "할아버지 기기",
  "patient_phone": "01012345678",
  "timezone": "Asia/Seoul"
}
```

**어느 API 든 항상 이 5개.**
`registration_code`, `device_api_key` 는 **절대 내려주지 않는다.**
새 컬럼이 생겨도 자동 포함하지 않고 그때 판단한다.

### Dose

```json
{
  "id": "8821",//이 복약건의 번호(8월 13일 08시분)
  "device_id": "d3f1a2b4-...",//이 복약건이 어느 기기인지
  "scheduled_at": "2026-08-19T23:00:00Z",
  "status": "missed",
  "notified_at": "2026-08-19T23:00:00Z",
  "dispensed_at": null,
  "taken_at": null,
  "taken_source": null
}
```

**어느 API 든 항상 이 8개.** `status` 는 `scheduled`/`notified`/`dispensed`/`taken`/`missed`.
`taken_source` 는 `ir`/`camera`/`manual`/`null`.

### Medication

```json
{
  "id": "31",
  "device_id": "d3f1a2b4-...",
  "name": "혈압약",
  "dosage": "1정",
  "time": "08:00",
  "days": [0, 1, 2, 3, 4, 5, 6]
}
```

- **`time` 은 UTC 가 아니다** — 0번의 "모든 시각은 UTC ISO 8601" 규칙의 **유일한 예외**.
  "매일 08:00" 은 **순간이 아니라 벽시계 값**이라 UTC 로 못 바꾼다 (`spec.md` §3.4).
  기기 타임존과 짝지어 그날의 복약 건을 만들 때 UTC 로 계산한다
- `days` — `0`=일 ~ `6`=토. JS `Date.getDay()` 와 같은 번호
- 기기당 **1줄**이므로 배열에 0개 또는 1개뿐

### Notification

```json
{
  "id": "412",
  "device_id": "d3f1a2b4-...",
  "dose_id": "8821",
  "type": "missed_not_dispensed",
  "message": "약을 안 꺼내셨어요",
  "created_at": "2026-08-12T23:05:00Z",
  "read_at": null
}
```

- `type` — `missed_not_dispensed`(안 꺼냄) / `missed_not_taken`(꺼냈으나 미복용)
- **`message` 는 서버가 `type` 으로부터 만든다. DB 에 저장하지 않는다**
  - 저장 안 하는 이유 : 문구를 고치면 과거 알림까지 같이 바뀐다
  - 서버가 만드는 이유 : FCM 푸시(§10)도 같은 함수를 써야 **목록과 푸시 문구가 안 어긋난다**
- `read_at` — 안 읽었으면 `null`
- **기기 별명과 복약 건은 여기 안 담는다.** 화면 2 와 같은 패턴으로 `devices`·`doses` 배열을 따로 준다

---

## 2. 엔드포인트

### `GET /api/devices` — 기기 목록 (화면 2)

```
쿼리 : ?limit=20&offset=0     (둘 다 선택, 기본 limit=20 / offset=0)
정렬 : 별명 가나다순 고정 (쿼리로 못 바꿈)
```

```json
{
  "devices":     [ { "...Device..." } ],
  "today_doses": [ { "...Dose..." } ],
  "unread_count": 2,
  "has_more": false
}
```

- `today_doses` — 기기 타임존 기준 **오늘**의 복약 건. 화면이 `device_id` 로 짝을 맞춘다
- 오늘이 복용 요일이 아니거나 약 미설정이면 그 기기의 줄이 **없다**
- `unread_count` — 하단 탭 배지. 별도 API 없이 여기에 얹는다
- 빈 상태 : `200` + 두 배열 모두 `[]`, `unread_count: 0` (404 아님)
- 30초 폴링 / 당겨서 새로고침 → 같은 GET 재호출 (배지 + 카드가 함께 갱신됨)

### `POST /api/user-devices` — 기기 등록 (화면 3)

```json
// 요청
{ "serial": "PB-2026-0001", "code": "A1B2C3", "nickname": "할아버지 기기" }

// 성공 201
{ "devices": [ { "...Device..." } ] }
```

- 이 API 가 만드는 것은 **기기가 아니라 연결(`user_devices` 한 줄)**.
  `devices` 테이블은 손대지 않는다
- `nickname` 은 선택. 비면 **서버가 `serial` 을 별명으로 채운다** (가나다순 정렬에서 `null` 이 몰리는 것을 피함)
- `serial` / `code` 는 **서버가 대소문자·공백·하이픈을 무시하고 찾는다**.
  화면도 다듬지만 **서버 정리가 필수** (curl 로 직접 보낼 수 있으므로)
- 방금 등록한 기기는 약 설정도 복약 건도 없으므로 **dose 는 안 담는다**
- 등록 성공 → 화면 2 로 이동 후 **`GET /api/devices` 를 다시 호출**한다
  (가나다순 정렬 + 페이지네이션 때문에 프론트가 끼워 넣을 위치를 판단할 수 없음)

**실패 응답**

| HTTP | code | type | message (화면에 그대로 출력) |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `validation_error` | 일련번호를 입력해 주세요 |
| 400 | `VALIDATION_ERROR` | `validation_error` | 등록코드는 영문·숫자 6자리입니다 |
| 400 | `SERIAL_NOT_FOUND` | `validation_error` | 해당 일련번호의 기기를 찾을 수 없습니다 |
| 400 | `INVALID_CODE` | `validation_error` | 등록코드가 일치하지 않습니다 |
| 409 | `ALREADY_REGISTERED` | `state_error` | 이미 등록된 기기입니다 |

`401`(토큰 만료)은 모든 API 공통이라 0번 표에만 두고 여기 반복하지 않는다.

> 4단계 반영 — `devices` 에 `serial_normalized` 컬럼 추가.
> 컬럼에 함수를 씌우면(`UPPER(REPLACE(...))`) 인덱스를 못 쓴다.

### `GET /api/devices/:id/doses` — 복약 건 조회 (화면 4 **와** 화면 6 공용)

`:id` 는 **UUID**(`serial` 아님). `serial` 은 순차적이라 URL 에 쓰면 옆 번호를 찍어볼 수 있다.

```
?from=2026-08-17&to=2026-08-23     날짜 범위 하나로 통일 (프론트가 계산해서 보냄)

  화면 4      ?from=2026-08-17&to=2026-08-23    이번 주 월~일
  화면 6      ?from=2026-07-25&to=2026-08-23    최근 30일
  [더 보기]   ?from=2026-06-25&to=2026-07-24    그 이전 30일
```

```json
{
  "devices":     [ { "...Device..." } ],
  "doses":       [ { "...Dose..." } ],
  "medications": [ { "...Medication..." } ],
  "has_more": false
}
```

- **화면 4·6 이 같은 API 를 쓴다.** 같은 자원(복약 건)을 기간만 다르게 본다.
  라우터 하나로 두 화면이 해결된다
- **날짜 범위로 자르므로 `limit`·`before`·`offset` 이 필요 없다.**
  `7/25 ~ 8/23` 은 새 기록이 쌓여도 같은 구간이라 순번이 밀리는 문제가 없다
- `has_more` — `from` 이전에 더 오래된 기록이 있는지. 화면 6 의 [더 보기] 표시 판단용
- `devices` — 화면 4 가 별명·전화번호를 쓴다. 요청을 2번 하지 않기 위해 같이 담는다
- `doses` — **7개가 아닐 수 있다.** 복용 요일이 월·수·금이면 3개.
  화면이 자기가 보낸 `from`~`to` 로 날짜 7칸을 먼저 그리고 끼워 넣는다
- `medications` — **약 미설정 구분용**
  - `[]` → 약을 아직 설정 안 함 → 화면 4 는 "약 설정하기" 버튼
  - `[{...}]` → 설정은 있는데 이번 주에 복용 요일이 없음 → 그냥 빈 주
- 빈 상태 : 기기가 없으면 `404 DEVICE_NOT_FOUND` / 복약 건이 없으면 `200` + `"doses": []`

> **날짜를 프론트가 계산하는 것은 MVP 한정.** `spec.md` §3.4 가 "화면에는 KST 로 표시" 라고
> 못박아 이 앱은 한국 전용이므로 브라우저 시계와 서버 시계가 일치한다.
> 해외 보호자를 지원하게 되면 — **API 모양은 그대로 두고** `from`/`to` 가 없을 때
> 서버가 기기 타임존 기준 기본값을 채우도록 한 줄만 추가하면 된다.

### `GET /api/devices/:id/medications` — 약 설정 조회 (화면 5)

```json
{
  "devices":     [ { "...Device..." } ],
  "medications": [ { "...Medication..." } ]
}
```

- 약을 아직 설정 안 했으면 `200` + `"medications": []` (404 아님 — "없는 게 정상" 이다)
- `devices` 를 같이 담는 이유는 화면 4 와 같다. 화면 5 헤더가 기기 별명을 쓰는데,
  라우터를 붙이면 이 화면으로 바로 들어올 수 있다
- 기기가 없으면 `404 DEVICE_NOT_FOUND`

### `PUT /api/devices/:id/medications` — 약 설정 저장 (화면 5)

```json
// 요청
{ "name": "혈압약", "dosage": "1정", "time": "08:00", "days": [1, 3, 5] }

// 성공 200
{ "medications": [ { "...Medication..." } ] }
```

- **`POST` 가 아니라 `PUT` 인 이유 — 멱등하기 때문.**
  기기당 1줄이라 저장은 항상 **덮어쓰기**다. 저장 버튼을 두 번 눌러도 두 줄이 생기면 안 된다.
  PostgreSQL 의 `ON CONFLICT (device_id) DO UPDATE` 로 구현한다
- **저장 이후의 복약 건부터 적용된다.** 이미 만들어진 과거 건은 안 바뀐다 (`spec.md` §5 화면 5)
- 실패
  | HTTP | code | type | 언제 |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | `validation_error` | 약 이름·용량 빈칸, 시각 형식 오류, 요일 0개 |
  | 403 | `FORBIDDEN` | `permission_error` | 내 기기가 아님 |
  | 404 | `DEVICE_NOT_FOUND` | `state_error` | 그런 기기 없음 |

### `GET /api/notifications` — 알림 목록 (화면 7)

```
?limit=30      (선택, 기본 30)
```

```json
{
  "notifications": [ { "...Notification..." } ],
  "devices":       [ { "...Device..." } ],
  "doses":         [ { "...Dose..." } ],
  "unread_count": 2,
  "has_more": false
}
```

- `created_at` **내림차순**. 기기별로 묶지 않는다 (`spec.md` §11)
- **화면 2 와 똑같은 패턴** — 배열을 나눠 주고 화면이 `device_id` / `dose_id` 로 짝을 맞춘다
  - `devices` — 한 줄에 표시할 **기기 별명**
  - `doses` — 항목을 탭하면 열리는 **공용 팝업**이 쓴다. 요청 한 번을 아낀다
- `unread_count` — 하단 탭 배지. 화면 2 와 같은 방식으로 여기에 얹는다
- **날짜 범위(`from`/`to`)가 아니라 개수(`limit`)인 이유** — 알림은 드물게 쌓여서
  "최근 30일" 이 2건일 수도 있다. 목록 성격에 맞춘다 (전역 원칙 ③)
- 빈 상태 : `200` + 세 배열 모두 `[]`, `unread_count: 0`

### `POST /api/notifications/:id/read` — 읽음 처리 (화면 7)

```json
// 요청 본문 없음
// 성공 200
{ "notifications": [ { "...갱신된 Notification..." } ], "unread_count": 1 }
```

- **`unread_count` 를 같이 돌려주므로** 항목을 탭하는 즉시 하단 탭 배지가 정확한 숫자로 줄어든다.
  목록 전체를 다시 안 불러도 된다
- 이미 읽은 알림에 또 보내도 **`read_at` 은 처음 값 그대로 둔다** (덮어쓰지 않음)
- 실패 : `403 FORBIDDEN`(내 알림이 아님) / `404 NOT_FOUND`

### `POST /api/doses/:id/taken` — 수동 복용 처리 (공용 팝업)

```json
// 요청 본문 없음
// 성공 200
{ "doses": [ { "...갱신된 Dose..." } ] }
```

- 서버가 `status='taken'`, `taken_source='manual'`, `taken_at=현재시각` 으로 갱신
- **바뀐 복약 건을 돌려주므로** 그 한 건만 갈아끼우면 화면 4·6·7 이 갱신된다
- **미래 복약 건은 서버도 막는다.** 화면이 버튼을 감추지만 **화면을 못 믿는 게 서버의 기본자세**다
- 실패
  | HTTP | code | type | 언제 |
  |---|---|---|---|
  | 400 | `DOSE_NOT_DUE` | `validation_error` | 아직 오지 않은 복약 건 |
  | 403 | `FORBIDDEN` | `permission_error` | 그 복약 건의 기기가 내 것이 아님 |
  | 404 | `NOT_FOUND` | `state_error` | 그런 복약 건 없음 |
  | 409 | `ALREADY_TAKEN` | `state_error` | 이미 복용 처리됨 |

---

## 3. 디바이스용 (라즈베리파이)

인증은 `X-Device-Key` 헤더. **앱용 API 와 객체 모양을 공유하지 않는다** —
기기가 자기 별명이나 환자 전화번호를 알 필요가 없다.

### `GET /api/device/schedule` — 스케줄 받아가기

```json
{
  "devices":     [ { "id": "d3f1a2b4-...", "timezone": "Asia/Seoul" } ],
  "medications": [ { "name": "혈압약", "dosage": "1정",
                     "time": "08:00", "days": [1, 3, 5] } ]
}
```

- 약 설정이 없으면 `"medications": []` → 디바이스는 아무 안내도 하지 않는다
- 디바이스는 부팅 시와 주기적으로 이걸 받아 **스스로 시각을 재고 5분 타이머를 돌린다** (`spec.md` §4)
- **`Device` 객체를 통째로 주지 않는다.** 별명·전화번호·일련번호는 기기에게 불필요한 노출

### `POST /api/device/events` — 상태 보고 ★

```json
// 요청
{
  "scheduled_at": "2026-08-12T23:00:00Z",
  "status": "dispensed",
  "occurred_at": "2026-08-12T23:03:12Z",
  "taken_source": null
}

// 성공 200
{ "doses": [ { "...Dose..." } ] }
```

- **★ `scheduled_at` 으로 어느 복약 건인지 특정한다.**
  디바이스는 `dose_id` 를 모른다 — 그 번호는 서버가 만든 것이다.
  초안(`{ status, occurred_at, taken_source? }`)만으로는 서버가
  **doses 테이블의 어느 줄에 적을지 알 수 없었다.**
  5단계에서 발견했으면 디바이스 코드까지 같이 고쳐야 했다
- 해당 복약 건이 아직 없으면 **서버가 그때 만든다** (스케줄대로 미리 만들어두지 않아도 된다)
- **`occurred_at` 은 "실제로 일어난 시각" 이다. 서버는 "받은 시각" 을 쓰지 않는다** (`spec.md` §3.4)
  → 나중에 오프라인 큐(§10)를 붙여 밀린 기록을 한꺼번에 보내도 시각이 안 어긋난다
- `status` 가 `taken` 이면 `taken_source` 를 반드시 함께 보낸다 (`ir` 또는 `camera`)
- 실패 : `401 INVALID_DEVICE_KEY` / `400 VALIDATION_ERROR`

---

## 4. 접근 제어 — 모든 API 공통

> **요청한 보호자가 `user_devices` 에 그 기기와 연결돼 있는지 매번 확인한다.**
> 확인 없이 `device_id` 만 믿으면, 남의 id 를 넣어 보내는 것만으로 복약 기록이 노출된다.

`:id` 가 기기가 아닌 API 도 마찬가지다.

| API | 확인할 것 |
|---|---|
| `POST /api/doses/:id/taken` | 그 복약 건의 **기기**가 내 것인지 |
| `POST /api/notifications/:id/read` | 그 알림의 **`user_id`** 가 나인지 |

- 남의 것이면 **`403`** 을 준다.
  (`404` 를 주면 "그런 게 존재하는지" 조차 안 알려줘 더 안전하다는 견해도 있지만,
   디버깅이 쉬운 `403` 으로 통일한다)
- 디바이스도 같다 — **API 키에 묶인 기기의 데이터만** 읽고 쓸 수 있다

---

## 5. 전체 엔드포인트 목록

| 메서드 | 경로 | 화면 |
|---|---|---|
| GET | `/api/devices` | 2 |
| POST | `/api/user-devices` | 3 |
| GET | `/api/devices/:id/doses?from=&to=` | **4 · 6 공용** |
| GET | `/api/devices/:id/medications` | 5 |
| PUT | `/api/devices/:id/medications` | 5 |
| GET | `/api/notifications?limit=` | 7 |
| POST | `/api/notifications/:id/read` | 7 |
| POST | `/api/doses/:id/taken` | 공용 팝업 |
| GET | `/api/device/schedule` | 디바이스 |
| POST | `/api/device/events` | 디바이스 |

**앱용 8개 + 디바이스용 2개 = 10개.**
`spec.md` §8 초안은 11개였는데, 화면 4·6 을 합치고 `unread-count` 를 없애 줄었다.

## 화면 ↔ API 대응

| 화면 | 열릴 때 | 동작할 때 |
|---|---|---|
| 1 로그인 | (Supabase Auth 직접) | — |
| 2 기기 목록 | `GET /devices` | — |
| 3 기기 등록 | 없음 | `POST /user-devices` |
| 4 기기 상세 | `GET /devices/:id/doses?from=&to=` | — |
| 5 약 설정 | `GET /devices/:id/medications` | `PUT /devices/:id/medications` |
| 6 복약 기록 | `GET /devices/:id/doses?from=&to=` | 같은 API 로 [더 보기] |
| 7 알림 목록 | `GET /notifications` | `POST /notifications/:id/read` |
| 공용 팝업 | 없음 (부모 화면이 이미 들고 있는 dose 를 씀) | `POST /doses/:id/taken` |

**모든 화면이 열릴 때 요청 1번.** 화면 2 의 배지도 `GET /devices` 응답에 얹어 해결했다.
