import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, KeyboardControls } from '@react-three/drei'
import { useNavigate } from 'react-router-dom'
import { useDesign } from '../context/DesignContext'
import { Home, Mouse, Sun, SunDim, Layers, Footprints, Box } from 'lucide-react'
import { Room, FurniturePiece, FpsController } from '../components/Scene3D'
import './Preview3D.css'

// ── Main Page ──────────────────────────────────────────────────
export default function Preview3D() {
  const navigate = useNavigate()
  const { room, furniture, viewportSettings, setViewportSettings } = useDesign()
  
  const { shading, shadows, isWalking, showWalls } = viewportSettings

  const updateSettings = (updates) => {
    setViewportSettings(prev => ({ ...prev, ...updates }))
  }

  return (
    <div className="preview3d">
      <div className="preview-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/editor')} className="btn-back2d">← Back to 2D</button>
          <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 18, fontWeight: 500, color: 'var(--s-text)' }}>Spacio</span>
        </div>
        <div className="topbar-title">
          <Home size={16} strokeWidth={2.5} />
          <span>3D Room Preview</span>
        </div>
        <div className="topbar-hint" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Sunlight slider */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--s-text-2, #666)', userSelect: 'none' }}>
            <SunDim size={14} strokeWidth={2} style={{ opacity: 0.7 }} />
            <input
              type="range" min="0.1" max="2.0" step="0.05"
              value={shading}
              onChange={e => updateSettings({ shading: parseFloat(e.target.value) })}
              style={{ width: 90, accentColor: '#f59e0b', cursor: 'pointer' }}
              title="Sunlight intensity"
            />
            <Sun size={14} strokeWidth={2} style={{ opacity: 0.7 }} />
          </label>
          {/* Walls toggle */}
          <button
            onClick={() => updateSettings({ showWalls: !showWalls })}
            title={showWalls ? 'Hide Walls' : 'Show Walls'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, cursor: 'pointer', border: 'none',
              background: showWalls ? '#1a2744' : 'transparent',
              color: showWalls ? '#fff' : 'var(--s-text-2, #666)',
              outline: showWalls ? 'none' : '1px solid #ccc',
            }}
          >
            <Box size={13} /> {showWalls ? 'Walls ON' : 'Walls OFF'}
          </button>
          {/* Shadow toggle */}
          <button
            onClick={() => updateSettings({ shadows: !shadows })}
            title={shadows ? 'Shadows ON — click to disable' : 'Shadows OFF — click to enable'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, cursor: 'pointer', border: 'none',
              background: shadows ? '#1a2744' : 'transparent',
              color: shadows ? '#fff' : 'var(--s-text-2, #666)',
              outline: shadows ? 'none' : '1px solid #ccc',
            }}
          >
            <Layers size={13} /> {shadows ? 'Shadows' : 'Flat'}
          </button>
          {/* Walk mode toggle */}
          <button
            onClick={() => updateSettings({ isWalking: !isWalking })}
            title={isWalking ? 'Exit Walk Mode (ESC)' : 'Enter First-Person Walk Mode'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, cursor: 'pointer', border: 'none',
              background: isWalking ? '#10b981' : 'transparent',
              color: isWalking ? '#fff' : 'var(--s-text-2, #666)',
              outline: isWalking ? 'none' : '1px solid #ccc',
            }}
          >
            <Footprints size={13} /> {isWalking ? 'Walking' : 'Walk'}
          </button>

          {isWalking ? (
            <>
              <Mouse size={14} strokeWidth={2.5} style={{ opacity: 0.7 }} />
              <span>Look around · WASD to move · ESC to exit</span>
            </>
          ) : (
            <>
              <Mouse size={14} strokeWidth={2.5} style={{ opacity: 0.7 }} />
              <span>Drag to orbit · Scroll to zoom</span>
            </>
          )}
        </div>
      </div>

      <div className="canvas3d">
        <KeyboardControls
          map={[
            { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
            { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
            { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
            { name: 'right', keys: ['ArrowRight', 'KeyD'] },
          ]}
        >
          <Canvas
            shadows
            camera={{ position: [room.width / 2, room.length * 1.4, room.length * 2.4], fov: 52 }}
            style={{ background: 'linear-gradient(180deg, #c9dde8 0%, #e8eff4 100%)' }}
          >
            <ambientLight intensity={0.55 * shading} />
            <directionalLight
              position={[room.width * 1.2, 6, room.length * 1.2]}
              intensity={1.4 * shading}
              castShadow={shadows}
              shadow-mapSize={[2048, 2048]}
            />
            <pointLight position={[room.width / 2, 2.4, room.length / 2]} intensity={0.35 * shading} />
            <hemisphereLight skyColor="#ddeeff" groundColor="#8a7060" intensity={0.4 * shading} />

            <Room room={room} showWalls={showWalls} />
            {furniture.map(item => (
              <FurniturePiece key={item.id} item={item} />
            ))}

            {/* Controls toggle based on walking state */}
            {isWalking ? (
              <>
                <PointerLockControls onUnlock={() => updateSettings({ isWalking: false })} />
                <FpsController room={room} />
              </>
            ) : (
              <OrbitControls
                target={[room.width / 2, 0.6, room.length / 2]}
                maxPolarAngle={Math.PI / 2.1}
                minDistance={1}
                maxDistance={22}
              />
            )}
          </Canvas>
        </KeyboardControls>
      </div>

      <div className="info-bar">
        <span>Room: {room.width}m × {room.length}m{room.shape === 'L-Shape' ? ' (L-Shape)' : ''}</span>
        <span>·</span>
        <span>{furniture.length} furniture item{furniture.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Wall: {room.wallColor} · Floor: {room.floorColor}</span>
      </div>
    </div>
  )
}