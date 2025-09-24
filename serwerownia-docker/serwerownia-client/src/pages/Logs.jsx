import { useEffect, useState } from 'react'
import { getLogs } from '../services/api.js'

function fmtIp(v) { return v ? String(v) : '—' }
function fmtMs(v) { return typeof v === 'number' ? `${v.toFixed(1)} ms` : '—' }
function fmtTime(s) { return new Date(s).toLocaleString() }

export default function Logs() {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [offset, setOffset] = useState(0)
  const [done, setDone] = useState(false)

  const load = async (append=false) => {
    if (busy || done) return
    setBusy(true)
    const res = await getLogs(100, append ? offset : 0)
    setBusy(false)
    if (!res.ok) return
    const data = res.data
    if (append) {
      setItems(s => [...s, ...data])
      setOffset(o => o + data.length)
      if (data.length === 0) setDone(true)
    } else {
      setItems(data)
      setOffset(data.length)
      setDone(data.length === 0)
    }
  }

  useEffect(() => { load(false) }, [])

  return (
    <section className="container">
      <h1 className="title">Logs</h1>
      <div style={{maxHeight:'60vh', overflow:'auto', display:'grid', gap:12}}>
        {items.map(x => (
          <div key={x.id} className="device-card">
            <div className="row" style={{justifyContent:'space-between'}}>
              <div className="device-title">{x.event_type} {x.success ? 'OK' : 'FAIL'}</div>
              <div className="muted">{fmtTime(x.created_at)}</div>
            </div>
            <div className="row">
              <div className="kv"><div className="k">Device</div><div className="v">{x.device_id || '—'}</div></div>
              <div className="kv"><div className="k">Rack</div><div className="v">{x.rack_id || '—'}</div></div>
            </div>
            <div className="row">
              <div className="kv"><div className="k">Duration</div><div className="v">{fmtMs(x.duration_ms)}</div></div>
              <div className="kv"><div className="k">Client IP</div><div className="v">{fmtIp(x.client_ip)}</div></div>
            </div>
            {x.error_code || x.message ? (
              <div className="row">
                <div className="kv"><div className="k">Error</div><div className="v">{x.error_code || '—'} {x.message || ''}</div></div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div style={{marginTop:12}}>
        <button className="btn" onClick={()=>load(true)} disabled={busy || done}>{busy ? 'Loading...' : done ? 'No more' : 'Load more'}</button>
      </div>
    </section>
  )
}
