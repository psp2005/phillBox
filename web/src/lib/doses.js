import { api } from './api.js'

/**
 * 수동 복용 처리 (공용 팝업 — 화면 4·6·7)
 *
 * 복약 건 번호가 아니라 "기기 + 예정시각" 으로 지목한다 (spec §8.2 8번).
 * 해당 복약 건이 없으면 서버가 그때 만든다.
 *
 * @param {object} dose  팝업에 띄운 복약 건 (device_id·scheduled_at 을 쓴다)
 * @returns {Promise<object>} 갱신된 복약 건 한 개
 */
export async function markDoseTaken(dose) {
  const data = await api(`/api/devices/${dose.device_id}/doses/taken`, {
    method: 'POST',
    body: { scheduled_at: dose.scheduled_at },
  })
  return data.doses[0]
}
