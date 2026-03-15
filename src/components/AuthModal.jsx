import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDesign } from '../context/DesignContext'
import { X, Armchair } from 'lucide-react'
import './AuthModal.css'

export default function AuthModal({ isOpen, onClose, initialView = 'choice' }) {
    const [view, setView] = useState(initialView)
    const [isRegister, setIsRegister] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const { setRoom, setFurniture } = useDesign()

    if (!isOpen) return null

    const handleAuth = async (e) => {
        e.preventDefault()
        setError('')

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Authentication failed')
                return
            }

            localStorage.setItem('token', data.token)
            localStorage.setItem('userEmail', data.email)
            localStorage.removeItem('isGuest')

            onClose()
            navigate('/dashboard')
            // Add a small delay then reload to force DesignContext to re-fetch with new token
            setTimeout(() => window.location.reload(), 100)

        } catch (err) {
            console.error(err)
            setError('Server connection error. Is the backend running?')
        }
    }

    const handleGuest = () => {
        localStorage.setItem('isGuest', 'true')
        setRoom({ width: 4, length: 3, shape: 'Rectangle', wallColor: '#F5F5DC', floorColor: '#D2B48C' })
        setFurniture([])
        onClose()
        navigate('/room-setup')
    }

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={e => e.stopPropagation()}>
                <button className="btn-close" onClick={onClose}>
                    <X size={20} />
                </button>

                {view === 'choice' ? (
                    <div className="auth-choice-view">
                        <div className="auth-logo">
                            <span className="logo-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                <Armchair size={36} color="var(--s-accent)" />
                            </span>
                            <h2>Start Your Design</h2>
                            <p>How would you like to continue?</p>
                        </div>

                        <div className="auth-options">
                            <button className="auth-btn-primary" onClick={() => setView('login')}>
                                Log In / Sign Up
                            </button>
                            <div className="auth-divider">
                                <span>or</span>
                            </div>
                            <button className="auth-btn-guest" onClick={handleGuest}>
                                Continue as Guest (Demo Mode)
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="auth-login-view">
                        <div className="auth-logo">
                            <span className="logo-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                <Armchair size={36} color="var(--s-accent)" />
                            </span>
                            <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
                            <p>{isRegister ? 'Sign up to build your spaces' : 'Sign in to save your designs'}</p>
                        </div>
                        <form onSubmit={handleAuth} className="auth-form">
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError('') }}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError('') }}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                            {error && <p className="error-msg">⚠️ {error}</p>}
                            <button type="submit" className="auth-btn-primary">
                                {isRegister ? 'Sign Up' : 'Log In'}
                            </button>
                        </form>
                        <p className="auth-hint">
                            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                            <strong style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsRegister(!isRegister)}>
                                {isRegister ? 'Log In' : 'Sign Up'}
                            </strong>
                        </p>

                        {initialView === 'choice' && (
                            <button className="auth-btn-back" onClick={() => { setView('choice'); setError(''); }}>
                                ← Back to options
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
