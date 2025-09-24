import { Link } from 'react-router-dom'

export default function Home({ racks }) {
  return (
    <section className="container">
      <h1 className="title">Top-down Server Room</h1>
      <div className="grid">
        {racks.sort((a,b)=>a.position-b.position).map(r => (
          <Link key={r.id} to={`/rack/${r.id}`} className="rack-card">
            <div className="rack-name">{r.name}</div>
            <div className="rack-visual" />
          </Link>
        ))}
      </div>
    </section>
  )
}
