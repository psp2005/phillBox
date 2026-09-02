import express from 'express'
import {pool} from '../db.js'


const router = express.Router()

//7단계에서 인증을 붙이면 토큰에서 꺼낸다, 그때까지는 고정값
const DEV_USER_ID = '08eaec4c-cc47-4d5f-b1a0-2fdc7608cbf1';


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

export default router