import { useEffect, useMemo, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import RackView from './pages/RackView.jsx'
import Toast from './components/Toast.jsx'
import Faq from './pages/Faq.jsx'
import Logs from './pages/Logs.jsx'
import Test from './pages/Test.jsx'
import { getRacks, openWs } from './services/api.js'

export default function App({ theme, setTheme }) {
  const [toasts, setToasts] = useState([])
  const [racks, setRacks] = useState([])
  const [devices, setDevices] = useState([])

  useEffect(() => {
    getRacks().then(res => { if (res.ok) setRacks(res.data) })
    const h = openWs(msg => {
      if (msg.type === 'device_saved') {
        setToasts(s => [...s, { id: crypto.randomUUID(), title: 'Realtime', message: `Saved ${msg.payload.label}`, variant: 'info' }])
      }
    })
    return () => { h.close() }
  }, [])

  const api = useMemo(() => ({
    addToast: t => setToasts(s => [...s, { id: crypto.randomUUID(), ...t }]),
    removeToast: id => setToasts(s => s.filter(x => x.id !== id)),
    addDevice: d => setDevices(s => {
      const i = s.findIndex(x => x.id === d.id)
      if (i >= 0) { const a = [...s]; a[i] = d; return a }
      return [...s, d]
    }),
    clearDevicesInRack: rackId => setDevices(s => s.filter(x => x.rack_id !== rackId)),
    setDevicesForRack: (rackId, list) => setDevices(s => {
      const other = s.filter(x => x.rack_id !== rackId)
      return [...other, ...list]
    }),
    removeDevice: id => setDevices(s => s.filter(x => x.id !== id))
  }), [])

  return (
    <div className="app">
      <Header theme={theme} setTheme={setTheme} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home racks={racks} />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/test" element={<Test api={api} />} />
          <Route path="/rack/:rackId" element={<RackView racks={racks} devices={devices} api={api} />} />
        </Routes>
      </main>
      <Footer />
      <div id="toast-root">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={() => api.removeToast(t.id)} />
        ))}
      </div>
    </div>
  )
}

const h = openWs(msg => {
  if (msg.type === 'device_saved') {
    setToasts(s => [...s, { id: crypto.randomUUID(), title: 'Realtime', message: `Saved ${msg.payload.label}`, variant: 'info' }])
  }
  if (msg.type === 'device_deleted') {
    setToasts(s => [...s, { id: crypto.randomUUID(), title: 'Realtime', message: `Deleted ${msg.payload.id}`, variant: 'warning' }])
    setDevices(s => s.filter(d => d.id !== msg.payload.id))
  }
})
