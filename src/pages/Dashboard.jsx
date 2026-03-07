import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, BookDashed, Pencil, Check, X } from 'lucide-react'
import { useDesign } from '../context/DesignContext'
import DeleteModal from '../components/DeleteModal'
import Navbar from '../components/Navbar'
import './Dashboard.css'

function DesignThumbnail({ design }) {
  const { room, furniture } = design
  const S = 3.5   // px per canvas-pixel (canvas uses 80px/m + 40px PAD)
  const CANVAS_PAD = 40
  const CANVAS_SCALE = 80
  const vw = (room.width * CANVAS_SCALE + CANVAS_PAD * 2) * S
  const vh = (room.length * CANVAS_SCALE + CANVAS_PAD * 2) * S

  // floor rect in canvas coords
  const fx = CANVAS_PAD * S
  const fy = CANVAS_PAD * S
  const fw = room.width * CANVAS_SCALE * S
  const fh = room.length * CANVAS_SCALE * S

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`}
      style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
      {/* Background = wall colour */}
      <rect x={0} y={0} width={vw} height={vh} fill={room.wallColor} />
      {/* Floor */}
      {room.shape === 'Custom' && room.customPolygon && room.customPolygon.length > 2 ? (
        <polygon
          points={room.customPolygon.map(p => `${p.x * S},${p.y * S}`).join(' ')}
          fill={room.floorColor}
        />
      ) : room.shape === 'L-Shape' ? (
        <polygon
          points={`
            ${fx},${fy} 
            ${fx + fw},${fy} 
            ${fx + fw},${fy + fh/2} 
            ${fx + fw/2},${fy + fh/2} 
            ${fx + fw/2},${fy + fh} 
            ${fx},${fy + fh}
          `}
          fill={room.floorColor}
        />
      ) : (
        <rect x={fx} y={fy} width={fw} height={fh} fill={room.floorColor} rx={2} />
      )}

      {/* Furniture — f.x/f.y are centres in canvas-px coordinates */}
      {furniture.map(f => {
        const iw = f.width * CANVAS_SCALE * f.scale * S
        const ih = f.height * CANVAS_SCALE * f.scale * S
        const cx = f.x * S
        const cy = f.y * S
        return (
          <rect key={f.id}
            x={cx - iw / 2} y={cy - ih / 2}
            width={iw} height={ih}
            fill={f.color} rx={1.5} opacity={0.9}
            transform={`rotate(${f.rotation},${cx},${cy})`}
          />
        )
      })}
    </svg>
  )
}

const SHAPE_ICON = { Rectangle: '▬', Square: '■', 'L-Shape': '⌐', 'Custom': '⬟' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { savedDesigns, loadDesign, deleteDesign, renameDesign, setRoom, setFurniture, setCurrentDesignId } = useDesign()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const inputRef = useRef(null)

  const handleNew = () => {
    setRoom({ width: 4, length: 3, shape: 'Rectangle', wallColor: '#F5F5DC', floorColor: '#D2B48C' })
    setFurniture([])
    setCurrentDesignId(null)
    navigate('/room-setup')
  }

  const handleEdit = (design) => {
    loadDesign(design)
    navigate('/editor')
  }

  const handleDeleteConfirm = () => {
    deleteDesign(deleteTarget._id)
    setDeleteTarget(null)
  }

  const startEdit = (design) => {
    setEditingId(design._id)
    setEditingName(design.name)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const commitEdit = async () => {
    const trimmed = editingName.trim()
    if (trimmed && editingId) {
      await renameDesign(editingId, trimmed)
    }
    cancelEdit()
  }

  const totalItems = savedDesigns.reduce((s, d) => s + d.furniture.length, 0)
  const largest = savedDesigns.length > 0
    ? savedDesigns.reduce((max, d) => (d.room.width * d.room.length > max.room.width * max.room.length ? d : max))
    : null

  return (
    <div className="db-root">
      <Navbar />

      {/* ── Main Content ── */}
      <main className="db-main">

        {/* ── Header ── */}
        <div className="db-header">
          <div>
            <h1 className="db-title">My Designs</h1>
            <p className="db-sub">
              {savedDesigns.length === 0
                ? 'Start your first room design'
                : `${savedDesigns.length} design${savedDesigns.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* ── Stats strip ── */}
        {savedDesigns.length > 0 && (
          <div className="db-stats">
            <div className="db-stat">
              <span className="db-stat-n">{savedDesigns.length}</span>
              <span className="db-stat-l">Designs</span>
            </div>
            <div className="db-stat-div" />
            <div className="db-stat">
              <span className="db-stat-n">{totalItems}</span>
              <span className="db-stat-l">Furniture Items</span>
            </div>
            <div className="db-stat-div" />
            <div className="db-stat">
              <span className="db-stat-n">
                {largest ? `${largest.room.width}×${largest.room.length}m` : '—'}
              </span>
              <span className="db-stat-l">Largest Room</span>
            </div>
          </div>
        )}

        {/* ── Grid / Empty ── */}
        {savedDesigns.length === 0 ? (
          <div className="db-empty">
            <div className="db-empty-icon">
              <BookDashed size={48} strokeWidth={1} color="var(--s-text-3)" />
            </div>
            <h2 className="db-empty-title">No designs yet</h2>
            <p className="db-empty-sub">
              Configure a room and start placing furniture — it takes less than a minute.
            </p>
            <button className="btn-primary" onClick={handleNew} style={{ marginTop: 8 }}>
              Start your first design
            </button>
          </div>
        ) : (
          <div className="db-grid">
            {savedDesigns.map(design => (
              <article key={design.id} className="db-card">
                <div className="db-thumb">
                  <DesignThumbnail design={design} />
                </div>
                <div className="db-card-body">
                  <div className="db-card-row">
                    {editingId === design._id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <input
                          ref={inputRef}
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          onBlur={commitEdit}
                          style={{
                            flex: 1, fontSize: 14, fontWeight: 600,
                            background: 'var(--s-surface-2)', border: '1.5px solid var(--s-accent)',
                            borderRadius: 6, padding: '3px 8px', color: 'var(--s-text)',
                            fontFamily: 'var(--f-sans)', outline: 'none'
                          }}
                        />
                        <button onClick={commitEdit} title="Save" style={{ background: 'none', border: 'none', color: 'var(--s-accent)', cursor: 'pointer', padding: 2 }}>
                          <Check size={15} />
                        </button>
                        <button onClick={cancelEdit} title="Cancel" style={{ background: 'none', border: 'none', color: 'var(--s-text-3)', cursor: 'pointer', padding: 2 }}>
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <h3 className="db-card-name">{design.name}</h3>
                        <button
                          onClick={() => startEdit(design)}
                          title="Rename design"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--s-text-3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 2
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                    <span className="db-card-shape">
                      {SHAPE_ICON[design.room.shape]} {design.room.shape}
                    </span>
                  </div>
                  <div className="db-card-meta">
                    <span>{design.room.width}m × {design.room.length}m</span>
                    <span className="db-dot">·</span>
                    <span>{design.furniture.length} item{design.furniture.length !== 1 ? 's' : ''}</span>
                    {design.createdAt && (
                      <>
                        <span className="db-dot">·</span>
                        <span>{new Date(design.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="db-card-actions">
                  <button className="db-act-btn db-act-edit" onClick={() => handleEdit(design)}>
                    Open Editor
                  </button>
                  <button className="db-act-btn db-act-del" onClick={() => setDeleteTarget(design)} title="Delete" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}