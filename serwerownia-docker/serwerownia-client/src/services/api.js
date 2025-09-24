const BASE = 'http://localhost:8080'

export async function getRacks() {
  const r = await fetch(`${BASE}/api/racks`)
  return r.json()
}

export async function getDevices(rackId) {
  const r = await fetch(`${BASE}/api/devices?rack_id=${encodeURIComponent(rackId)}`)
  return r.json()
}

export async function saveDevice(input) {
  const r = await fetch(`${BASE}/api/devices`, {
    method: 'POST',
    headers: { 'content-type':'application/json' },
    body: JSON.stringify(input)
  })
  return r.json()
}

export function openWs(onMessage) {
  let ws
  let retry = 0
  function connect() {
    ws = new WebSocket(`${BASE.replace('http','ws')}/ws`)
    ws.onmessage = e => { try { onMessage(JSON.parse(e.data)) } catch {} }
    ws.onopen = () => { retry = 0 }
    ws.onclose = () => {
      retry = Math.min(retry + 1, 6)
      setTimeout(connect, 500 * retry)
    }
    ws.onerror = () => { try { ws.close() } catch {} }
  }
  connect()
  return { close: () => { try { ws.close() } catch {} } }
}

export async function deleteDevice(id) {
  const r = await fetch(`${BASE}/api/devices/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return r.json()
}

export async function pingDb() {
  const r = await fetch('http://localhost:8080/api/ping')
  return r.json()
}

export async function getLogs(limit=100, offset=0) {
  const r = await fetch(`http://localhost:8080/api/logs?limit=${limit}&offset=${offset}`)
  return r.json()
}
