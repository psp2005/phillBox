import express from 'express'
import { pool } from '../db.js'
import { fail } from '../errors.js'

/**
 * 복약기가 부르는 API (spec §8.3). 앱용 /api/devices 와 경로·응답 모양을 공유하지 않는다.
 * 여기까지 왔으면 requireDevice 를 통과했으므로 req.device = { id, timezone } 이 있다.
 */
const router = express.Router()

// GET /api/device/schedule — 약 시간표 받아가기
// 복약기는 부팅 시·주기적으로 이걸 받아 스스로 시각을 재고 5분 타이머를 돌린다 (spec §4)
router.get('/schedule', async (req, res) => {
  try {
    const medications = await pool.query(
      `select name, dosage,
              to_char(dose_time, 'HH24:MI') as time,
              days
         from medications
        where device_id = $1`,
      [req.device.id],
    )

    res.json({
      // 별명·일련번호·환자 전화번호는 기기에게 불필요한 노출이라 빼고 준다 (spec §8.3)
      devices: [{ id: req.device.id, timezone: req.device.timezone }],
      medications: medications.rows, // 약 설정이 없으면 [] → 기기는 아무 안내도 안 한다
    })
  } catch (err) {
    console.error('GET /api/device/schedule 실패:', err)
    return fail(res, 500, 'SERVER_ERROR', '서버 오류')
  }
})



// 상태 순위 — 이보다 높은 상태로만 바뀐다 
// (예를들어서 앱에서 수동으로 taken처리했는데 뒤늦게 복약기에서 missed를 보내는 경우 taken을 유지하도록)
const STATUS_ORDER = ['scheduled', 'notified', 'dispensed', 'missed', 'taken']
const REPORTABLE = ['notified', 'dispensed', 'taken', 'missed'] // 기기가 보고할 수 있는 것

// POST /api/device/events — 상태 보고 (spec §8.3)
router.post('/events', async (req, res) => {
  try {
    const deviceId = req.device.id // 본문이 아니라 키로 확인된 기기 — 남의 기기를 못 바꾼다
    const {
      scheduled_at: scheduledAt,
      status,
      occurred_at: occurredAt,
      taken_source: takenSource,
    } = req.body ?? {}

    // ── 입력 검사 ──
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
      return fail(res, 400, 'VALIDATION_ERROR', 'scheduled_at 을 확인해 주세요')
    }
    if (!REPORTABLE.includes(status)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'status 는 notified/dispensed/taken/missed 중 하나입니다')
    }
    if (!occurredAt || Number.isNaN(new Date(occurredAt).getTime())) {
      return fail(res, 400, 'VALIDATION_ERROR', 'occurred_at 을 확인해 주세요')
    }
    // 기기는 ir·camera 만. manual 은 보호자 경로(앱)로만 들어온다 — 경로가 곧 증거
    if (status === 'taken' && !['ir', 'camera'].includes(takenSource)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'taken 은 taken_source(ir 또는 camera)가 필요합니다')
    }

    // ── 복약 건 기록: 없으면 만들고, 있으면 "앞으로만" 고친다 ──
    const saved = await pool.query(
      `insert into doses (device_id, scheduled_at, status,
                          notified_at, dispensed_at, taken_at, taken_source)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (device_id, scheduled_at) do update set
         status = case
                    when array_position($8::text[], excluded.status)
                       > array_position($8::text[], doses.status)
                    then excluded.status
                    else doses.status
                  end,
         -- 시각은 처음 값을 지킨다 (같은 보고가 두 번 와도 밀리지 않게)
         notified_at  = coalesce(doses.notified_at,  excluded.notified_at),
         dispensed_at = coalesce(doses.dispensed_at, excluded.dispensed_at),
         taken_at     = coalesce(doses.taken_at,     excluded.taken_at),
         taken_source = coalesce(doses.taken_source, excluded.taken_source)
       returning id, device_id, scheduled_at, status,
                 notified_at, dispensed_at, taken_at, taken_source`,
      [
        deviceId,
        scheduledAt,
        status,
        status === 'notified' ? occurredAt : null,
        status === 'dispensed' ? occurredAt : null,
        status === 'taken' ? occurredAt : null,
        status === 'taken' ? takenSource : null,
        STATUS_ORDER,
      ],
    )
    const dose = saved.rows[0]

    // ── 놓침이면 연결된 보호자 전원에게 알림 (최종 상태도 missed 일 때만) ──
    if (status === 'missed' && dose.status === 'missed') {
      const type = dose.dispensed_at ? 'missed_not_taken' : 'missed_not_dispensed'
      await pool.query(
        `insert into notifications (user_id, device_id, dose_id, type)
         select ud.user_id, $1, $2, $3
           from user_devices ud
          where ud.device_id = $1
         on conflict (user_id, dose_id, type) do nothing`,
        [deviceId, dose.id, type],
      )
    }

    res.json({ doses: [dose] })
  } catch (err) {
    console.error('POST /api/device/events 실패:', err)
    return fail(res, 500, 'SERVER_ERROR', '서버 오류')
  }
})



export default router
