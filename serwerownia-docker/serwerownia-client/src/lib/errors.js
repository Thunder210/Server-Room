export const ErrorCodes = {
  X101: { code: 'X101', message: 'No DB acknowledgment after save' },
  X102: { code: 'X102', message: 'DB write failed' },
  X103: { code: 'X103', message: 'Network error' },
  X104: { code: 'X104', message: 'Validation failed on server' }
}

export function err(code, details) {
  return { ok: false, error: { code, message: ErrorCodes[code]?.message || 'Unknown error', details } }
}

export function ok(data) {
  return { ok: true, data }
}
