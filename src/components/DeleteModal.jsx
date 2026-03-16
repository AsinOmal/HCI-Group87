import { AlertTriangle, Trash2 } from 'lucide-react'
import './Modal.css'

export default function DeleteModal({ name, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card modal-center">
        <div className="modal-icon-wrap warn">
          <AlertTriangle size={28} className="icon-warn" />
        </div>
        <h3 className="modal-title">Delete Design</h3>
        <div className="modal-body">
          <p>Are you sure you want to delete <strong>'{name}'</strong>?</p>
          <p className="modal-warn">This action cannot be undone.</p>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-cancel">Cancel</button>
          <button onClick={onConfirm} className="btn-danger"><Trash2 size={15} /> Yes, Delete</button>
        </div>
      </div>
    </div>
  )
}