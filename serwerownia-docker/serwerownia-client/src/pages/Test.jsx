import { useState } from 'react'
import { pingDb } from '../services/api.js'

export default function Test({ api }) {
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState(null)

  const run = async () => {
    setBusy(true)
    const t0 = performance.now()
    const res = await pingDb()
    const t1 = performance.now()
    setBusy(false)
    if (!res.ok) {
      api.addToast({ title: 'Ping failed', message: (res.error && res.error.code) || 'X102', variant: 'error' })
      return
    }
    const totalMs = Math.max(0, t1 - t0).toFixed(1)
    const dbMs = Number(res.data.dbMs).toFixed(1)
    setLast({ totalMs, dbMs, db_time: res.data.db_time })
    api.addToast({ title: 'DB response', message: `Total ${totalMs} ms • DB ${dbMs} ms`, variant: 'success' })
  }

  return (
    <section className="container">
      <h1 className="title">Connectivity Test</h1>
      <p className="muted">Run a real round-trip to the database and show measured timings.</p>
      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0' }}>
        <button className="btn primary" onClick={run} disabled={busy}>{busy ? 'Testing...' : 'Measure DB response time'}</button>
      </div>
      {last ? (
        <div className="device-card">
          <div className="device-title">Last result</div>
          <div className="kv"><div className="k">Total</div><div className="v">{last.totalMs} ms</div></div>
          <div className="kv"><div className="k">DB</div><div className="v">{last.dbMs} ms</div></div>
          <div className="kv"><div className="k">DB time</div><div className="v">{String(last.db_time)}</div></div>
        </div>
      ) : null}
    </section>
  )
}
