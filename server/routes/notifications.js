import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

// 7단계에서 인증을 붙이면 토큰에서 꺼낸다. 그때까지는 고정값.
const DEV_USER_ID = '08eaec4c-cc47-4d5f-b1a0-2fdc7608cbf1'

// 알림 message는 DB에 저장하지 않고 type 으로부터 만든다 (spec 8.1)
//나중에 FCM 푸시도 이 함수사용하면됨
function messageOf(type) {
  if (type === 'missed_not_dispensed') return '약을 안 꺼내셨어요'
  if (type === 'missed_not_taken') return '꺼내셨는데 안 드셨어요'
  return '알림'
}












/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: 알림 목록 (화면 7)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: 성공 }
 */
router.get('/', async (req, res) => {
  try {
    const userId = DEV_USER_ID
    const limit = Number(req.query.limit) || 30

    // ① 내 알림 — 최신순
    const rows = await pool.query(
      `select id, device_id, dose_id, type, created_at, read_at
         from notifications
        where user_id = $1
        order by created_at desc
        limit $2`,
      [userId, limit]
    )

    // 문구를 붙인다 (DB에 없는 값)
    const notifications = rows.rows.map((n) => ({
      ...n,//펼침 연산자
      message: messageOf(n.type),
    }))

    const deviceIds = [...new Set(notifications.map((n) => n.device_id))]//Set연산으로 중복 제거 후 다시 []으로 감싸 배여로하
    const doseIds = [...new Set(notifications.map((n) => n.dose_id))]//mvp단계에서는 하루에 하나의 복약 

    // ② 한 줄에 표시할 기기 별명
    const devices = deviceIds.length === 0
      ? { rows: [] }
      : await pool.query(
          `select d.id, d.serial, ud.nickname, ud.patient_phone, d.timezone
             from user_devices ud
             join devices d on d.id = ud.device_id
            where ud.user_id = $1 and d.id = any($2)`,
          [userId, deviceIds]
        )

    // ③ 항목을 탭하면 열리는 공용 팝업이 쓴다
    const doses = doseIds.length === 0
      ? { rows: [] }
      : await pool.query(
          `select id, device_id, scheduled_at, status,
                  notified_at, dispensed_at, taken_at, taken_source
             from doses
            where id = any($1::bigint[])`,
          [doseIds]
        )
        //::는 PostgreSQL의 캐스트 연산자예요. "왼쪽 값을 오른쪽 타입으로 해석해라"
        /*
        any() -- 이 두 쿼리는 결과가 동일

        select * from devices where id in (3, 7, 12);
        select * from devices where id = any(array[3, 7, 12]);
        */

    // ④ 배지 숫자
    const unread = await pool.query(
      `select count(*) as count from notifications
        where user_id = $1 and read_at is null`,
      [userId]
    )

    // ⑤ 더 오래된 알림이 있는가
    const total = await pool.query(
      `select count(*) as count from notifications where user_id = $1`,
      [userId]
    )

    res.json({
      notifications,
      devices: devices.rows,
      doses: doses.rows,
      unread_count: Number(unread.rows[0].count),
      has_more: limit < Number(total.rows[0].count),
    })
  } catch (err) {
    console.error('GET /api/notifications 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
})



















/**
 * @openapi
 * /api/notifications/{id}/read:
 *   post:
 *     summary: 알림 목록 클릭시 읽음 처리 (화면 7)
 *     description: 이미 읽은 알림에 또 보내도 read_at 은 처음 값 그대로 둔다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 갱신된 알림 + 줄어든 unread_count }
 *       403: { description: 내 알림이 아님 }
 *       404: { description: 알림 없음 }
 */
router.post('/:id/read', async (req, res) => {
  try {
    const userId = DEV_USER_ID
    const id = req.params.id

    if (!/^\d+$/.test(id)) {//id가 오직 숫자인지 검사하는 정규표현식
      return res.status(404).json({ error: { message: '알림을 찾을 수 없습니다' } })
    }

    // ① 아직 안 읽은 내 알림이면 지금 시각을 찍는다
    const updated = await pool.query(
      `update notifications
          set read_at = now()
        where id = $1 and user_id = $2 and read_at is null
        returning id, device_id, dose_id, type, created_at, read_at`,
      [id, userId]
    )

    let row = updated.rows[0]

    // ② 안 바뀌었다면 — 없는 알림인가 / 남의 것인가 / 이미 읽었나
    if (!row) {
      const found = await pool.query(
        `select id, user_id, device_id, dose_id, type, created_at, read_at
           from notifications where id = $1`,
        [id]
      )

      if (found.rows.length === 0) {
        return res.status(404).json({ error: { message: '알림을 찾을 수 없습니다' } })
      }
      if (found.rows[0].user_id !== userId) {
        return res.status(403).json({ error: { message: '접근 권한이 없습니다' } })
      }
      row = found.rows[0]   // 이미 읽은 알림 — 그대로 돌려준다
    }

    const unread = await pool.query(
      `select count(*) as count from notifications
        where user_id = $1 and read_at is null`,
      [userId]
    )

    res.json({
      notifications: [{ ...row, message: messageOf(row.type) }],
      unread_count: Number(unread.rows[0].count),
    })
  } catch (err) {
    console.error('POST /api/notifications/:id/read 실패:', err)
    res.status(500).json({ error: { message: '서버 오류' } })
  }
})

export default router
