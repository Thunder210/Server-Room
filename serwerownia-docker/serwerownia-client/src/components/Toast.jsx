import { useEffect } from 'react'

export default function Toast({ title, message, variant = 'success', timeout = 3000, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, timeout)
    return () => clearTimeout(id)
  }, [timeout, onClose])
  return (
    <div className={`toast ${variant}`}>
      <div className="toast-title">{title}</div>
      {message ? <div className="toast-msg">{message}</div> : null}
    </div>
  )
}
