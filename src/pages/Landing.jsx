import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, PenLine, Box } from 'lucide-react'
import Navbar from '../components/Navbar'
import AuthModal from '../components/AuthModal'
import './Landing.css'

const FEATURES = [
  {
    icon: <LayoutDashboard size={28} strokeWidth={1.5} />,
    title: 'Room Configuration',
    desc: 'Define your space precisely — set dimensions up to 20×20m, choose wall and floor finishes, and configure room shape before you begin.',
  },
  {
    icon: <PenLine size={28} strokeWidth={1.5} />,
    title: '2D Design Editor',
    desc: 'Drag, rotate and scale furniture on a pixel-accurate canvas. Snap to grid, undo mistakes, and see live measurements as you work.',
  },
  {
    icon: <Box size={28} strokeWidth={1.5} />,
    title: '3D Space Preview',
    desc: 'Step inside your design instantly. Orbit, zoom and inspect every corner of your room rendered in real-time 3D.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const loggedIn = !!localStorage.getItem('token')
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState('choice')

  const openAuth = (view) => {
    setAuthView(view)
    setAuthOpen(true)
  }

  return (
    <div className="landing">
      <Navbar />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <p className="hero-eyebrow">Interior Design, Reimagined</p>
          <h1 className="hero-headline">
            Build beautiful spaces<br />
            <em>at the speed of thought</em><br />
            with Spacio.
          </h1>
          <p className="hero-sub">
            A clean, precise tool for designing rooms — from bare walls to fully furnished spaces —
            in minutes. No learning curve. No clutter.
          </p>
          <div className="hero-cta">
            {loggedIn ? (
              <>
                <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                  View My Designs →
                </button>
                <button className="btn-ghost" onClick={() => navigate('/room-setup')}>
                  Start New Design
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={() => openAuth('choice')}>
                  Start Designing
                </button>
                <button className="btn-ghost" onClick={() => openAuth('login')}>
                  Sign In →
                </button>
              </>
            )}
          </div>
        </div>

        {/* CSS art room preview */}
        <div className="hero-visual" aria-hidden="true">
          <div className="room-art">
            <div className="ra-floor" />
            <div className="ra-wall-back" />
            <div className="ra-wall-left" />
            <div className="ra-sofa" />
            <div className="ra-table" />
            <div className="ra-chair ra-chair-1" />
            <div className="ra-chair ra-chair-2" />
            <div className="ra-rug" />
            <div className="ra-lamp" />
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="section-divider" />

      {/* ── Feature Cards ── */}
      <section className="features">
        <div className="features-header">
          <p className="section-label">What you get</p>
          <h2 className="section-title">Everything you need, nothing you don't</h2>
        </div>

        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner">
        <h2 className="cta-title">Your next space starts here.</h2>
        <p className="cta-sub">
          {loggedIn
            ? 'Continue where you left off, or start something new.'
            : 'Start designing your first room as a guest, or sign in to save your work.'}
        </p>
        <button className="btn-primary" onClick={() => loggedIn ? navigate('/dashboard') : openAuth('choice')}>
          {loggedIn ? 'Go to My Designs' : 'Open Spacio'}
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span className="landing-logo footer-logo">Spacio</span>
        <p className="footer-copy">© 2026 Spacio. Crafted with intention.</p>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} />
    </div>
  )
}
