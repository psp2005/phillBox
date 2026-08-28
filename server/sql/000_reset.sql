-- ⚠️ 개발 중에만 쓴다. 모든 테이블과 데이터를 지운다.
-- 001_init.sql 을 처음부터 다시 실행하고 싶을 때만 사용.

drop table if exists notifications cascade;
drop table if exists doses         cascade;
drop table if exists medications   cascade;
drop table if exists user_devices  cascade;
drop table if exists devices       cascade;
