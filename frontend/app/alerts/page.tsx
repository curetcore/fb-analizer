'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { alertService } from '@/lib/services/alerts'
import { formatCurrency, formatPercentage } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { 
  BellIcon, 
  BellAlertIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type AlertType = 'spend_limit' | 'roas_drop' | 'ctr_drop' | 'budget_pace' | 'conversion_spike'
type AlertStatus = 'active' | 'triggered' | 'resolved' | 'paused'

interface Alert {
  id: number
  name: string
  type: AlertType
  status: AlertStatus
  condition: {
    metric: string
    operator: string
    value: number
    timeframe?: string
  }
  campaign_id?: number
  campaign_name?: string
  account_id: number
  last_triggered?: string
  created_at: string
}

export default function AlertsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (token) {
      fetchAlerts()
    }
  }, [token])

  useEffect(() => {
    filterAlerts()
  }, [alerts, statusFilter])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      // Datos mockeados de alertas
      const mockAlerts = generateMockAlerts()
      setAlerts(mockAlerts)
    } catch (error) {
      toast.error('Error al cargar las alertas')
    } finally {
      setLoading(false)
    }
  }

  const generateMockAlerts = (): Alert[] => {
    return [
      {
        id: 1,
        name: 'Gasto diario excedido',
        type: 'spend_limit',
        status: 'triggered',
        condition: {
          metric: 'daily_spend',
          operator: '>',
          value: 500,
          timeframe: '1d'
        },
        campaign_id: 1,
        campaign_name: 'Black Friday 2024',
        account_id: 1,
        last_triggered: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        name: 'ROAS bajo crítico',
        type: 'roas_drop',
        status: 'active',
        condition: {
          metric: 'roas',
          operator: '<',
          value: 1.5,
          timeframe: '7d'
        },
        account_id: 1,
        created_at: '2024-01-20T10:00:00Z'
      },
      {
        id: 3,
        name: 'CTR cayendo',
        type: 'ctr_drop',
        status: 'triggered',
        condition: {
          metric: 'ctr_change',
          operator: '<',
          value: -20,
          timeframe: '3d'
        },
        campaign_id: 2,
        campaign_name: 'Brand Awareness Q4',
        account_id: 1,
        last_triggered: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        created_at: '2024-02-01T10:00:00Z'
      },
      {
        id: 4,
        name: 'Presupuesto agotándose rápido',
        type: 'budget_pace',
        status: 'resolved',
        condition: {
          metric: 'budget_spent_percentage',
          operator: '>',
          value: 80,
          timeframe: 'lifetime'
        },
        campaign_id: 3,
        campaign_name: 'Holiday Sales',
        account_id: 1,
        last_triggered: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        created_at: '2024-02-10T10:00:00Z'
      },
      {
        id: 5,
        name: 'Pico de conversiones',
        type: 'conversion_spike',
        status: 'paused',
        condition: {
          metric: 'conversion_increase',
          operator: '>',
          value: 50,
          timeframe: '1d'
        },
        account_id: 1,
        created_at: '2024-02-15T10:00:00Z'
      }
    ]
  }

  const filterAlerts = () => {
    let filtered = [...alerts]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter)
    }
    
    // Ordenar por última activación (más reciente primero)
    filtered.sort((a, b) => {
      const aTime = a.last_triggered ? new Date(a.last_triggered).getTime() : 0
      const bTime = b.last_triggered ? new Date(b.last_triggered).getTime() : 0
      return bTime - aTime
    })
    
    setFilteredAlerts(filtered)
  }

  const getAlertIcon = (type: AlertType, status: AlertStatus) => {
    if (status === 'triggered') {
      return <BellAlertIcon className="h-5 w-5 text-red-600" />
    }
    
    switch (type) {
      case 'spend_limit':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
      case 'roas_drop':
      case 'ctr_drop':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
      case 'budget_pace':
        return <BellIcon className="h-5 w-5 text-yellow-600" />
      case 'conversion_spike':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      default:
        return <BellIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getAlertTypeLabel = (type: AlertType) => {
    const labels = {
      spend_limit: 'Límite de gasto',
      roas_drop: 'Caída de ROAS',
      ctr_drop: 'Caída de CTR',
      budget_pace: 'Ritmo de presupuesto',
      conversion_spike: 'Pico de conversiones'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: AlertStatus) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      triggered: 'bg-red-100 text-red-800',
      resolved: 'bg-gray-100 text-gray-800',
      paused: 'bg-yellow-100 text-yellow-800'
    }
    
    const labels = {
      active: 'Activa',
      triggered: 'Activada',
      resolved: 'Resuelta',
      paused: 'Pausada'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const formatCondition = (condition: Alert['condition']) => {
    const operators: { [key: string]: string } = {
      '>': 'mayor que',
      '<': 'menor que',
      '>=': 'mayor o igual que',
      '<=': 'menor o igual que',
      '=': 'igual a'
    }
    
    const metrics: { [key: string]: string } = {
      daily_spend: 'Gasto diario',
      roas: 'ROAS',
      ctr_change: 'Cambio en CTR',
      budget_spent_percentage: '% de presupuesto gastado',
      conversion_increase: 'Aumento de conversiones'
    }
    
    let value = condition.value
    let formattedValue = value.toString()
    
    if (condition.metric.includes('spend')) {
      formattedValue = formatCurrency(value)
    } else if (condition.metric.includes('percentage') || condition.metric.includes('change') || condition.metric.includes('increase')) {
      formattedValue = formatPercentage(value)
    }
    
    return `${metrics[condition.metric] || condition.metric} ${operators[condition.operator]} ${formattedValue}`
  }

  const handleDeleteAlert = (alertId: number) => {
    if (confirm('¿Estás seguro de eliminar esta alerta?')) {
      setAlerts(alerts.filter(a => a.id !== alertId))
      toast.success('Alerta eliminada')
    }
  }

  const handleToggleAlert = (alertId: number) => {
    setAlerts(alerts.map(alert => {
      if (alert.id === alertId) {
        const newStatus = alert.status === 'paused' ? 'active' : 'paused'
        toast.success(`Alerta ${newStatus === 'active' ? 'activada' : 'pausada'}`)
        return { ...alert, status: newStatus }
      }
      return alert
    }))
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Alerta
          </button>
        </div>

        {/* Resumen de alertas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {alerts.filter(a => a.status === 'active').length}
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>
          
          <div className="card bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activadas</p>
                <p className="text-2xl font-bold text-red-600">
                  {alerts.filter(a => a.status === 'triggered').length}
                </p>
              </div>
              <BellAlertIcon className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </div>
          
          <div className="card bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resueltas</p>
                <p className="text-2xl font-bold text-gray-600">
                  {alerts.filter(a => a.status === 'resolved').length}
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-gray-600 opacity-50" />
            </div>
          </div>
          
          <div className="card bg-yellow-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pausadas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {alerts.filter(a => a.status === 'paused').length}
                </p>
              </div>
              <XMarkIcon className="h-8 w-8 text-yellow-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="card">
          <div className="flex flex-wrap gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="triggered">Activadas</option>
              <option value="resolved">Resueltas</option>
              <option value="paused">Pausadas</option>
            </select>
          </div>
        </div>

        {/* Lista de alertas */}
        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="card text-center py-12">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay alertas configuradas</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-primary-600 hover:text-primary-800"
            >
              Crear tu primera alerta
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`card border-l-4 ${
                  alert.status === 'triggered' 
                    ? 'border-l-red-500 bg-red-50' 
                    : 'border-l-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {getAlertIcon(alert.type, alert.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{alert.name}</h3>
                        {getStatusBadge(alert.status)}
                        <span className="text-xs text-gray-500">
                          {getAlertTypeLabel(alert.type)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {formatCondition(alert.condition)}
                        {alert.condition.timeframe && ` (últimos ${alert.condition.timeframe})`}
                      </p>
                      
                      {alert.campaign_name && (
                        <p className="text-sm text-gray-500">
                          Campaña: <span className="font-medium">{alert.campaign_name}</span>
                        </p>
                      )}
                      
                      {alert.last_triggered && (
                        <p className="text-xs text-gray-500 mt-2">
                          Última activación: {formatDistanceToNow(new Date(alert.last_triggered), {
                            addSuffix: true,
                            locale: es
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAlert(alert.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title={alert.status === 'paused' ? 'Activar' : 'Pausar'}
                    >
                      {alert.status === 'paused' ? (
                        <PlayIcon className="h-4 w-4" />
                      ) : (
                        <XMarkIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => toast.info('Próximamente: Editar alerta')}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de creación (placeholder) */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Crear Nueva Alerta</h2>
              <p className="text-gray-600 mb-4">
                Próximamente podrás crear alertas personalizadas para monitorear tus campañas.
              </p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}