'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/formatters'
import { reportService } from '@/lib/services/reports'
import AccountSelector from '@/components/common/AccountSelector'
import toast from 'react-hot-toast'
import { 
  DocumentArrowDownIcon,
  CalendarIcon,
  ChartBarIcon,
  TableCellsIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type ReportType = 'performance' | 'campaigns' | 'audience' | 'creative' | 'custom'
type ReportFormat = 'pdf' | 'csv' | 'excel'
type ReportFrequency = 'once' | 'daily' | 'weekly' | 'monthly'

interface Report {
  id: number
  name: string
  type: ReportType
  format: ReportFormat
  frequency: ReportFrequency
  status: 'ready' | 'generating' | 'scheduled' | 'failed'
  created_at: string
  last_generated?: string
  file_size?: string
  download_url?: string
  schedule?: {
    day?: number
    hour: number
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  
  // Formulario para nuevo reporte
  const [newReport, setNewReport] = useState({
    name: '',
    type: 'performance' as ReportType,
    format: 'pdf' as ReportFormat,
    frequency: 'once' as ReportFrequency,
    dateRange: {
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    campaigns: [] as number[],
    metrics: [] as string[]
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (token) {
      fetchReports()
    }
  }, [token])

  const fetchReports = async () => {
    setLoading(true)
    try {
      // Datos mockeados
      const mockReports = generateMockReports()
      setReports(mockReports)
    } catch (error) {
      toast.error('Error al cargar los reportes')
    } finally {
      setLoading(false)
    }
  }

  const generateMockReports = (): Report[] => {
    return [
      {
        id: 1,
        name: 'Reporte Mensual - Marzo 2024',
        type: 'performance',
        format: 'pdf',
        frequency: 'monthly',
        status: 'ready',
        created_at: '2024-03-01T10:00:00Z',
        last_generated: '2024-03-01T10:05:00Z',
        file_size: '2.4 MB',
        download_url: '/reports/marzo-2024.pdf',
        schedule: { day: 1, hour: 10 }
      },
      {
        id: 2,
        name: 'Análisis de Campañas Q1',
        type: 'campaigns',
        format: 'excel',
        frequency: 'once',
        status: 'ready',
        created_at: '2024-03-15T14:30:00Z',
        last_generated: '2024-03-15T14:35:00Z',
        file_size: '1.8 MB',
        download_url: '/reports/campaigns-q1.xlsx'
      },
      {
        id: 3,
        name: 'Reporte Semanal Automático',
        type: 'performance',
        format: 'pdf',
        frequency: 'weekly',
        status: 'scheduled',
        created_at: '2024-02-01T09:00:00Z',
        last_generated: '2024-03-18T09:00:00Z',
        file_size: '1.2 MB',
        schedule: { day: 1, hour: 9 }
      },
      {
        id: 4,
        name: 'Análisis de Audiencias',
        type: 'audience',
        format: 'csv',
        frequency: 'once',
        status: 'generating',
        created_at: '2024-03-20T11:00:00Z'
      },
      {
        id: 5,
        name: 'Reporte Diario de Gastos',
        type: 'performance',
        format: 'csv',
        frequency: 'daily',
        status: 'ready',
        created_at: '2024-01-15T08:00:00Z',
        last_generated: new Date().toISOString(),
        file_size: '450 KB',
        download_url: '/reports/daily-spend.csv',
        schedule: { hour: 8 }
      }
    ]
  }

  const getReportTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'performance':
        return <ChartBarIcon className="h-5 w-5" />
      case 'campaigns':
        return <TableCellsIcon className="h-5 w-5" />
      case 'audience':
        return <UsersIcon className="h-5 w-5" />
      case 'creative':
        return <PhotoIcon className="h-5 w-5" />
      default:
        return <DocumentTextIcon className="h-5 w-5" />
    }
  }

  const getReportTypeLabel = (type: ReportType) => {
    const labels = {
      performance: 'Rendimiento',
      campaigns: 'Campañas',
      audience: 'Audiencias',
      creative: 'Creatividades',
      custom: 'Personalizado'
    }
    return labels[type]
  }

  const getStatusBadge = (status: Report['status']) => {
    const styles = {
      ready: 'bg-green-100 text-green-800',
      generating: 'bg-blue-100 text-blue-800',
      scheduled: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      ready: 'Listo',
      generating: 'Generando...',
      scheduled: 'Programado',
      failed: 'Error'
    }
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status === 'generating' && (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
        )}
        {labels[status]}
      </span>
    )
  }

  const handleDownload = async (report: Report) => {
    if (report.download_url && token) {
      try {
        toast.loading(`Descargando ${report.name}...`)
        
        // En producción, esto llamaría al backend
        const response = await fetch(report.download_url)
        const blob = await response.blob()
        
        // Crear URL y descargar
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${report.name}.${report.format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast.dismiss()
        toast.success('Descarga completada')
      } catch (error) {
        toast.dismiss()
        toast.error('Error al descargar el reporte')
      }
    }
  }

  const handleGenerateReport = async () => {
    if (!newReport.name) {
      toast.error('Por favor ingresa un nombre para el reporte')
      return
    }

    const tempId = Date.now()
    const tempReport: Report = {
      id: tempId,
      name: newReport.name,
      type: newReport.type,
      format: newReport.format,
      frequency: newReport.frequency,
      status: 'generating',
      created_at: new Date().toISOString()
    }

    setReports([tempReport, ...reports])
    setShowCreateModal(false)
    setGeneratingId(tempId)
    toast.success('Generando reporte...')

    // Simular generación
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.id === tempId 
          ? {
              ...r,
              status: 'ready',
              last_generated: new Date().toISOString(),
              file_size: '1.5 MB',
              download_url: `/reports/${tempId}.${newReport.format}`
            }
          : r
      ))
      setGeneratingId(null)
      toast.success('Reporte generado exitosamente')
    }, 3000)

    // Reset form
    setNewReport({
      name: '',
      type: 'performance',
      format: 'pdf',
      frequency: 'once',
      dateRange: {
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      campaigns: [],
      metrics: []
    })
  }

  const handleDeleteReport = (reportId: number) => {
    if (confirm('¿Estás seguro de eliminar este reporte?')) {
      setReports(reports.filter(r => r.id !== reportId))
      toast.success('Reporte eliminado')
    }
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Nuevo Reporte
          </button>
        </div>

        {/* Resumen de reportes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reportes</p>
                <p className="text-2xl font-bold">{reports.length}</p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Programados</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.frequency !== 'once').length}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-primary-400" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Listos</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === 'ready').length}
                </p>
              </div>
              <CheckIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Generados hoy</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => 
                    r.last_generated && 
                    new Date(r.last_generated).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Lista de reportes */}
        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="card text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay reportes generados</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-primary-600 hover:text-primary-800"
            >
              Generar tu primer reporte
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reporte
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frecuencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última generación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tamaño
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {getReportTypeIcon(report.type)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {report.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {report.format.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getReportTypeLabel(report.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.frequency === 'once' ? 'Una vez' :
                         report.frequency === 'daily' ? 'Diario' :
                         report.frequency === 'weekly' ? 'Semanal' : 'Mensual'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.last_generated
                          ? format(new Date(report.last_generated), "dd MMM yyyy HH:mm", { locale: es })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.file_size || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {report.status === 'ready' && (
                            <button
                              onClick={() => handleDownload(report)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Descargar"
                            >
                              <ArrowDownTrayIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de creación */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Generar Nuevo Reporte</h2>
              
              <div className="space-y-4">
                {/* Nombre del reporte */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del reporte
                  </label>
                  <input
                    type="text"
                    value={newReport.name}
                    onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ej: Reporte Mensual Marzo"
                  />
                </div>

                {/* Tipo de reporte */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de reporte
                  </label>
                  <select
                    value={newReport.type}
                    onChange={(e) => setNewReport({ ...newReport, type: e.target.value as ReportType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="performance">Rendimiento General</option>
                    <option value="campaigns">Análisis de Campañas</option>
                    <option value="audience">Análisis de Audiencias</option>
                    <option value="creative">Análisis de Creatividades</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['pdf', 'csv', 'excel'] as ReportFormat[]).map((format) => (
                      <button
                        key={format}
                        onClick={() => setNewReport({ ...newReport, format })}
                        className={`px-4 py-2 rounded-lg border ${
                          newReport.format === format
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rango de fechas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Período
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={newReport.dateRange.start}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        dateRange: { ...newReport.dateRange, start: e.target.value }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="date"
                      value={newReport.dateRange.end}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        dateRange: { ...newReport.dateRange, end: e.target.value }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Frecuencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frecuencia
                  </label>
                  <select
                    value={newReport.frequency}
                    onChange={(e) => setNewReport({ ...newReport, frequency: e.target.value as ReportFrequency })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="once">Una vez</option>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>

                {/* Métricas a incluir */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Métricas a incluir
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {[
                      'Impresiones', 'Clics', 'CTR', 'CPC', 'Gasto',
                      'Conversiones', 'Tasa de conversión', 'CPA', 'ROAS',
                      'Alcance', 'Frecuencia', 'Interacciones'
                    ].map((metric) => (
                      <label key={metric} className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded text-primary-600 mr-2"
                          checked={newReport.metrics.includes(metric)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewReport({
                                ...newReport,
                                metrics: [...newReport.metrics, metric]
                              })
                            } else {
                              setNewReport({
                                ...newReport,
                                metrics: newReport.metrics.filter(m => m !== metric)
                              })
                            }
                          }}
                        />
                        <span className="text-sm">{metric}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Generar Reporte
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// Iconos faltantes (simplificados)
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const PhotoIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)