import { useState, useEffect, useRef } from 'react'
import { Save } from 'lucide-react'
import './Modal.css'

export default function SaveModal({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Save size={20} className="icon-save" /> Save Design
        </h3>
        <div className="modal-body">
          <label>Design Name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Living Room Redesign"
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) onSave(name.trim())
              if (e.key === 'Escape') onCancel()
            }}
          />
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-cancel">Cancel</button>
          <button
            onClick={() => onSave(name.trim())}
            className="btn-confirm"
            disabled={!name.trim()}
          >Save Design</button>
        </div>
      </div>
    </div>
  )
}