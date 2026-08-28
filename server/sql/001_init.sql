-- 복약기 DB 초기 생성

-- 1. devices — 복약기 (기기 자체의 성질만)
create table devices (
  id                 uuid        primary key default gen_random_uuid(),
  serial             text        not null unique,
  serial_normalized  text        not null unique,
  registration_code  text        not null,
  timezone           text        not null default 'Asia/Seoul',--utc에서 환자가 있는 나라의 시간으로 계산하기위한 참고값
  device_api_key     text        not null unique,
  created_at         timestamptz not null default now()
);

alter table devices enable row level security;


-- 2. user_devices — 보호자 ↔ 기기 연결
--    별명·전화번호는 보호자마다 다를 수 있어 여기에 둔다 (spec.md §7)
create table user_devices (
  user_id        uuid        not null references auth.users(id) on delete cascade,
  device_id      uuid        not null references devices(id)    on delete cascade,
  nickname       text        not null,
  patient_phone  text,
  created_at     timestamptz not null default now(),

  primary key (user_id, device_id)
);

-- "이 기기에 연결된 보호자 전원"을 찾기 위한 목차 (알림 생성에 쓴다)
create index user_devices_device_id_idx on user_devices (device_id);

alter table user_devices enable row level security;


-- 3. medications — 약 설정 (시간표). MVP는 기기당 1줄
--    ★ dose_time 은 UTC가 아니라 벽시계 값이다 (spec.md §8.1)
--      "매일 08:00"은 순간이 아니라 반복 규칙이라 UTC로 바꿀 수 없다
create table medications (
  id          bigint      generated always as identity primary key,
  device_id   uuid        not null unique references devices(id) on delete cascade,
  name        text        not null,
  dosage      text        not null,
  dose_time   time        not null,
  days        smallint[]  not null,
  created_at  timestamptz not null default now(), --
  updated_at  timestamptz not null default now() --db 디버그용
);

alter table medications enable row level security;



-- 4. doses — 복약 건 (출석부). 예정된 복약 한 건이 한 줄
--    ★ (device_id, scheduled_at) 이 유일해야 한다 — 디바이스는 id 를 모르고
--      "어느 기기의 몇 시 건"으로만 보고하기 때문 (spec.md §8.3)
create table doses (
  id            bigint      generated always as identity primary key,
  device_id     uuid        not null references devices(id) on delete cascade,
  scheduled_at  timestamptz not null,

  status        text        not null default 'scheduled'
                            check (status in ('scheduled','notified','dispensed','taken','missed')),

  -- 시각 4개를 다 남긴다. status 만으로는 missed 두 종류를 구분 못 한다 (spec.md §3.3)
  notified_at   timestamptz,
  dispensed_at  timestamptz,
  taken_at      timestamptz,
  taken_source  text        check (taken_source is null
                                   or taken_source in ('ir','camera','manual')),

  created_at    timestamptz not null default now(),

  unique (device_id, scheduled_at)
);

alter table doses enable row level security;


-- 5. notifications — 알림
--    ★ 보호자 1명당 1줄. read_at 이 사람마다 달라야 하므로 (spec.md §5 화면 7)
--    ★ message 컬럼은 만들지 않는다. 서버가 type 으로부터 만들어 내보낸다
--      (문구를 고치면 과거 알림까지 함께 바뀌어야 하므로 · spec.md §8.1)
create table notifications (
  id          bigint      generated always as identity primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  device_id   uuid        not null references devices(id)    on delete cascade,
  dose_id     bigint      not null references doses(id)      on delete cascade,

  type        text        not null
                          check (type in ('missed_not_dispensed', 'missed_not_taken')),

  created_at  timestamptz not null default now(),
  read_at     timestamptz,                    -- 안 읽었으면 null

  -- 오프라인 큐로 같은 보고가 재전송돼도 알림이 두 번 쌓이지 않게
  unique (user_id, dose_id, type)
);

-- 화면 7: "내 알림을 최신순(desc)으로 30개"
create index notifications_user_created_idx
  on notifications (user_id, created_at desc);

alter table notifications enable row level security;
