import express from 'express'
import { pool } from '../db.js'
import { fail } from '../errors.js'

const router = express.Router()

// 7단계에서 인증을 붙이면 토큰에서 꺼낸다. 그때까지는 고정값.
const DEV_USER_ID = '08eaec4c-cc47-4d5f-b1a0-2fdc7608cbf1'

// 대소문자·공백·하이픈을 무시하고 찾기 위한 정규화 (spec.md §8.2 2번)
function normalize(value) {
  return String(value ?? '').replace(/[\s-]/g, '').toUpperCase()
}

/**
 * @openapi
 * /api/user-devices:
 *   post:
 *     summary: 기기 등록 (화면 3)
 *     description: 기기가 아니라 "보호자 ↔ 기기 연결"을 만든다. devices 테이블은 읽기만 한다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serial:        { type: string, example: 'PB-2026-0099' }
 *               code:          { type: string, example: 'Z9Z9Z9' }
 *               nickname:      { type: string, example: '할아버지 기기' }
 *               patient_phone: { type: string, example: '010-1234-5678' }
 *     responses:
 *       201: { description: 연결 생성됨 }
 *       400: { description: 입력 오류 / 일련번호 없음 / 코드 불일치 }
 *       409: { description: 내가 이미 등록한 기기 }
 */
router.post('/', async (req, res) => {
  try {
    const userId = DEV_USER_ID
    const { serial, code, nickname, patient_phone: patientPhone } = req.body

    const serialKey = normalize(serial)
    const codeKey = normalize(code)

    if (!serialKey) {
      return fail(res, 400, 'VALIDATION_ERROR', '일련번호를 입력해 주세요')
    }
    if (!/^[A-Z0-9]{6}$/.test(codeKey)) {
      return fail(res, 400, 'VALIDATION_ERROR', '등록코드는 영문·숫자 6자리입니다')
    }

    // ① 일련번호로 기기 찾기 (정규화된 컬럼으로 조회)
    const found = await pool.query(
      `select id, serial, registration_code, timezone
         from devices
        where serial_normalized = $1`,
      [serialKey]
    )
    const device = found.rows[0]
    if (!device) {
      return fail(res, 400, 'SERIAL_NOT_FOUND', '해당 일련번호의 기기를 찾을 수 없습니다')
    }

    // ② 등록코드 확인
    if (normalize(device.registration_code) !== codeKey) {
      return fail(res, 400, 'INVALID_CODE', '등록코드가 일치하지 않습니다')
    }

    // ③ 연결 생성 — 내가 이미 등록했으면 아무 줄도 안 생긴다
    const saved = await pool.query(
      `insert into user_devices (user_id, device_id, nickname, patient_phone)
       values ($1, $2, $3, $4)
       on conflict (user_id, device_id) do nothing
       returning nickname, patient_phone`,
      [
        userId,
        device.id,
        nickname?.trim() || device.serial,
        patientPhone ? String(patientPhone).replace(/\D/g, '') : null,
      ]
    )

    if (saved.rows.length === 0) {
      return fail(res, 409, 'ALREADY_REGISTERED', '이미 등록된 기기입니다')
    }

    res.status(201).json({
      devices: [
        {
          id: device.id,
          serial: device.serial,
          nickname: saved.rows[0].nickname,
          patient_phone: saved.rows[0].patient_phone,
          timezone: device.timezone,
        },
      ],
    })
  } catch (err) {
    console.error('POST /api/user-devices 실패:', err)
    return fail(res, 500, 'SERVER_ERROR', '서버 오류')
  }
})

export default router
