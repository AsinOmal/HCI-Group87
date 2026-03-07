import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDesign } from '../context/DesignContext'
import Navbar from '../components/Navbar'
import './RoomSetup.css'

const SHAPES = ['Rectangle', 'Square', 'L-Shape', 'Custom']

export default function RoomSetup() {
  const navigate = useNavigate()
  const { room, setRoom } = useDesign()
  const [form, setForm] = useState({ ...room })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.width || form.width < 1 || form.width > 20)
      errs.width = 'Must be between 1 – 20 metres'
    if (!form.length || form.length < 1 || form.length > 20)
      errs.length = 'Must be between 1 – 20 metres'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setRoom(form)
    navigate('/editor')
  }

  const update = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Lock dimensions when Square is selected
      if (next.shape === 'Square') {
        if (field === 'width') next.length = value
        if (field === 'length') next.width = value
      }
      return next
    })
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  // Also lock dimensions when switching TO Square
  const updateShape = (shape) => {
    setForm(prev => {
      const next = { ...prev, shape }
      if (shape === 'Square') next.length = prev.width
      return next
    })
  }

  const MAX_PX = 240
  const scale = Math.min(MAX_PX / Math.max(form.width, form.length), 40)
  const pW = form.width * scale
  const pH = form.length * scale
  // L-shape: top-right quadrant cut out (2/3 of each dimension)
  const lCut = { w: pW * 0.55, h: pH * 0.5 }

  return (
    <div className="rs-page">
      {/* ── Nav ── */}
      <Navbar />

      <main className="rs-main">
        <div className="rs-card">
          {/* Header */}
          <div className="rs-header">
            <h1 className="rs-title">Configure your room</h1>
            <p className="rs-sub">Set dimensions, shape, and finishes before you start designing.</p>
          </div>

          <form onSubmit={handleSubmit} className="rs-form">
            {/* Dimensions */}
            <div className="rs-section-label">
              {form.shape === 'Custom' ? 'Canvas Area (metres)' : 'Dimensions'}
            </div>
            <div className="rs-row">
              <div className="rs-field">
                <label>Width (metres)</label>
                <input
                  type="number"
                  className={errors.width ? 'rs-input rs-input--err' : 'rs-input'}
                  value={form.width}
                  onChange={e => update('width', parseFloat(e.target.value))}
                  min="1" max="20" step="0.5"
                />
                {errors.width && <span className="rs-error">{errors.width}</span>}
              </div>
              <div className="rs-field">
                <label>Length (metres)</label>
                <input
                  type="number"
                  className={errors.length ? 'rs-input rs-input--err' : 'rs-input'}
                  value={form.length}
                  onChange={e => update('length', parseFloat(e.target.value))}
                  min="1" max="20" step="0.5"
                />
                {errors.length && <span className="rs-error">{errors.length}</span>}
              </div>
            </div>

            {/* Shape */}
            <div className="rs-section-label" style={{ marginTop: 20 }}>Shape</div>
            <div className="rs-shape-row">
              {SHAPES.map(s => (
                <button
                  type="button" key={s}
                  className={`rs-shape-btn ${form.shape === s ? 'rs-shape-btn--active' : ''}`}
                  onClick={() => updateShape(s)}
                >
                  <span className="rs-shape-icon">
                    {s === 'Rectangle' ? '▬' : s === 'Square' ? '■' : s === 'L-Shape' ? '⌐' : '✎'}
                  </span>
                  <span>{s}</span>
                </button>
              ))}
            </div>

            {/* Colours */}
            <div className="rs-section-label" style={{ marginTop: 20 }}>Finishes</div>
            <div className="rs-row">
              <div className="rs-field">
                <label>Wall colour</label>
                <div className="rs-color">
                  <input type="color" value={form.wallColor}
                    onChange={e => update('wallColor', e.target.value)} />
                  <span>{form.wallColor}</span>
                </div>
              </div>
              <div className="rs-field">
                <label>Floor colour</label>
                <div className="rs-color">
                  <input type="color" value={form.floorColor}
                    onChange={e => update('floorColor', e.target.value)} />
                  <span>{form.floorColor}</span>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="rs-preview">
              <div className="rs-preview-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Live preview</span>
                <span style={{ color: 'var(--s-text-3)', fontWeight: 'normal', fontSize: 13 }}>{form.width}m × {form.length}m</span>
              </div>
              <div className="rs-preview-area">
                <svg
                  width={pW + 20} height={pH + 20}
                  viewBox={`0 0 ${pW + 20} ${pH + 20}`}
                  style={{ overflow: 'visible' }}
                >
                  {form.shape === 'L-Shape' ? (
                    <polygon
                      points={`
                        10,10
                        ${10 + pW},10
                        ${10 + pW},${10 + lCut.h}
                        ${10 + lCut.w},${10 + lCut.h}
                        ${10 + lCut.w},${10 + pH}
                        10,${10 + pH}
                      `}
                      fill={form.floorColor}
                      stroke={form.wallColor}
                      strokeWidth={8}
                      strokeLinejoin="round"
                    />
                  ) : form.shape === 'Custom' ? (
                    <g>
                      <rect
                        x={10} y={10}
                        width={pW} height={pH}
                        fill="none"
                        stroke="var(--s-border)"
                        strokeWidth={2}
                        strokeDasharray="4,4"
                      />
                      <text x={pW / 2 + 10} y={pH / 2 + 10} fontSize={14} fill="var(--s-text-3)" textAnchor="middle" alignmentBaseline="middle">
                        Draw your walls in Editor
                      </text>
                    </g>
                  ) : (
                    <rect
                      x={10} y={10}
                      width={pW} height={pH}
                      fill={form.floorColor}
                      stroke={form.wallColor}
                      strokeWidth={8}
                      rx={4}
                    />
                  )}
                </svg>
              </div>
            </div>

            <button type="submit" className="btn-primary rs-submit">
              Continue to Editor →
            </button>
          </form>
        </div>
      </main >
    </div >
  )
}