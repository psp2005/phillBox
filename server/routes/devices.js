import express from 'express'
import {pool} from '../db.js'


const router = express.Router()

//7단계에서 인증을 붙이면 토큰에서 꺼낸다, 그때까지는 고정값
// const DEV_USER_ID = '08eaec4c-cc47-4d5f-b1a0-2fdc7608cbf1';//두 개의 복약기와 연결된 계정
// const DEV_USER_ID = '3b72f89d-de4b-45f2-b2cf-eb0d19baa5ef'; //아무 기기랑 연결되지 않은 계정


// 이 기기가 내 것인지 확인한다 (spec.md §8.5)
// 통과하면 req.device 에 Device 정보를 담아 다음으로 넘긴다
async function requireMyDevice(req, res, next) {
  try {
    const deviceId = req.params.id//req.params.id는 url의 :id 값

    const mine = await pool.query(
      `select d.id, d.serial, ud.nickname, ud.patient_phone, d.timezone
         from user_devices ud
         join devices d on d.id = ud.device_id
        where ud.user_id = $1 and d.id = $2`,
      [req.userId, deviceId]
    )

    if (mine.rows.length === 0) {
      const exists = await pool.query(
        `select 1 from devices where id = $1`,
        [deviceId]
      )
      return exists.rows.length > 0
        ? res.status(403).json({ error: { message: '접근 권한이 없습니다' } })
        : res.status(404).json({ error: { message: '기기를 찾을 수 없습니다' } })
    }

    req.device = mine.rows[0]
    next()
  } catch (err) {
    console.error('기기 확인 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
}


/**
 * @openapi
 * /api/devices:
 *   get:
 *     summary: 기기 목록 + 오늘 상태 (화면 2)
 *     description: 별명 가나다순 고정. unread_count 는 하단 탭 배지용.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: 성공
 */
// GET /api/devices — 기기 목록 + 오늘 상태 (화면 2)
router.get('/', async (req, res) => {
  try {
    const userId = req.userId
    const limit = Number(req.query.limit) || 20
    const offset = Number(req.query.offset) || 0

    // ① 내 기기 목록 — 별명 가나다순, 이 페이지만
    const devices = await pool.query(
      `select d.id, d.serial, ud.nickname, ud.patient_phone, d.timezone
         from user_devices ud
         join devices d on d.id = ud.device_id
        where ud.user_id = $1
        order by ud.nickname
        limit $2 offset $3`,
      [userId, limit, offset]
    )

    const deviceIds = devices.rows.map((row) => row.id)

    // ② 그 기기들의 "오늘" 복약 건 — 기기 타임존 기준
    const todayDoses = deviceIds.length === 0
      ? { rows: [] }
      : await pool.query(
          `select dz.id, dz.device_id, dz.scheduled_at, dz.status,
                  dz.notified_at, dz.dispensed_at, dz.taken_at, dz.taken_source
             from doses dz
             join devices d on d.id = dz.device_id
            where dz.device_id = any($1)
              and (dz.scheduled_at at time zone d.timezone)::date
                = (now()           at time zone d.timezone)::date`,
          [deviceIds]
        )

    // ③ 안 읽은 알림 개수 — 페이지와 무관하게 전체
    const unread = await pool.query(
      `select count(*) as count from notifications
        where user_id = $1 and read_at is null`,
      [userId]
    )

    // ④ 더 있는지 판단할 총 개수
    const total = await pool.query(
      `select count(*) as count from user_devices where user_id = $1`,
      [userId]
    )

    res.json({
      devices: devices.rows,
      today_doses: todayDoses.rows,
      unread_count: Number(unread.rows[0].count),
      has_more: offset + limit < Number(total.rows[0].count),
    })
  } catch (err) {
    console.error('GET /api/devices 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
})




















/**
 * @openapi
 * /api/devices/{id}/doses:
 *   get:
 *     summary: 복약 건 조회 (화면 4·6 공용)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 기기 UUID
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, example: '2026-09-01' }
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, example: '2026-09-02' }
 *     responses:
 *       200: { description: 성공 }
 *       400: { description: from·to 누락 }
 *       403: { description: 내 기기가 아님 }
 *       404: { description: 기기 없음 }
 */

// GET /api/devices/:id/doses — 복약 건 조회 (화면 4·6 공용)
router.get('/:id/doses', requireMyDevice, async (req, res) => {
  try {
    const deviceId = req.device.id
    const tz = req.device.timezone
    const { from, to } = req.query
    //req.query는 url의 ?뒤의 값
    //구조분해할당 const from = req.query.from, const to = req.query.to로 정의하는거랑 같음

    if (!from || !to) {
      return res.status(400).json({//400은 validation_error로 정의했었음
        error: { message: 'from 과 to 를 지정해 주세요' },
      })
    }

    // 1. 그 기간의 복약 건 — 기기 타임존 기준 날짜로 자른다
    const doses = await pool.query(
      `select id, device_id, scheduled_at, status,
              notified_at, dispensed_at, taken_at, taken_source
         from doses
        where device_id = $1
          and (scheduled_at at time zone $2)::date between $3 and $4
        order by scheduled_at desc`,
      [deviceId, tz, from, to]
    )

    // 2. 약 설정 — 약 미설정 구분용
    const medications = await pool.query(
      `select id, device_id, name, dosage,
              to_char(dose_time, 'HH24:MI') as time,
              days
         from medications
        where device_id = $1`,
      [deviceId]
    )
    //to_char(값, 형식) : 값을 정해진 형식으로 치환
    //HH24 : 24시간제
    //MI : 분

    // 3. from 이전에 더 오래된 기록이 있는가 (화면 6의 '더보기')
    const older = await pool.query(
      `select exists (
         select 1 from doses
          where device_id = $1
            and (scheduled_at at time zone $2)::date < $3
       ) as has_more`,
      [deviceId, tz, from]
    )//위 sql문을 보면 select exits(...) as has_more이라 되어있는데 PostgreSQL은 from없어도 select가 된다

    res.json({
      devices: [req.device],
      doses: doses.rows,
      medications: medications.rows,
      has_more: older.rows[0].has_more,
    })
  } catch (err) {
    console.error('GET /api/devices/:id/doses 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
})




























/**
 * @openapi
 * /api/devices/{id}/medications:
 *   get:
 *     summary: 약 설정 조회 (화면 5)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 성공. 미설정이면 medications 가 빈 배열 }
 *       403: { description: 내 기기가 아님 }
 *       404: { description: 기기 없음 }
 */
router.get('/:id/medications', requireMyDevice, async (req, res) => {
  try {
    const medications = await pool.query(
      `select id, device_id, name, dosage,
              to_char(dose_time, 'HH24:MI') as time,
              days
         from medications
        where device_id = $1`,
      [req.device.id]
    )

    res.json({
      devices: [req.device],
      medications: medications.rows,
    })
  } catch (err) {
    console.error('GET /api/devices/:id/medications 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
})






















/**
 * @openapi
 * /api/devices/{id}/medications:
 *   put:
 *     summary: 약 설정 저장 (화면 5)
 *     description: 기기당 1줄이므로 항상 덮어쓰기. 두 번 눌러도 결과가 같다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:   { type: string, example: '혈압약' }
 *               dosage: { type: string, example: '1정' }
 *               time:   { type: string, example: '08:00' }
 *               days:   { type: array, items: { type: integer }, example: [1, 3, 5] }
 *     responses:
 *       200: { description: 저장됨 }
 *       400: { description: 입력값 오류 }
 *       403: { description: 내 기기가 아님 }
 *       404: { description: 기기 없음 }
 */
router.put('/:id/medications', requireMyDevice, async (req, res) => {
  try {
    const { name, dosage, time, days } = req.body

    // 입력값 검사 (spec.md §8.2 5번)
    if (!name?.trim()) {
      return res.status(400).json({ error: { message: '약 이름을 입력해 주세요' } })
    }
    if (!dosage?.trim()) {
      return res.status(400).json({ error: { message: '용량을 입력해 주세요' } })
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? '')) {
      //.test(값)은 해당 값이 "이 규칙에 맞나?"를 true/false로 돌려줌
      //??는 앞이 null/undefined이면 뒤를 써라라는 뜻
      //||은 앞이 빈문자열,0,false이면 뒤를 써라라는 뜻이라서 여기선 ??을 사용
      return res.status(400).json({ error: { message: '복용 시각을 확인해 주세요' } })
    }
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: { message: '복용 요일을 하나 이상 선택해 주세요' } })
    }
    if (!days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
      //배열.every(...) 는 해당 배열의 모든 값이 ...조건에 맞나 확인 - map/filter와 같은 배열 메서드
      return res.status(400).json({ error: { message: '복용 요일 값이 올바르지 않습니다' } })
    }

    //"insert ...on conflict ... do update"는 속칭upsert(update+insert : 없으면 넣고, 이미 있으면 고친다)기능이다
    // medications.device_id 에 unique 제약이 있어서(sql/001_init.sql) 그냥 insert 하면 두 번째 저장부터 에러가 난다
    const saved = await pool.query(
      `insert into medications (device_id, name, dosage, dose_time, days)
       values ($1, $2, $3, $4, $5)
       on conflict (device_id) do update set   -- device_id는 unique를 설정했으니 이미 저장된 기기면 conflict가 난다, 그때는 do update set (내용을 갱신)하라는 뜻
         name       = excluded.name,  -- excluded = 방금 넣으려다 막힌 새 값
         dosage     = excluded.dosage,
         dose_time  = excluded.dose_time,
         days       = excluded.days,
         updated_at = now() -- 이것만 새 값이 아니라 '지금 시각', excluded.updated_at으로 하면 안됨
       returning id, device_id, name, dosage,
                 to_char(dose_time, 'HH24:MI') as time,
                 days`,
      [req.device.id, name.trim(), dosage.trim(), time, days]
    )
    /*
    1.front화면에서 만약 저장(insert/update)만하는 PUT요청을 통해 테이블 속 값들을 추가/갱신하고나면
    front화면에도 요청이 적용된 값을 나타내기위해 다시 GET요청을 해야한다
    2.만약 front에서 2번 요청하는게 싫다면 PUT요청에 대한 응답에 결과를 담아보내면 된다
    응답에 결과를 담으려면 다시 select한 값을 위 saved변수에 집어넣어야 하는데(SQL문에서 insert·update는 rowCount(처리한 줄 수)만 주고 결과값을 안 돌려주므로)
    postgreSQL의 편리기능인 returning은 insert나 update한 결과를 바로 받는 기능으로
    따로 select할 필요없이 편하게 추가/갱신된 테이블값을 saved에 바로 넣어서 응답으로 보낼 수 있다
    */
    res.json({ medications: saved.rows })
  } catch (err) {
    console.error('PUT /api/devices/:id/medications 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
})





















/**
 * @openapi
 * /api/devices/{id}/doses/taken:
 *   post:
 *     summary: 수동 복용 처리 (공용 팝업)
 *     description: 복약 건이 없으면 그때 만든다. scheduled_at 은 "어느 건이냐"를 가리키는 값.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 기기 UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduled_at: { type: string, example: '2026-09-09T23:00:00Z' }
 *     responses:
 *       200: { description: 갱신된 복약 건 }
 *       400: { description: scheduled_at 오류 또는 아직 오지 않은 건 }
 *       403: { description: 내 기기가 아님 }
 *       404: { description: 기기 없음 }
 *       409: { description: 이미 복용 처리됨 }
 */
router.post('/:id/doses/taken', requireMyDevice, async (req, res) => {
  try {
    const deviceId = req.device.id
    const { scheduled_at: scheduledAt } = req.body
    //구조분해할당 - scheduled_at은 받는 이름, scheduleAt은 스크립트에서 사용할 이름
    //const {scheduled_at} = req.body로 해도 된다. 

    if (!scheduledAt) {
      return res.status(400).json({ error: { message: 'scheduled_at 을 지정해 주세요' } })
    }

    const when = new Date(scheduledAt)
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: { message: 'scheduled_at 형식이 올바르지 않습니다' } })
    }

    // 미래 복약 건은 서버도 막는다 (화면을 못 믿는 게 서버의 기본자세)
    if (when.getTime() > Date.now()) {
      return res.status(400).json({ error: { message: '아직 복용할 시간이 되지 않았습니다' } })
    }

    // 이미 복용 처리된 건인가
    const found = await pool.query(
      `select status from doses where device_id = $1 and scheduled_at = $2`,
      [deviceId, scheduledAt]
    )
    if (found.rows[0]?.status === 'taken') {
      return res.status(409).json({ error: { message: '이미 복용 처리된 복약 건입니다' } })
    }

    // 없으면 만들고, 있으면 고친다
    const saved = await pool.query(
      `insert into doses (device_id, scheduled_at, status, taken_at, taken_source)
       values ($1, $2, 'taken', now(), 'manual')
       on conflict (device_id, scheduled_at) do update set
         status       = 'taken',
         taken_at     = now(),
         taken_source = 'manual'
       returning id, device_id, scheduled_at, status,
                 notified_at, dispensed_at, taken_at, taken_source`,
      [deviceId, scheduledAt]
    )

    res.json({ doses: saved.rows })
  } catch (err) {
    console.error('POST /api/devices/:id/doses/taken 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
})

export default router