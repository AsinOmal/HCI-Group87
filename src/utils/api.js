export const fetchWithAuth = async (url, options = {}) => {
  let token = localStorage.getItem('token')

  const headers = new Headers(options.headers || {})
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Ensure cookies are included (for the refresh token)
  options.credentials = 'include'

  try {
    let response = await fetch(url, { ...options, headers })

    // If the request is fine, or it's a non-auth error (like 404), just return it
    if (response.status !== 401) {
      return response
    }

    // 401 Unauthorized -> Token expired. Let's try to refresh it!
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    })

    if (!refreshRes.ok) {
      // Refresh token is also expired or missing -> force logout
      localStorage.removeItem('token')
      localStorage.removeItem('userEmail')
      window.dispatchEvent(new Event('auth-expired'))
      return response // Return original 401
    }

    const { token: newToken } = await refreshRes.json()
    localStorage.setItem('token', newToken)

    // Retry original request with new token
    headers.set('Authorization', `Bearer ${newToken}`)
    return fetch(url, { ...options, headers })

  } catch (error) {
    console.error('fetchWithAuth error:', error)
    throw error
  }
}

export const logoutApi = async () => {
  try {
    await fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include' 
    })
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
