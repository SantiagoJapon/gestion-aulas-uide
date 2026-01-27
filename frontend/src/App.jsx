import { useState, useEffect } from 'react'

function App() {
  const [backendStatus, setBackendStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar conexión con el backend
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:3000/health')
        const data = await response.json()
        setBackendStatus(data)
      } catch (error) {
        setBackendStatus({ error: 'No se pudo conectar con el backend' })
      } finally {
        setLoading(false)
      }
    }

    checkBackend()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-uide-blue to-blue-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Sistema de Gestión de Aulas
          </h1>
          <h2 className="text-2xl text-blue-200">
            UIDE Loja
          </h2>
        </div>

        {/* Card principal */}
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-uide-orange p-6">
            <h3 className="text-2xl font-bold text-white text-center">
              Estado del Sistema
            </h3>
          </div>

          <div className="p-8">
            {/* Estado del Frontend */}
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Frontend funcionando correctamente
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    React + Vite + TailwindCSS
                  </p>
                </div>
              </div>
            </div>

            {/* Estado del Backend */}
            <div className={`mb-6 p-4 border-l-4 rounded ${
              loading
                ? 'bg-yellow-50 border-yellow-500'
                : backendStatus?.error
                ? 'bg-red-50 border-red-500'
                : 'bg-green-50 border-green-500'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {loading ? (
                    <svg className="animate-spin h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : backendStatus?.error ? (
                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    loading
                      ? 'text-yellow-800'
                      : backendStatus?.error
                      ? 'text-red-800'
                      : 'text-green-800'
                  }`}>
                    {loading
                      ? 'Verificando conexión con el backend...'
                      : backendStatus?.error
                      ? 'Backend no disponible'
                      : 'Backend funcionando correctamente'
                    }
                  </p>
                  {!loading && (
                    <p className={`text-xs mt-1 ${
                      backendStatus?.error ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {backendStatus?.error
                        ? backendStatus.error
                        : `Node.js + Express - Uptime: ${Math.floor(backendStatus.uptime)}s`
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">
                Próximos pasos:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li className="flex items-start">
                  <span className="mr-2">1.</span>
                  <span>Iniciar Docker y levantar PostgreSQL</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2.</span>
                  <span>Verificar conexión a la base de datos</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3.</span>
                  <span>Crear modelos y migraciones</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">4.</span>
                  <span>Implementar autenticación</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-blue-200 text-sm">
          <p>Desarrollado para UIDE Loja - 2025</p>
        </div>
      </div>
    </div>
  )
}

export default App


