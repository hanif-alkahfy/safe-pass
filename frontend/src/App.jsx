import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    // Test backend connection
    const checkBackend = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001'}/health`)
        if (response.ok) {
          setBackendStatus('connected')
        } else {
          setBackendStatus('error')
        }
      } catch (error) {
        console.log('Backend not yet available:', error.message)
        setBackendStatus('disconnected')
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (backendStatus) {
      case 'connected': return 'text-green-500'
      case 'disconnected': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusText = () => {
    switch (backendStatus) {
      case 'connected': return '✅ Backend Connected'
      case 'disconnected': return '⚡ Connecting to Backend...'
      case 'error': return '❌ Backend Error'
      default: return '🔄 Checking Backend...'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-center text-white">
            🔐 SafePass
          </h1>
          <p className="text-center text-gray-300 mt-2">
            Secure Password Generator
          </p>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* Status Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700 p-8">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                
                <h2 className="text-xl font-semibold text-white mb-2">
                  SafePass Initialized
                </h2>
                
                <p className="text-gray-300 mb-6">
                  React + Vite frontend ready for development
                </p>
              </div>

              {/* Backend Status */}
              <div className="border-t border-gray-600 pt-6">
                <div className="flex items-center justify-center space-x-2">
                  <div className={`font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                  </div>
                  {backendStatus === 'checking' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  )}
                </div>
                
                <div className="mt-4 text-xs text-gray-400">
                  <div>Frontend: {import.meta.env.VITE_APP_NAME} v1.0.0</div>
                  <div>Environment: {import.meta.env.VITE_ENV}</div>
                  <div>API URL: {import.meta.env.VITE_API_BASE_URL}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Development Info */}
          {import.meta.env.VITE_ENABLE_DEBUG === 'true' && (
            <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h3 className="text-yellow-400 font-medium text-sm mb-2">🛠️ Development Mode</h3>
              <ul className="text-yellow-300 text-xs space-y-1">
                <li>• Hot reload enabled</li>
                <li>• Debug mode active</li>
                <li>• Source maps enabled</li>
                <li>• Backend health monitoring</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App