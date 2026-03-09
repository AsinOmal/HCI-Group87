import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { fetchWithAuth } from '../utils/api'

const DesignContext = createContext()

export function DesignProvider({ children }) {
  const [room, setRoom] = useState({
    width: 4,
    length: 3,
    shape: 'Rectangle',
    wallColor: '#F5F5DC',
    floorColor: '#D2B48C',
    customPolygon: []
  })

  const [furniture, setFurniture] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [savedDesigns, setSavedDesigns] = useState([])
  const [currentDesignId, setCurrentDesignId] = useState(null)
  const [currentDesignName, setCurrentDesignName] = useState('Untitled Design')

  const [showLive3D, setShowLive3D] = useState(false)
  const [viewportSettings, setViewportSettings] = useState({
    showWalls: true,
    shadows: true,
    shading: 1.0
  })

  // ── Undo / Redo history ──────────────────────────────────────
  const historyRef = useRef([[]])   // array of furniture snapshots
  const historyIdxRef = useRef(0)      // current position

  const pushHistory = useCallback((newFurniture) => {
    // Trim any redo entries ahead of current position
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
    historyRef.current.push(newFurniture.map(f => ({ ...f })))
    historyIdxRef.current = historyRef.current.length - 1
  }, [])

  const undo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1
      setFurniture(historyRef.current[historyIdxRef.current].map(f => ({ ...f })))
      setSelectedId(null)
    }
  }, [])

  const redo = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current += 1
      setFurniture(historyRef.current[historyIdxRef.current].map(f => ({ ...f })))
      setSelectedId(null)
    }
  }, [])

  const canUndo = () => historyIdxRef.current > 0
  const canRedo = () => historyIdxRef.current < historyRef.current.length - 1

  // ── Cloud Persisted Designs ──────────────────────────────────
  const fetchDesigns = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setSavedDesigns([])
      return
    }
    try {
      const res = await fetchWithAuth('/api/designs')
      if (res.ok) {
        const data = await res.json()
        setSavedDesigns(data)
      }
    } catch (e) {
      console.error('Failed to fetch designs', e)
    }
  }, [])

  useEffect(() => {
    fetchDesigns()
  }, [fetchDesigns])

  // ── Design save / load / delete ──────────────────────────────
  const saveDesign = async (name) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      let res;
      if (currentDesignId) {
        res = await fetchWithAuth(`/api/designs/${currentDesignId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, room, furniture })
        })
      } else {
        res = await fetchWithAuth('/api/designs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, room, furniture })
        })
      }

      if (res.ok) {
        const data = await res.json()
        if (!currentDesignId) {
          setCurrentDesignId(data._id)
        }
        setCurrentDesignName(data.name || name)
        fetchDesigns() // Refresh the list from the server
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to save design', e)
      return false
    }
  }

  const loadDesign = (design) => {
    setRoom(design.room)
    setFurniture(design.furniture)
    setSelectedId(null)
    setCurrentDesignId(design._id)
    setCurrentDesignName(design.name)
    // Reset history for the loaded design
    historyRef.current = [design.furniture.map(f => ({ ...f }))]
    historyIdxRef.current = 0
  }

  const deleteDesign = async (id) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetchWithAuth(`/api/designs/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchDesigns() // Refresh the list
      }
    } catch (e) {
      console.error('Failed to delete design', e)
    }
  }

  const renameDesign = async (id, name) => {
    const token = localStorage.getItem('token')
    if (!token) return false
    try {
      const res = await fetchWithAuth(`/api/designs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (res.ok) {
        fetchDesigns()
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to rename design', e)
      return false
    }
  }

  // ── Furniture CRUD (all push to history) ─────────────────────
  const addFurniture = (item) => {
    const SCALE = 80
    const PAD = 40
    // x,y represent the CENTER of the item on the canvas
    const iw = item.width * SCALE
    const ih = item.height * SCALE
    const newItem = {
      id: Date.now(),
      ...item,
      x: PAD + (room.width * SCALE) / 2,
      y: PAD + (room.length * SCALE) / 2,
      rotation: 0,
      scale: 1,
      color: item.defaultColor
    }
    // Tiny offset so each new item doesn't perfectly overlap the last
    void iw; void ih
    setFurniture(prev => {
      const next = [...prev, newItem]
      pushHistory(next)
      return next
    })
    setSelectedId(newItem.id)
  }

  const updateFurniture = (id, updates) => {
    setFurniture(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...updates } : f)
      return next
    })
  }

  // Called after drag / property change settles — commits to history
  const commitFurnitureHistory = () => {
    setFurniture(prev => {
      pushHistory(prev)
      return prev
    })
  }

  const deleteFurniture = (id) => {
    setFurniture(prev => {
      const next = prev.filter(f => f.id !== id)
      pushHistory(next)
      return next
    })
    setSelectedId(null)
  }

  return (
    <DesignContext.Provider value={{
      room, setRoom,
      furniture, setFurniture,
      selectedId, setSelectedId,
      savedDesigns,
      currentDesignId, setCurrentDesignId,
      currentDesignName, setCurrentDesignName,
      saveDesign, loadDesign, deleteDesign, renameDesign,
      addFurniture, updateFurniture, deleteFurniture, commitFurnitureHistory,
      undo, redo, canUndo, canRedo,
      showLive3D, setShowLive3D,
      viewportSettings, setViewportSettings
    }}>
      {children}
    </DesignContext.Provider>
  )
}

export function useDesign() {
  return useContext(DesignContext)
}