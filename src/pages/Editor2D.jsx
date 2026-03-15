import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stage, Layer, Rect, Line, Text, Group, Transformer } from 'react-konva'
import { useDesign } from '../context/DesignContext'
import SaveModal from '../components/SaveModal'
import AuthModal from '../components/AuthModal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  ArrowLeft, Sun, Moon, Save, Box,
  Undo2, Redo2, Maximize, Grid3x3, Tags, Download,
  Trash2, Pointer, Package, Ruler, PenTool, Upload, Cuboid,
  Armchair, Columns, Monitor, Library, Bed
} from 'lucide-react'
import { fetchWithAuth } from '../utils/api'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Room as Room3D, FurniturePiece as FurniturePiece3D } from '../components/Scene3D'
import './Editor2D.css'

const SCALE = 80
const PAD = 40
const GRID_PX = SCALE / 4   // 20px = 0.25m snap resolution

const LIBRARY = [
  { type: 'Chair', width: 0.6, height: 0.6, defaultColor: '#8B7355', icon: 'Armchair' },
  { type: 'Dining Table', width: 1.6, height: 0.9, defaultColor: '#6B4C2A', icon: 'Square' },
  { type: 'Sofa', width: 2.0, height: 0.9, defaultColor: '#708090', icon: 'Lamp' }, // Using Lamp or similar as proxy or I can use Armchair/Box
  { type: 'Bed', width: 2.0, height: 1.6, defaultColor: '#DEB887', icon: 'Bed' },
  { type: 'Side Table', width: 0.5, height: 0.5, defaultColor: '#A0785A', icon: 'Box' },
  { type: 'Wardrobe', width: 1.8, height: 0.6, defaultColor: '#5C4033', icon: 'Columns' },
  { type: 'Desk', width: 1.2, height: 0.6, defaultColor: '#8B8B6B', icon: 'Monitor' },
  { type: 'Bookshelf', width: 1.0, height: 0.3, defaultColor: '#7B6B3A', icon: 'Library' },
]

// ── L-Shape helper ───────────────────────────────────────────
function getLShapeRects(room) {
  const fullW = room.width * SCALE
  const fullH = room.length * SCALE
  const mainH = Math.round(fullH * 0.6)
  const wingH = fullH - mainH
  const wingW = Math.round(fullW * 0.5)
  return [
    { x: PAD, y: PAD, w: fullW, h: mainH },
    { x: PAD, y: PAD + mainH, w: wingW, h: wingH },
  ]
}

// ── Boundary clamp — x,y are the CENTER of the item ─────────
function clampToRoom(cx, cy, item, room) {
  const iw = item.width * SCALE * item.scale
  const ih = item.height * SCALE * item.scale
  const rad = (item.rotation || 0) * Math.PI / 180

  // Half-extents of the rotated bounding box
  const hw = (Math.abs(Math.cos(rad)) * iw + Math.abs(Math.sin(rad)) * ih) / 2
  const hh = (Math.abs(Math.sin(rad)) * iw + Math.abs(Math.cos(rad)) * ih) / 2

  if (room.shape === 'L-Shape') {
    const [main, wing] = getLShapeRects(room)
    const floorMinX = main.x, floorMaxX = main.x + main.w
    const floorMinY = main.y, floorMaxY = main.y + main.h
    // Check if the item's center is in the wing zone
    const inWing = cy + hh > main.y + main.h
    const r = inWing ? wing : main
    return {
      x: Math.max(r.x + hw, Math.min(cx, r.x + r.w - hw)),
      y: Math.max(r.y + hh, Math.min(cy, r.y + r.h - hh)),
    }
    void floorMinX; void floorMaxX; void floorMinY; void floorMaxY
  }

  const floorLeft = PAD
  const floorTop = PAD
  const floorRight = PAD + room.width * SCALE
  const floorBottom = PAD + room.length * SCALE

  return {
    x: Math.max(floorLeft + hw, Math.min(cx, floorRight - hw)),
    y: Math.max(floorTop + hh, Math.min(cy, floorBottom - hh)),
  }
}

// ── Snap helper ──────────────────────────────────────────────
function snapGrid(val) {
  return Math.round(val / GRID_PX) * GRID_PX
}

// ── Selected Item Dimension Lines ─────────────────────────────
function SelectedDimensionLines({ item, room }) {
  if (!item) return null

  const cx = item.x
  const cy = item.y
  const iw = item.width * SCALE * item.scale
  const ih = item.height * SCALE * item.scale
  const rad = (item.rotation || 0) * Math.PI / 180

  // Rotated bounding box half-extents
  const hw = (Math.abs(Math.cos(rad)) * iw + Math.abs(Math.sin(rad)) * ih) / 2
  const hh = (Math.abs(Math.sin(rad)) * iw + Math.abs(Math.cos(rad)) * ih) / 2

  let boundLeft = PAD
  let boundRight = PAD + room.width * SCALE
  let boundTop = PAD
  let boundBottom = PAD + room.length * SCALE

  if (room.shape === 'L-Shape') {
    const [main, wing] = getLShapeRects(room)
    if (cy > main.y + main.h) {
      boundRight = wing.x + wing.w
    } else {
      boundRight = main.x + main.w
    }
    if (cx > PAD + wing.w) {
      boundBottom = main.y + main.h
    } else {
      boundBottom = wing.y + wing.h
    }
  }

  const lines = []
  const COLOR = '#ef4444' // red

  const makeLine = (id, x1, y1, x2, y2, valPixels) => {
    const distM = (valPixels / SCALE).toFixed(2)
    // Only show if >= 0.10m to avoid overlap
    if (Number(distM) < 0.10) return null

    // Label goes in the middle
    let textX = (x1 + x2) / 2
    let textY = (y1 + y2) / 2

    return (
      <Group key={id} listening={false}>
        <Line points={[x1, y1, x2, y2]} stroke={COLOR} strokeWidth={1} dash={[4, 4]} />
        <Rect
          x={textX - 16} y={textY - 8} width={32} height={16}
          fill="white" cornerRadius={2} opacity={0.9}
        />
        <Text
          x={textX - 16} y={textY - 6} width={32} align="center"
          text={`${distM}m`} fontSize={10} fill={COLOR} fontStyle="bold"
        />
      </Group>
    )
  }

  const leftDist = (cx - hw) - boundLeft
  const rightDist = boundRight - (cx + hw)
  const topDist = (cy - hh) - boundTop
  const bottomDist = boundBottom - (cy + hh)

  if (leftDist > 0) lines.push(makeLine('dl', boundLeft, cy, cx - hw, cy, leftDist))
  if (rightDist > 0) lines.push(makeLine('dr', cx + hw, cy, boundRight, cy, rightDist))
  if (topDist > 0) lines.push(makeLine('dt', cx, boundTop, cx, cy - hh, topDist))
  if (bottomDist > 0) lines.push(makeLine('db', cx, cy + hh, cx, boundBottom, bottomDist))

  return <>{lines}</>
}

// ── Measurement line nodes ────────────────────────────────────
function MeasurementLines({ room }) {
  const lines = []
  const tickLen = 6

  // Dynamic ruler color — visible on both light and dark
  const rulerColor = 'rgba(150,150,150,0.8)'

  // Horizontal ticks along top edge
  for (let m = 0; m <= room.width; m++) {
    const x = PAD + m * SCALE
    lines.push(
      <Line key={`ht-${m}`} points={[x, PAD - 8, x, PAD - 8 - tickLen]}
        stroke={rulerColor} strokeWidth={1} />,
      <Text key={`hl-${m}`} x={x - 8} y={PAD - 24} text={`${m}m`}
        fontSize={10} fill={rulerColor} />
    )
  }
  // Horizontal ruler line
  lines.push(
    <Line key="h-ruler" points={[PAD, PAD - 11, PAD + room.width * SCALE, PAD - 11]}
      stroke={rulerColor} strokeWidth={1} />
  )

  // Vertical ticks along left edge
  for (let m = 0; m <= room.length; m++) {
    const y = PAD + m * SCALE
    lines.push(
      <Line key={`vt-${m}`} points={[PAD - 8, y, PAD - 8 - tickLen, y]}
        stroke={rulerColor} strokeWidth={1} />,
      <Text key={`vl-${m}`} x={4} y={y - 5} text={`${m}`}
        fontSize={10} fill={rulerColor} />
    )
  }
  // Vertical ruler line
  lines.push(
    <Line key="v-ruler" points={[PAD - 11, PAD, PAD - 11, PAD + room.length * SCALE]}
      stroke={rulerColor} strokeWidth={1} />
  )

  return <>{lines}</>
}

// ─────────────────────────────────────────────────────────────
// ── Local Modals ─────────────────────────────────────────────
function CustomNameModal({ defaultName, onSubmit, onCancel }) {
  const [name, setName] = useState(defaultName || '')
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3 className="modal-title">Name Your Custom Model</h3>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--s-text-2)', marginBottom: 12 }}>Give this furniture piece a label so you can identify it.</p>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Eames Lounge Chair"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit(name.trim() || defaultName)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm" onClick={() => onSubmit(name.trim() || defaultName)}>Add to Room</button>
        </div>
      </div>
    </div>
  )
}

function LeaveConfirmModal({ onConfirm, onCancel, onSaveAndLeave, isGuest }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-card">
        <h3 className="modal-title">Unsaved Changes</h3>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--s-text-2)', marginBottom: 0 }}>
            You may have unsaved changes. How would you like to proceed?
          </p>
        </div>
        <div className="modal-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
          <button className="btn-cancel" onClick={onCancel}>Stay Here</button>
          {!isGuest ? (
            <button className="btn-primary" onClick={onSaveAndLeave}>Save & Leave</button>
          ) : (
            <button className="btn-primary" onClick={onSaveAndLeave}>Save</button>
          )}
          <button className="btn-danger" style={{ gridColumn: '1 / -1' }} onClick={onConfirm}>Leave Without Saving</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
export default function Editor2D() {
  const navigate = useNavigate()
  const {
    room, furniture,
    selectedId, setSelectedId,
    addFurniture, updateFurniture, deleteFurniture,
    commitFurnitureHistory,
    setRoom, saveDesign,
    currentDesignId, currentDesignName,
    undo, redo, canUndo, canRedo,
    showLive3D, setShowLive3D,
    viewportSettings, setViewportSettings
  } = useDesign()

  const [isDrawingWall, setIsDrawingWall] = useState(room.shape === 'Custom' && (!room.customPolygon || room.customPolygon.length === 0))
  const [draftPolygon, setDraftPolygon] = useState([])
  const [currMouse, setCurrMouse] = useState(null)

  const stageRef = useRef()
  const trRef = useRef()
  const containerRef = useRef()
  const [showSave, setShowSave] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const isGuest = localStorage.getItem('isGuest') === 'true'
  const [snapOn, setSnapOn] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [stageScale, setStageScale] = useState(1.4)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [isUploading, setIsUploading] = useState(false)
  const [pendingUploadData, setPendingUploadData] = useState(null)
  const [showCustomNameModal, setShowCustomNameModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const fileInputRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 })
  const ZOOM_MIN = 0.4, ZOOM_MAX = 3, ZOOM_STEP = 1.12

  const canvasWidth = room.width * SCALE + PAD * 2
  const canvasHeight = room.length * SCALE + PAD * 2

  // Auto-fit to screen on load
  useEffect(() => {
    if (!containerRef.current) return
    const fitScreen = () => {
      const parentW = containerRef.current.offsetWidth
      const parentH = containerRef.current.offsetHeight
      // Leave 56px padding on all sides around the floor plan
      const availW = parentW - 112
      const availH = parentH - 112

      const scaleX = availW / canvasWidth
      const scaleY = availH / canvasHeight
      // Fit to the most constrained dimension
      const bestScale = Math.min(scaleX, scaleY, ZOOM_MAX)

      setStageScale(bestScale)
      // Center it
      setStagePos({
        x: (availW - canvasWidth * bestScale) / 2 + 56,
        y: (availH - canvasHeight * bestScale) / 2 + 56
      })

      setContainerSize({ w: parentW, h: parentH })
    }
    fitScreen()
    window.addEventListener('resize', fitScreen)
    return () => window.removeEventListener('resize', fitScreen)
  }, [canvasWidth, canvasHeight])

  const toggleDark = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('spacio-dark', next ? '1' : '0')
    setDark(next)
  }

  const isLShape = room.shape === 'L-Shape'
  const lRects = isLShape ? getLShapeRects(room) : []
  const selected = furniture.find(f => f.id === selectedId)

  // ── Transformer sync ─────────────────────────────────────────
  useEffect(() => {
    if (!trRef.current) return
    const stage = trRef.current.getStage()
    const node = stage?.findOne('#item-' + selectedId)
    trRef.current.nodes(node ? [node] : [])
  }, [selectedId, furniture])



  // ── Custom Model Upload ──────────────────────
  const handleFileUpload = async (e) => {
    if (isGuest) {
      setShowLoginPrompt(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['glb', 'gltf'].includes(ext)) {
      alert('Only .glb and .gltf files are supported.')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('model', file)

      const res = await fetchWithAuth('/api/models/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Failed to upload model')
      const data = await res.json()

      const defaultName = file.name.replace(/\.[^/.]+$/, "") // strip extension

      // Open Custom Name Modal instead of browser prompt, save pending stuff to state
      setPendingUploadData({ data, defaultName })
      setShowCustomNameModal(true)

    } catch (err) {
      console.error(err)
      alert('Error uploading model. Check console for details.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCustomNameSubmit = (finalName) => {
    if (pendingUploadData) {
      addFurniture({
        type: 'Custom Model',
        label: finalName || 'Custom Model',
        emoji: '📦',
        width: 1,
        height: 1,
        defaultColor: '#A020F0',
        modelUrl: pendingUploadData.data.url
      })
    }
    setShowCustomNameModal(false)
    setPendingUploadData(null)
  }

  const handleCustomNameCancel = () => {
    setShowCustomNameModal(false)
    setPendingUploadData(null)
  }

  // ── Keyboard shortcuts: Undo / Redo ──────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement.tagName !== 'INPUT') deleteFurniture(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, selectedId, deleteFurniture])

  // ── Drag end: clamp + optional snap + commit history ─────────
  const handleDragEnd = useCallback((item, e) => {
    // When offsetX/offsetY are set to half-dimensions, e.target.x()/y() returns the CENTER
    let cx = e.target.x()
    let cy = e.target.y()
    if (snapOn) { cx = snapGrid(cx); cy = snapGrid(cy) }
    const clamped = clampToRoom(cx, cy, item, room)
    e.target.x(clamped.x)
    e.target.y(clamped.y)
    updateFurniture(item.id, clamped)
    commitFurnitureHistory()
  }, [snapOn, room, updateFurniture, commitFurnitureHistory])

  // ── Poly Draw Handlers ───────────────────────────────────────
  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage()) setSelectedId(null)

    if (isDrawingWall) {
      const stage = e.target.getStage()
      const pos = stage.getPointerPosition()
      let x = (pos.x - stage.x()) / stage.scaleX()
      let y = (pos.y - stage.y()) / stage.scaleX()

      if (snapOn) {
        x = snapGrid(x)
        y = snapGrid(y)
      } else if (e.evt.shiftKey && draftPolygon.length > 0) {
        // Orthogonal snap (90 or 45 deg)
        const last = draftPolygon[draftPolygon.length - 1]
        const dx = Math.abs(x - last.x)
        const dy = Math.abs(y - last.y)
        if (dx > dy * 2) y = last.y
        else if (dy > dx * 2) x = last.x
        else {
          const signX = Math.sign(x - last.x)
          const signY = Math.sign(y - last.y)
          const avg = (dx + dy) / 2
          x = last.x + signX * avg
          y = last.y + signY * avg
        }
      }

      // If clicked near first point, close polygon
      if (draftPolygon.length > 2) {
        const first = draftPolygon[0]
        const dist = Math.hypot(x - first.x, y - first.y)
        if (dist < 20 / stage.scaleX()) { // snap threshold
          setRoom(prev => ({ ...prev, customPolygon: draftPolygon }))
          setIsDrawingWall(false)
          setDraftPolygon([])
          setCurrMouse(null)
          return
        }
      }

      setDraftPolygon(prev => [...prev, { x, y }])
    }
  }, [isDrawingWall, snapOn, draftPolygon, setRoom, setSelectedId])

  const handleStageMouseMove = useCallback((e) => {
    if (!isDrawingWall) return
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    let x = (pos.x - stage.x()) / stage.scaleX()
    let y = (pos.y - stage.y()) / stage.scaleX()

    if (snapOn) {
      x = snapGrid(x)
      y = snapGrid(y)
    } else if (e.evt.shiftKey && draftPolygon.length > 0) {
      const last = draftPolygon[draftPolygon.length - 1]
      const dx = Math.abs(x - last.x)
      const dy = Math.abs(y - last.y)
      if (dx > dy * 2) y = last.y
      else if (dy > dx * 2) x = last.x
      else {
        const signX = Math.sign(x - last.x)
        const signY = Math.sign(y - last.y)
        const avg = (dx + dy) / 2
        x = last.x + signX * avg
        y = last.y + signY * avg
      }
    }

    // Snap to first node if near
    if (draftPolygon.length > 2) {
      const first = draftPolygon[0]
      const dist = Math.hypot(x - first.x, y - first.y)
      if (dist < 20 / stage.scaleX()) {
        x = first.x
        y = first.y
      }
    }

    setCurrMouse({ x, y })
  }, [isDrawingWall, snapOn, draftPolygon])

  // ── Transform end: persist scale/rotation from canvas handles ─
  const handleTransformEnd = useCallback((item, e) => {
    const node = e.target
    const scaleX = node.scaleX()
    const newScale = (item.scale || 1) * scaleX
    const newRotation = node.rotation()
    // Reset Konva's own scale after capturing it (we store it in data)
    node.scaleX(1)
    node.scaleY(1)
    const cx = node.x()
    const cy = node.y()
    const updatedItem = { ...item, scale: newScale, rotation: newRotation }
    const clamped = clampToRoom(cx, cy, updatedItem, room)
    node.x(clamped.x)
    node.y(clamped.y)
    updateFurniture(item.id, { scale: newScale, rotation: newRotation, ...clamped })
    commitFurnitureHistory()
  }, [room, updateFurniture, commitFurnitureHistory])

  // ── Property change: commit after slider settles ─────────────
  const handlePropChange = useCallback((id, updates) => {
    updateFurniture(id, updates)
  }, [updateFurniture])

  const handlePropCommit = useCallback(() => {
    commitFurnitureHistory()
  }, [commitFurnitureHistory])

  // ── Zoom (scroll wheel) ────────────────────────────
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    const direction = e.evt.deltaY < 0 ? 1 : -1
    const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldScale * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)))
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }
    setStageScale(newScale)
    setStagePos(newPos)
  }, [])

  const resetZoom = useCallback(() => {
    setStageScale(1)
    setStagePos({ x: 0, y: 0 })
  }, [])

  // ── Export PDF ───────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!stageRef.current) return
    const stage = stageRef.current

    // Temporarily reset zoom/pan to capture clean 1:1 image bounds
    const oldScale = stage.scaleX()
    const oldPos = stage.position()
    stage.scale({ x: 1, y: 1 })
    stage.position({ x: 0, y: 0 })

    const cropW = room.width * SCALE + PAD * 2
    const cropH = room.length * SCALE + PAD * 2

    const dataUrl = stage.toDataURL({
      mimeType: 'image/jpeg',
      quality: 0.92,
      pixelRatio: 2,
      x: 0, y: 0, width: cropW, height: cropH
    })

    // Restore zoom/pan instantly
    stage.scale({ x: oldScale, y: oldScale })
    stage.position(oldPos)

    const doc = new jsPDF('landscape', 'mm', 'a4')

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text('Spacio Floor Plan Report', 14, 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Room Dimensions: ${room.width}m × ${room.length}m`, 14, 28)
    doc.text(`Room Shape: ${room.shape}`, 14, 34)
    doc.text(`Total Furniture Items: ${furniture.length}`, 14, 40)

    // Image Layout (left side)
    const maxImgW = 160
    const maxImgH = 150
    const ratio = Math.min(maxImgW / cropW, maxImgH / cropH)
    const renderW = cropW * ratio
    const renderH = cropH * ratio

    doc.addImage(dataUrl, 'JPEG', 14, 48, renderW, renderH)

    // Bill of Materials Table (right side)
    const counts = {}
    furniture.forEach(f => {
      const key = `${f.type} (${f.color})`
      if (!counts[key]) counts[key] = { type: f.type, color: f.color, count: 0 }
      counts[key].count++
    })

    const tableData = Object.values(counts).map(row => [
      row.type,
      row.color,
      row.count.toString()
    ])

    autoTable(doc, {
      startY: 48,
      margin: { left: 185, right: 14 },
      head: [['Item Type', 'Finish', 'Qty']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [26, 39, 68] },
      styles: { fontSize: 9 }
    })

    doc.save('spacio-floor-plan.pdf')
  }, [room, furniture])

  return (
    <div className="editor">
      {/* Guest mode banner */}
      {isGuest && (
        <div style={{
          background: 'linear-gradient(90deg, #f59e0b, #f97316)',
          color: '#fff',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 600,
          padding: '6px 16px',
          letterSpacing: '0.01em',
        }}>
          👋 Guest Mode — design freely! <button
            onClick={() => setShowLoginPrompt(true)}
            style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, cursor: 'pointer', padding: '2px 10px', marginLeft: 8 }}
          >Log in to Save</button>
        </div>
      )}
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="editor-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="btn-topbar"
          >
            <ArrowLeft size={16} /> {isGuest ? 'Home' : 'Dashboard'}
          </button>
          <span className="topbar-logo">Spacio</span>
        </div>
        <div className="topbar-title">
          <span>2D Editor</span>
          <span className="room-dims">{room.width}m × {room.length}m{isLShape ? ' · L' : ''}</span>
        </div>
        <div className="topbar-right">
          <button className="sp-dark-toggle" onClick={toggleDark} title="Dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={async () => {
              if (isGuest) {
                setShowLoginPrompt(true)
              } else if (currentDesignId) {
                const success = await saveDesign(currentDesignName)
                if (success) {
                  setShowToast(true)
                  setTimeout(() => setShowToast(false), 2500)
                }
              } else {
                setShowSave(true)
              }
            }}
            className="btn-save"
            title={isGuest ? 'Log in to save your design' : 'Save design'}
          >
            <Save size={15} /> Save
          </button>
          <button onClick={() => navigate('/preview3d')} className="btn-3d">
            <Box size={15} /> 3D
          </button>
        </div>
      </div>

      {/* ── Tool Strip ──────────────────────────────────────── */}
      <div className="editor-toolstrip">
        <div className="toolstrip-left">
          <button
            className={`tool-btn ${canUndo() ? '' : 'tool-btn--dim'}`}
            onClick={undo}
            title="Undo (Ctrl+Z)"
          ><Undo2 size={14} /> Undo</button>
          <button
            className={`tool-btn ${canRedo() ? '' : 'tool-btn--dim'}`}
            onClick={redo}
            title="Redo (Ctrl+Y)"
          ><Redo2 size={14} /> Redo</button>
        </div>
        <div className="toolstrip-center">
          <button
            className={`tool-btn ${showLive3D ? 'tool-btn--active' : ''}`}
            onClick={() => setShowLive3D(s => !s)}
            title="Toggle Live 3D View"
          >
            <Cuboid size={16} /> Live 3D
          </button>
          <button
            className={`tool-btn ${snapOn ? 'tool-btn--active' : ''}`}
            onClick={() => setSnapOn(s => !s)}
            title="Snap to Grid"
          ><Maximize size={14} /> Snap {snapOn ? 'ON' : 'OFF'}</button>
          {room.shape === 'Custom' && (
            <button
              className={`tool-btn ${isDrawingWall ? 'tool-btn--active' : ''}`}
              onClick={() => {
                setIsDrawingWall(true)
                setDraftPolygon([])
                setCurrMouse(null)
              }}
              title="Draw Custom Walls"
            ><PenTool size={14} /> Draw Walls</button>
          )}
          <button
            className={`tool-btn ${showGrid ? 'tool-btn--active' : ''}`}
            onClick={() => setShowGrid(s => !s)}
            title="Toggle Grid"
          ><Grid3x3 size={14} /> Grid</button>
          <button
            className={`tool-btn ${showLabels ? 'tool-btn--active' : ''}`}
            onClick={() => setShowLabels(s => !s)}
            title="Toggle Labels"
          ><Tags size={14} /> Labels</button>
          <button
            className={`tool-btn ${showDimensions ? 'tool-btn--active' : ''}`}
            onClick={() => setShowDimensions(s => !s)}
            title="Toggle Ruler"
          ><Ruler size={14} /> Ruler</button>
          
          <div className="tool-divider" />
          
          <button
            className="tool-btn btn-export-pdf"
            onClick={handleExport}
            title="Export PDF Report"
          ><Download size={14} /> Export PDF</button>

        </div>
      </div>

      <div className="editor-body">
        {/* ── LEFT: Library ─────────────────────────────────── */}
        <div className="lib-panel">
          <div className="lib-header">
            <h3>Furniture</h3>
            <span>click to add</span>
          </div>
          <div className="lib-grid">
            {LIBRARY.map(item => (
              <button
                key={item.type}
                className="lib-item"
                onClick={() => addFurniture(item)}
              >
                <span className="lib-icon">
                  {item.type === 'Chair' && <Armchair size={22} />}
                  {item.type === 'Dining Table' && <Grid3x3 size={22} />}
                  {item.type === 'Sofa' && <Armchair size={22} />}
                  {item.type === 'Bed' && <Bed size={22} />}
                  {item.type === 'Side Table' && <Box size={22} />}
                  {item.type === 'Wardrobe' && <Columns size={22} />}
                  {item.type === 'Desk' && <Monitor size={22} />}
                  {item.type === 'Bookshelf' && <Library size={22} />}
                </span>
                <span className="lib-name">{item.type}</span>
                <span className="lib-size">{item.width}×{item.height}m</span>
              </button>
            ))}
          </div>

          <div style={{ marginTop: '16px', padding: '0 8px' }}>
            <input
              type="file"
              accept=".glb,.gltf"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              className="btn-topbar"
              style={{ width: '100%', justifyContent: 'center', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)' }}
              disabled={isUploading}
              onClick={() => {
                if (isGuest) {
                  setShowLoginPrompt(true)
                } else {
                  fileInputRef.current?.click()
                }
              }}
              title="Upload a custom .glb or .gltf 3D model"
            >
              <Upload size={16} />
              {isUploading ? 'Uploading...' : 'Upload 3D Model'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-sec)', textAlign: 'center', marginTop: 8 }}>
              Supports .glb / .gltf (up to 50MB)
            </div>
          </div>
        </div>

        {/* ── CENTRE: Canvas Wrapper ────────────────────────────────── */}
        <div className="canvas-wrapper" style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="canvas-area" style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex' }} ref={containerRef}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              <Stage
                ref={stageRef}
                x={stagePos.x}
                y={stagePos.y}
                width={containerSize.w}
                height={containerSize.h}
                scaleX={stageScale}
                scaleY={stageScale}
                onWheel={handleWheel}
                onClick={handleStageClick}
                onMouseMove={handleStageMouseMove}
                style={{ background: 'white', borderRadius: 8, boxShadow: 'var(--sh-lift)', cursor: isDrawingWall ? 'crosshair' : 'default' }}
              >
                <Layer>
                  {/* Floor */}
                  {room.shape === 'Custom' && room.customPolygon && room.customPolygon.length > 2 ? (
                    <Line
                      points={room.customPolygon.flatMap(p => [p.x, p.y])}
                      fill={room.floorColor} stroke={room.wallColor} strokeWidth={14}
                      closed
                      lineJoin="round"
                    />
                  ) : isLShape ? (
                    lRects.map((r, i) => (
                      <Rect key={i} x={r.x} y={r.y} width={r.w} height={r.h}
                        fill={room.floorColor} stroke={room.wallColor} strokeWidth={14} />
                    ))
                  ) : room.shape !== 'Custom' ? (
                    <Rect x={PAD} y={PAD}
                      width={room.width * SCALE} height={room.length * SCALE}
                      fill={room.floorColor} stroke={room.wallColor} strokeWidth={14} rx={4} />
                  ) : null}

                  {/* Render Draft Polygon */}
                  {isDrawingWall && (
                    <Group listening={false}>
                      {draftPolygon.length > 0 && currMouse && (
                        <Line
                          points={[...draftPolygon.flatMap(p => [p.x, p.y]), currMouse.x, currMouse.y]}
                          stroke="#2563eb" strokeWidth={4} dash={[8, 8]}
                        />
                      )}
                      {draftPolygon.map((p, i) => (
                        <Rect key={i} x={p.x - 4} y={p.y - 4} width={8} height={8} fill="white" stroke="#2563eb" strokeWidth={2} cornerRadius={4} />
                      ))}
                      {currMouse && (
                        <Rect x={currMouse.x - 4} y={currMouse.y - 4} width={8} height={8} fill="white" stroke="#2563eb" strokeWidth={2} cornerRadius={4} />
                      )}
                    </Group>
                  )}

                  {/* Floor grid overlay */}
                  {showGrid && (() => {
                    const lines = []
                    const steps = Math.round((room.width * SCALE) / GRID_PX)
                    const stepsH = Math.round((room.length * SCALE) / GRID_PX)
                    for (let i = 1; i < steps; i++) {
                      const x = PAD + i * GRID_PX
                      lines.push(
                        <Line key={`gx-${i}`}
                          points={[x, PAD, x, PAD + room.length * SCALE]}
                          stroke="rgba(120,100,80,0.13)" strokeWidth={1} listening={false} />
                      )
                    }
                    for (let j = 1; j < stepsH; j++) {
                      const y = PAD + j * GRID_PX
                      lines.push(
                        <Line key={`gy-${j}`}
                          points={[PAD, y, PAD + room.width * SCALE, y]}
                          stroke="rgba(120,100,80,0.13)" strokeWidth={1} listening={false} />
                      )
                    }
                    return lines
                  })()}

                  {/* Measurement ruler lines */}
                  <MeasurementLines room={room} />

                  {/* Selected Item Dynamic Distance Lines */}
                  {showDimensions && selectedId && <SelectedDimensionLines item={furniture.find(f => f.id === selectedId)} room={room} />}

                  {/* Furniture */}
                  {furniture.map(item => {
                    const iw = item.width * SCALE * item.scale
                    const ih = item.height * SCALE * item.scale
                    return (
                      <Rect
                        key={item.id}
                        id={'item-' + item.id}
                        x={item.x}
                        y={item.y}
                        offsetX={iw / 2}
                        offsetY={ih / 2}
                        width={iw}
                        height={ih}
                        fill={item.color}
                        stroke={selectedId === item.id ? '#2563eb' : 'rgba(0,0,0,0.2)'}
                        strokeWidth={selectedId === item.id ? 2.5 : 1}
                        rotation={item.rotation}
                        draggable
                        cornerRadius={4}
                        shadowColor="black"
                        shadowBlur={selectedId === item.id ? 10 : 2}
                        shadowOpacity={0.2}
                        onClick={() => setSelectedId(item.id)}
                        onTap={() => setSelectedId(item.id)}
                        onDragEnd={e => handleDragEnd(item, e)}
                        onTransformEnd={e => handleTransformEnd(item, e)}
                      />
                    )
                  })}

                  {/* Labels — same pivot as rect: centered on item.x, item.y */}
                  {showLabels && furniture.map(item => {
                    const iw = item.width * SCALE * item.scale
                    const ih = item.height * SCALE * item.scale
                    return (
                      <Text
                        key={'lbl-' + item.id}
                        x={item.x}
                        y={item.y}
                        offsetX={iw / 2}
                        offsetY={ih / 2 - 6}
                        width={iw}
                        text={item.label || item.type}
                        fontSize={11}
                        fill="rgba(255,255,255,0.92)"
                        align="center"
                        listening={false}
                        rotation={item.rotation}
                        ellipsis
                      />
                    )
                  })}

                  <Transformer ref={trRef} rotateEnabled boundBoxFunc={(_, n) => n} />
                </Layer>
              </Stage>
            </div>
          </div>

          {/* Zoom HUD */}
          <div className="zoom-hud" style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <button className="zoom-btn" onClick={() => setStageScale(s => Math.min(ZOOM_MAX, s * ZOOM_STEP))}>+</button>
            <span className="zoom-pct" onClick={resetZoom} title="Click to reset zoom">
              {Math.round(stageScale * 100)}%
            </span>
            <button className="zoom-btn" onClick={() => setStageScale(s => Math.max(ZOOM_MIN, s / ZOOM_STEP))}>−</button>
          </div>

          {/* Live 3D Preview Panel */}
          {showLive3D && (
            <div className="live-preview-panel">
              <div className="live-preview-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, fontSize: 13, fontWeight: 500 }}>
                <span>Live 3D View</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-topbar" style={{ padding: '2px 10px', fontSize: 12, borderColor: 'rgba(255,255,255,0.3)', color: 'white', background: 'rgba(255,255,255,0.1)' }} onClick={() => navigate('/preview3d')}>Go to 3D View</button>
                  <button className="btn-close-preview" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }} onClick={() => setShowLive3D(false)}>×</button>
                </div>
              </div>
              <Canvas
                shadows
                camera={{ position: [room.width / 2, Math.max(room.length, room.width), room.length * 1.8], fov: 50 }}
                style={{ background: 'linear-gradient(180deg, #c9dde8 0%, #e8eff4 100%)' }}
              >
                <ambientLight intensity={0.55} />
                <directionalLight position={[room.width * 1.2, 6, room.length * 1.2]} intensity={viewportSettings.shading * 1.4} castShadow={viewportSettings.shadows} shadow-mapSize={[1024, 1024]} />
                <pointLight position={[room.width / 2, 2.4, room.length / 2]} intensity={0.35} />
                <hemisphereLight skyColor="#ddeeff" groundColor="#8a7060" intensity={0.4} />

                <Room3D room={room} showWalls={viewportSettings.showWalls} />
                {furniture.map(item => <FurniturePiece3D key={item.id} item={item} shadows={viewportSettings.shadows} />)}

                <OrbitControls target={[room.width / 2, 0.6, room.length / 2]} maxPolarAngle={Math.PI / 2.1} minDistance={1} maxDistance={22} />
              </Canvas>
            </div>
          )}
        </div>

        {/* ── RIGHT: Properties Panel ─────────────────────────────── */}
        <div className="props-panel">
          {selectedId && selected ? (
            <>
              <div className="prop-header" style={{ marginBottom: 12 }}>
                <h3>{selected.label || selected.type}</h3>
                <span className="prop-id" style={{ fontSize: 11, color: 'var(--s-text-3)' }}>ID: {String(selected.id).substring(0, 4)}</span>
              </div>
              <div className="prop-body">
                <div className="prop-row" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label>Colour</label>
                  <div className="color-row">
                    <input type="color" value={selected.color}
                      onChange={e => handlePropChange(selectedId, { color: e.target.value })}
                      onBlur={handlePropCommit} />
                    <span>{selected.color}</span>
                  </div>
                </div>

                <div className="prop-row">
                  <label>Material</label>
                  <select value={selected.material || 'Matte'}
                    onChange={e => {
                      handlePropChange(selectedId, { material: e.target.value })
                      handlePropCommit()
                    }}
                    style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid var(--s-border)', fontSize: '12px', background: 'var(--s-bg)', color: 'var(--s-text-1)' }}
                  >
                    <option value="Matte">Matte</option>
                    <option value="Wood">Wood</option>
                    <option value="Fabric">Fabric</option>
                    <option value="Leather">Leather</option>
                    <option value="Metal">Metal</option>
                    <option value="Plastic">Plastic</option>
                    <option value="Glass">Glass</option>
                  </select>
                </div>

                <div className="prop-row">
                  <label>Scale — {selected.scale.toFixed(1)}×</label>
                  <input type="range" min="0.5" max="2.5" step="0.1"
                    value={selected.scale}
                    onChange={e => handlePropChange(selectedId, { scale: +e.target.value })}
                    onMouseUp={handlePropCommit}
                    onTouchEnd={handlePropCommit} />
                </div>

                <div className="prop-row">
                  <label>Rotate — {selected.rotation}°</label>
                  <input type="range" min="0" max="355" step="5"
                    value={selected.rotation}
                    onChange={e => handlePropChange(selectedId, { rotation: +e.target.value })}
                    onMouseUp={handlePropCommit}
                    onTouchEnd={handlePropCommit} />
                </div>

                <div className="prop-row">
                  <label>Size</label>
                  <span className="prop-val">{selected.width}m × {selected.height}m</span>
                </div>

                <button onClick={() => deleteFurniture(selectedId)} className="btn-remove">
                  <Trash2 size={13} /> Remove Item
                </button>
              </div>
            </>
          ) : (
            <div className="no-sel">
              <Pointer size={24} color="var(--s-text-3)" strokeWidth={1.5} />
              <p>Click any furniture item to edit its properties</p>
            </div>
          )}
          <div className="item-count">
            <Package size={14} style={{ opacity: 0.6 }} />
            {furniture.length} item{furniture.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {showSave && (
        <SaveModal
          onSave={name => { saveDesign(name); setShowSave(false) }}
          onCancel={() => setShowSave(false)}
        />
      )}

      {showLeaveConfirm && (
        <LeaveConfirmModal
          isGuest={isGuest}
          onConfirm={() => navigate(isGuest ? '/' : '/dashboard')}
          onCancel={() => setShowLeaveConfirm(false)}
          onSaveAndLeave={() => {
            if (isGuest) {
              setShowLeaveConfirm(false)
              setShowLoginPrompt(true)
              return
            }
            if (currentDesignId) {
              saveDesign(currentDesignName).then(() => {
                navigate('/dashboard')
              })
            } else {
              setShowLeaveConfirm(false)
              setShowSave(true)
            }
          }}
        />
      )}

      {showCustomNameModal && pendingUploadData && (
        <CustomNameModal
          defaultName={pendingUploadData.defaultName}
          onSubmit={handleCustomNameSubmit}
          onCancel={handleCustomNameCancel}
        />
      )}

      {/* Login prompt for guests trying to Save */}
      <AuthModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        initialView="login"
      />

      {/* Save Toast Notification */}
      {showToast && (
        <div className="save-toast">
          Design saved successfully!
        </div>
      )}
    </div >
  )
}