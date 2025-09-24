export default function Faq() {
  return (
    <section className="container">
      <h1 className="title">FAQ</h1>
      <div className="devices-list">
        <div className="device-card">
          <div className="device-title">Error codes</div>
          <div className="kv"><div className="k">X101</div><div className="v">No DB acknowledgment after save</div></div>
          <div className="kv"><div className="k">X102</div><div className="v">DB write failed</div></div>
          <div className="kv"><div className="k">X103</div><div className="v">Network error</div></div>
          <div className="kv"><div className="k">X104</div><div className="v">Validation failed on server</div></div>
        </div>
        <div className="device-card">
          <div className="device-title">Save behavior</div>
          <p className="muted">Data is saved only after pressing Save. Cancel or closing the window discards changes.</p>
        </div>
      </div>
    </section>
  )
}
