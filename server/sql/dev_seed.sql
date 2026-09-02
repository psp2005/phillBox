-- 개발용 테스트 데이터. 실제 서비스에서는 절대 실행하지 말 것.
-- 한 번만 실행한다. 다시 넣으려면 먼저 `delete from devices;` (나머지는 cascade 로 함께 지워짐)

-- 1) 기기 2대
insert into devices (serial, serial_normalized, registration_code, device_api_key)
values
  ('PB-2026-0001', 'PB20260001', 'A1B2C3', 'dk_test_0001'),
  ('PB-2026-0002', 'PB20260002', 'X9Y8Z7', 'dk_test_0002');

-- 2) 보호자 ↔ 기기 연결 (별명·전화번호도 여기)
-- 계정 A: academy1@example.com  = 08eaec4c-...
-- 계정 B: academy2@example.com  = 3b72f89d-...  (시연 때 공동 관리용)

insert into user_devices (user_id, device_id, nickname, patient_phone)
values
  ('08eaec4c-cc47-4d5f-b1a0-2fdc7608cbf1', (select id from devices where serial = 'PB-2026-0001'),
   '할아버지', '01012345678'),
  ('08eaec4c-cc47-4d5f-b1a0-2fdc7608cbf1', (select id from devices where serial = 'PB-2026-0002'),
   '외할매', null);

-- 3) 약 설정
insert into medications (device_id, name, dosage, dose_time, days)
values
  ((select id from devices where serial = 'PB-2026-0001'),
   '혈압약', '1정', '08:00', '{0,1,2,3,4,5,6}'),
  ((select id from devices where serial = 'PB-2026-0002'),
   '당뇨약', '1정', '09:30', '{1,3,5}');

-- 4) 복약 건 — 오늘 것 1개(복용완료) + 어제 것 1개(놓침)
insert into doses (device_id, scheduled_at, status,
                   notified_at, dispensed_at, taken_at, taken_source)
values
  ((select id from devices where serial = 'PB-2026-0001'),
   (current_date + time '08:00') at time zone 'Asia/Seoul', 'taken',
   (current_date + time '08:00') at time zone 'Asia/Seoul',
   (current_date + time '08:01') at time zone 'Asia/Seoul',
   (current_date + time '08:03') at time zone 'Asia/Seoul', 'camera'),

  ((select id from devices where serial = 'PB-2026-0001'),
   (current_date - 1 + time '08:00') at time zone 'Asia/Seoul', 'missed',
   (current_date - 1 + time '08:00') at time zone 'Asia/Seoul',
   null, null, null);

-- 5) 알림 — 놓친 건에 대해, 그 기기에 연결된 보호자 전원에게
insert into notifications (user_id, device_id, dose_id, type)
select ud.user_id, d.device_id, d.id, 'missed_not_dispensed'
from doses d
join user_devices ud on ud.device_id = d.device_id
where d.status = 'missed';
