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
