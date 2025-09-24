import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Modal from '../components/Modal.jsx'
import { saveDevice, getDevices, deleteDevice } from '../services/api.js'
import { deviceInput } from '../lib/validation.js'


const kinds = ['SERVER','SWITCH','CUSTOM']

export default function RackView({ racks, devices, api }) {
  const { rackId } = useParams()
  const nav = useNavigate()
  const rack = racks.find(r => r.id === rackId)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('SERVER')
  const [label, setLabel] = useState('')
  const [customName, setCustomName] = useState('')
  const [ips, setIps] = useState([''])
  const [macs, setMacs] = useState([''])
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [delBusy, setDelBusy] = useState(false)

  const items = useMemo(() => devices.filter(d => d.rack_id === rackId), [devices, rackId])

  useEffect(() => {
    const r = racks.find(x => x.id === rackId)
    if (!r) return
    getDevices(rackId).then(res => {
      if (res.ok) {
        const list = res.data.map(d => ({
          ...d,
          ips: (d.ips || []).map(x => ({ id: crypto.randomUUID(), device_id: d.id, address: x.address })),
          macs: (d.macs || []).map(x => ({ id: crypto.randomUUID(), device_id: d.id, address: x.address }))
        }))
        api.setDevicesForRack(rackId, list)
      } else {
        api.addToast({ title: 'Load failed', message: 'X102', variant: 'error' })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rackId, racks])

  if (!rack) return <div className="container"><button className="btn" onClick={()=>nav('/')}>Back</button></div>

  const reset = () => {
    setKind('SERVER')
    setLabel('')
    setCustomName('')
    setIps([''])
    setMacs([''])
    setErrors({})
  }

  const validateLocal = () => {
    const payload = {
      rack_id: rackId,
      kind,
      label: kind==='CUSTOM' ? (customName || 'Custom') : (label || kind),
      ips: ips.map(x=>x.trim()).filter(Boolean).map(address => ({ address })),
      macs: macs.map(x=>x.trim()).filter(Boolean).map(address => ({ address }))
    }
    const parsed = deviceInput.safeParse(payload)
    if (!parsed.success) {
      const f = parsed.error.flatten()
      setErrors(f.fieldErrors || {})
      return { ok: false, payload }
    }
    setErrors({})
    return { ok: true, payload }
  }

  const onSave = async () => {
    const v = validateLocal()
    if (!v.ok) {
      api.addToast({ title: 'Validation failed', message: 'Check fields and try again', variant: 'error' })
      return
    }
    setBusy(true)
    const res = await saveDevice(v.payload)
    setBusy(false)
    if (!res.ok) {
      api.addToast({ title: 'Save failed', message: `${res.error.code}: ${res.error.message}`, variant: 'error' })
      return
    }
    const base = { id: res.data.id, rack_id: rackId, kind, label: v.payload.label }
    const cleanIps = v.payload.ips.map(x => ({ id: crypto.randomUUID(), device_id: base.id, address: x.address }))
    const cleanMacs = v.payload.macs.map(x => ({ id: crypto.randomUUID(), device_id: base.id, address: x.address }))
    api.addDevice({ ...base, ips: cleanIps, macs: cleanMacs })
    api.addToast({ title: 'Saved successfully', message: `Saved data for ${base.label}`, variant: 'success' })
    setOpen(false)
    reset()
  }

  const onClear = () => {
    reset()
    api.addToast({ title: 'Cleared', message: 'Form reset to defaults', variant: 'info' })
  }

  const onCancel = () => {
    setOpen(false)
    api.addToast({ title: 'Cancelled', message: 'Data not saved', variant: 'warning' })
    reset()
  }

  return (
    <section className="container">
      <div className="rack-head">
        <button className="btn" onClick={()=>nav('/')}>Back</button>
        <h2 className="subtitle">{rack.name}</h2>
        <button className="btn plus" onClick={()=>setOpen(true)}>+</button>
      </div>

      <div className="devices-list">
        {items.length === 0 ? <div className="muted">No devices</div> : items.map(d => (
          <div key={d.id} className="device-card">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="device-title">{d.label} • {d.kind}</div>
              <button className="icon-btn" title="Delete" onClick={()=>{ setToDelete(d); setConfirmOpen(true) }}>−</button>
            </div>
            <div className="row">
              <div className="kv">
                <div className="k">IP</div>
                <div className="v">{(d.ips||[]).map(i=>i.address).join(', ') || '—'}</div>
              </div>
              <div className="kv">
                <div className="k">MAC</div>
                <div className="v">{(d.macs||[]).map(m=>m.address).join(', ') || '—'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={confirmOpen} title="Confirm delete" onClose={()=>{ if (!delBusy) setConfirmOpen(false) }}>
        <div className="form">
          <div className="muted">Delete {toDelete ? toDelete.label : ''}?</div>
          <div className="actions">
            <button className="btn danger" type="button" disabled={delBusy} onClick={async ()=>{
              if (!toDelete) return
              setDelBusy(true)
              const res = await deleteDevice(toDelete.id)
              setDelBusy(false)
              if (res.ok) {
                api.removeDevice(toDelete.id)
                api.addToast({ title: 'Deleted', message: toDelete.label, variant: 'warning' })
                setConfirmOpen(false)
                setToDelete(null)
              } else {
                api.addToast({ title: 'Delete failed', message: (res.error && res.error.code) || 'X102', variant: 'error' })
              }
            }}>{delBusy ? 'Deleting...' : 'Yes, delete'}</button>
            <button className="btn" type="button" disabled={delBusy} onClick={()=>{ setConfirmOpen(false); setToDelete(null) }}>No</button>
          </div>
        </div>
      </Modal>

      <Modal open={open} title="Add Item" onClose={onCancel}>
        <div className="form">
          <label className="label">Type</label>
          <div className="seg">
            {kinds.map(k => (
              <button key={k} className={`seg-btn ${kind===k?'active':''}`} onClick={()=>setKind(k)} type="button">{k}</button>
            ))}
          </div>

          {kind !== 'CUSTOM' ? (
            <>
              <label className="label">Label</label>
              <input className={`input ${errors.label?'input-error':''}`} placeholder={kind} value={label} onChange={e=>setLabel(e.target.value)} />
            </>
          ) : (
            <>
              <label className="label">Name</label>
              <input className={`input ${errors.label?'input-error':''}`} placeholder="Custom name" value={customName} onChange={e=>setCustomName(e.target.value)} />
            </>
          )}

          <label className="label">IP Addresses</label>
          {ips.map((v,i)=>(
            <div key={i} className="row">
              <input className={`input ${errors['ips']?'input-error':''}`} placeholder="192.168.1.10" value={v} onChange={e=>{
                const a=[...ips]; a[i]=e.target.value; setIps(a)
              }} />
              <button className="icon-btn" type="button" onClick={()=>{
                const a=[...ips]; a.splice(i,1); setIps(a.length?a:[''])
              }}>−</button>
            </div>
          ))}
          <button className="btn ghost" type="button" onClick={()=>setIps(a=>[...a,''])}>+</button>

          <label className="label">MAC Addresses</label>
          {macs.map((v,i)=>(
            <div key={i} className="row">
              <input className={`input ${errors['macs']?'input-error':''}`} placeholder="08:00:2b:01:02:03" value={v} onChange={e=>{
                const a=[...macs]; a[i]=e.target.value; setMacs(a)
              }} />
              <button className="icon-btn" type="button" onClick={()=>{
                const a=[...macs]; a.splice(i,1); setMacs(a.length?a:[''])
              }}>−</button>
            </div>
          ))}
          <button className="btn ghost" type="button" onClick={()=>setMacs(a=>[...a,''])}>+</button>

          <div className="actions">
            <button className="btn primary" type="button" onClick={onSave} disabled={busy}>{busy?'Saving...':'Save'}</button>
            <button className="btn danger" type="button" onClick={onClear} disabled={busy}>Clear</button>
            <button className="btn" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
