import express from 'express'
import {pool} from '../db.js'


const router = express.Router()

//7단계에서 인증을 붙이면 토큰에서 꺼낸다, 그때까지는 고정값
const DEV_USER_ID = '08eaec4c-cc47-4d5f-b1a0-2fdc7608cbf1';



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
    const userId = DEV_USER_ID
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
router.get('/:id/doses', async (req, res) => {
  try {
    const userId = DEV_USER_ID
    const deviceId = req.params.id//req.params.id는 url의 :id 값
    //req.query는 url의 ?뒤의 값
    const { from, to } = req.query//구조분해할당 const from = req.query.from, const to = req.query.to로 정의하는거랑 같음

    if (!from || !to) {
      return res.status(400).json({//400은 validation_error로 정의했었음
        error: { message: 'from 과 to 를 지정해 주세요' },
      })
    }

    // 1 내 기기인가? — 통과하면 Device 정보까지 get
    const device = await pool.query(
      `select d.id, d.serial, ud.nickname, ud.patient_phone, d.timezone
         from user_devices ud
         join devices d on d.id = ud.device_id
        where ud.user_id = $1 and d.id = $2`,
      [userId, deviceId]
    )

    if (device.rows.length === 0) {
      // 기기 자체가 없는지, 남의 것인지 가른다
      const exists = await pool.query(
        `select 1 from devices where id = $1`,//select 1은 해당 행이 있으면 1을 출력하고, 없으면 없다
        [deviceId]
      )
      return exists.rows.length > 0
        ? res.status(403).json({ error: { message: '접근 권한이 없습니다' } })
        : res.status(404).json({ error: { message: '기기를 찾을 수 없습니다' } })
    }

    const tz = device.rows[0].timezone

    // 2 그 기간의 복약 건 — 기기 타임존 기준 날짜로 자른다
    const doses = await pool.query(
      `select id, device_id, scheduled_at, status,
              notified_at, dispensed_at, taken_at, taken_source
         from doses
        where device_id = $1
          and (scheduled_at at time zone $2)::date between $3 and $4
        order by scheduled_at desc`,
      [deviceId, tz, from, to]
    )

    // 3 약 설정 — 약 미설정 구분용
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

    // 4 from 이전에 더 오래된 기록이 있는가 (화면 6의 '더보기')
    const older = await pool.query(
      `select exists (
         select 1 from doses
          where device_id = $1
            and (scheduled_at at time zone $2)::date < $3
       ) as has_more`,
      [deviceId, tz, from]
    )//위 sql문을 보면 select exits(...) as has_more이라 되어있는데 PostgreSQL은 from없어도 select가 된다

    res.json({
      devices: device.rows,
      doses: doses.rows,
      medications: medications.rows,
      has_more: older.rows[0].has_more,
    })
  } catch (err) {
    console.error('GET /api/devices/:id/doses 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
})

export default router