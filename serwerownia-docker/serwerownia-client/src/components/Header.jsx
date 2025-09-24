import ThemeToggle from './ThemeToggle.jsx'
import { Link, NavLink } from 'react-router-dom'

export default function Header({ theme, setTheme }) {
  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="brand">Server Room</Link>
        <nav className="nav">
          <NavLink to="/faq" className={({isActive})=>`nav-link ${isActive?'active':''}`}>FAQ</NavLink>
          <NavLink to="/logs" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Logs</NavLink>
          <NavLink to="/test" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Test</NavLink>
          
        </nav>
      </div>
      <div className="header-actions">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  )
}
