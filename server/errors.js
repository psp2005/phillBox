// spec.md §8.0 의 "상태 코드 배정" 표를 그대로 옮긴 것
const TYPE_OF = {
  VALIDATION_ERROR:   'validation_error',
  SERIAL_NOT_FOUND:   'validation_error',
  INVALID_CODE:       'validation_error',
  DOSE_NOT_DUE:       'validation_error',
  UNAUTHORIZED:       'auth_error',
  INVALID_DEVICE_KEY: 'auth_error',
  FORBIDDEN:          'permission_error',
  DEVICE_NOT_FOUND:   'state_error',
  NOT_FOUND:          'state_error',
  ALREADY_REGISTERED: 'state_error',
  ALREADY_TAKEN:      'state_error',
}

export function fail(res, status, code, message) {
  return res.status(status).json({
    error: { type: TYPE_OF[code] ?? 'state_error', code, message },
  })
}

//현재 user_devices.js에만 적용되어있는데, 나머지 devices.js, notifications.js에도 적용하자