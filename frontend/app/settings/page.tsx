'use client'
// Settings page for Facebook sync configuration

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import toast from 'react-hot-toast'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export default function SettingsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (token) {
      fetchSyncStatus()
    }
  }, [token])

  const fetchSyncStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sync/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSyncStatus(response.data)
    } catch (error) {
      toast.error('Error al cargar el estado de sincronización')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {

    setSyncing(true)
    try {
      await axios.post(
        `${API_URL}/api/sync/facebook`,
        { daysBack: 30 },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Sincronización iniciada en segundo plano')
      
      // Refresh status after a few seconds
      setTimeout(() => {
        fetchSyncStatus()
      }, 5000)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al iniciar sincronización')
    } finally {
      setSyncing(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

        {/* Estado de Sincronización */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sincronización de Facebook Ads</h2>
          
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ) : syncStatus ? (
            <div className="space-y-4">
              {/* Estado del Token */}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Token de Facebook:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  syncStatus.hasAccessToken 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {syncStatus.hasAccessToken ? 'Configurado' : 'No configurado'}
                </span>
              </div>

              {/* Última sincronización */}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Última sincronización:</span>
                <span className="text-gray-900">
                  {syncStatus.lastSync 
                    ? formatDistanceToNow(new Date(syncStatus.lastSync), { 
                        addSuffix: true, 
                        locale: es 
                      })
                    : 'Nunca'}
                </span>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-primary-600">
                    {syncStatus.accounts?.total_accounts || 0}
                  </p>
                  <p className="text-sm text-gray-600">Cuentas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-primary-600">
                    {syncStatus.accounts?.active_accounts || 0}
                  </p>
                  <p className="text-sm text-gray-600">Activas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-primary-600">
                    {syncStatus.campaigns?.total_campaigns || 0}
                  </p>
                  <p className="text-sm text-gray-600">Campañas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-primary-600">
                    {syncStatus.recentMetrics?.recordsSynced || 0}
                  </p>
                  <p className="text-sm text-gray-600">Registros (24h)</p>
                </div>
              </div>

              {/* Botón de sincronización manual */}
              {(
                <div className="pt-4">
                  <button
                    onClick={handleManualSync}
                    disabled={syncing || !syncStatus.hasAccessToken}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    La sincronización automática se ejecuta cada hora
                  </p>
                </div>
              )

              {!syncStatus.hasAccessToken && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Acción requerida:</strong> Configura el token de acceso de Facebook en las variables de entorno del backend.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No se pudo cargar el estado de sincronización</p>
          )}
        </div>

        {/* Instrucciones de configuración */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Cómo configurar Facebook Ads</h2>
          
          <div className="prose prose-sm max-w-none">
            <ol className="space-y-3">
              <li>
                <strong>Crear una App en Facebook Developers:</strong>
                <ul className="mt-1">
                  <li>Ve a <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">developers.facebook.com</a></li>
                  <li>Crea una app tipo "Business"</li>
                  <li>Añade el producto "Marketing API"</li>
                </ul>
              </li>
              
              <li>
                <strong>Obtener Access Token:</strong>
                <ul className="mt-1">
                  <li>En Facebook Business Manager, genera un token con permisos de <code>ads_read</code></li>
                  <li>El token debe tener acceso a las cuentas publicitarias que quieres sincronizar</li>
                </ul>
              </li>
              
              <li>
                <strong>Configurar en Easypanel:</strong>
                <ul className="mt-1">
                  <li>Añade la variable de entorno: <code>FACEBOOK_ACCESS_TOKEN=tu_token_aqui</code></li>
                  <li>Reinicia el servicio del backend</li>
                </ul>
              </li>
              
              <li>
                <strong>Ejecutar primera sincronización:</strong>
                <ul className="mt-1">
                  <li>Una vez configurado, usa el botón "Sincronizar ahora"</li>
                  <li>La primera sincronización puede tardar varios minutos</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>

        {/* Zona de peligro */}
        {false && user?.role === 'admin' && (
          <div className="card border-red-200 bg-red-50">
            <h2 className="text-lg font-semibold mb-4 text-red-900">Zona de Peligro</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-red-700 mb-2">
                  Limpiar todos los datos sincronizados. Esta acción no se puede deshacer.
                </p>
                <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                  Limpiar datos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}