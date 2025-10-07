'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import MetricCard from '@/components/dashboard/MetricCard'
import CampaignChart from '@/components/dashboard/CampaignChart'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeftIcon, PencilIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline'

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, token, isAuthenticated } = useAuthStore()
  const [campaign, setCampaign] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (params.id && token) {
      fetchCampaignData()
    }
  }, [params.id, token, dateRange])

  const fetchCampaignData = async () => {
    setLoading(true)
    try {
      // Datos mockeados para la campaña
      const mockCampaign = generateMockCampaign(params.id as string)
      const mockMetrics = generateMockMetrics()
      
      setCampaign(mockCampaign)
      setMetrics(mockMetrics)
    } catch (error) {
      toast.error('Error al cargar la campaña')
    } finally {
      setLoading(false)
    }
  }

  const generateMockCampaign = (id: string) => {
    const campaigns = [
      { name: 'Black Friday 2024', objective: 'CONVERSIONS', budget: 5000 },
      { name: 'Brand Awareness Q4', objective: 'BRAND_AWARENESS', budget: 3000 },
      { name: 'Holiday Sales', objective: 'CONVERSIONS', budget: 8000 }
    ]
    
    const index = (parseInt(id) - 1) % campaigns.length
    const campaign = campaigns[index]
    
    return {
      id: parseInt(id),
      name: campaign.name,
      status: 'ACTIVE',
      objective: campaign.objective,
      budget_daily: campaign.budget / 30,
      budget_lifetime: campaign.budget,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-03-20T15:30:00Z',
      account_name: 'Cuenta Principal',
      targeting: {
        age_min: 25,
        age_max: 54,
        genders: ['male', 'female'],
        locations: ['México', 'Colombia', 'Argentina'],
        interests: ['E-commerce', 'Online Shopping', 'Technology']
      }
    }
  }

  const generateMockMetrics = () => {
    // Generar tendencia de 30 días
    const days = 30
    const trend = []
    
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - i - 1))
      
      const dayMultiplier = 0.8 + Math.random() * 0.4
      trend.push({
        date: date.toISOString().split('T')[0],
        impressions: Math.floor(50000 * dayMultiplier),
        clicks: Math.floor(1500 * dayMultiplier),
        spend: Number((150 * dayMultiplier).toFixed(2)),
        conversions: Math.floor(30 * dayMultiplier),
        revenue: Number((450 * dayMultiplier).toFixed(2)),
        ctr: Number((3 + Math.random() * 2).toFixed(2)),
        cpc: Number((0.5 + Math.random() * 0.3).toFixed(2)),
        roas: Number((2.5 + Math.random() * 1.5).toFixed(2))
      })
    }

    // Calcular totales
    const totals = trend.reduce((acc, day) => ({
      impressions: acc.impressions + day.impressions,
      clicks: acc.clicks + day.clicks,
      spend: acc.spend + day.spend,
      conversions: acc.conversions + day.conversions,
      revenue: acc.revenue + day.revenue
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 })

    // Ad Sets de ejemplo
    const adSets = [
      { id: 1, name: 'Audiencia Lookalike 1%', status: 'ACTIVE', spend: totals.spend * 0.4, roas: 3.2 },
      { id: 2, name: 'Remarketing Web 30d', status: 'ACTIVE', spend: totals.spend * 0.3, roas: 4.5 },
      { id: 3, name: 'Intereses - Tecnología', status: 'ACTIVE', spend: totals.spend * 0.2, roas: 2.1 },
      { id: 4, name: 'Custom Audience Email', status: 'PAUSED', spend: totals.spend * 0.1, roas: 1.8 }
    ]

    return {
      summary: {
        total_impressions: totals.impressions,
        total_clicks: totals.clicks,
        total_spend: totals.spend,
        total_conversions: totals.conversions,
        total_revenue: totals.revenue,
        avg_ctr: Number((totals.clicks / totals.impressions * 100).toFixed(2)),
        avg_cpc: Number((totals.spend / totals.clicks).toFixed(2)),
        avg_roas: Number((totals.revenue / totals.spend).toFixed(2))
      },
      trend,
      adSets
    }
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const toggleCampaignStatus = () => {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setCampaign({ ...campaign, status: newStatus })
    toast.success(`Campaña ${newStatus === 'ACTIVE' ? 'activada' : 'pausada'}`)
  }

  if (!isAuthenticated || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/campaigns"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-sm text-gray-500">
                {campaign.account_name} • Creada el {new Date(campaign.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={toggleCampaignStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                campaign.status === 'ACTIVE'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {campaign.status === 'ACTIVE' ? (
                <>
                  <PauseIcon className="h-4 w-4" />
                  Pausar
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  Activar
                </>
              )}
            </button>
            <Link
              href={`/campaigns/${campaign.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4" />
              Editar
            </Link>
          </div>
        </div>

        {/* Información de la campaña */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Estado y Objetivo</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    campaign.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {campaign.status === 'ACTIVE' ? 'Activa' : 'Pausada'}
                </span>
                <span className="text-sm text-gray-600">{campaign.objective.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Presupuesto</h3>
            <p className="text-lg font-semibold">{formatCurrency(campaign.budget_daily)}/día</p>
            <p className="text-xs text-gray-500">Total: {formatCurrency(campaign.budget_lifetime)}</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Segmentación</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Edad: {campaign.targeting.age_min}-{campaign.targeting.age_max}</p>
              <p>Ubicaciones: {campaign.targeting.locations.length} países</p>
              <p>Intereses: {campaign.targeting.interests.length} categorías</p>
            </div>
          </div>
        </div>

        {/* Selector de fechas */}
        <div className="flex justify-end gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Desde:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              max={dateRange.endDate}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Hasta:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              min={dateRange.startDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Gasto Total"
            value={formatCurrency(metrics.summary.total_spend)}
            change="+12.5%"
            trend="up"
          />
          <MetricCard
            title="Conversiones"
            value={formatNumber(metrics.summary.total_conversions)}
            change="+8.2%"
            trend="up"
          />
          <MetricCard
            title="CPC Promedio"
            value={formatCurrency(metrics.summary.avg_cpc)}
            change="-5.1%"
            trend="down"
          />
          <MetricCard
            title="ROAS"
            value={`${metrics.summary.avg_roas}x`}
            change="+15.3%"
            trend="up"
          />
        </div>

        {/* Gráfico de tendencia */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Rendimiento en el tiempo</h2>
          <CampaignChart data={metrics.trend} />
        </div>

        {/* Ad Sets */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Conjuntos de anuncios</h2>
            <Link
              href={`/campaigns/${campaign.id}/adsets/new`}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Crear conjunto
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Nombre</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Estado</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Gasto</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">ROAS</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">% del total</th>
                </tr>
              </thead>
              <tbody>
                {metrics.adSets.map((adSet: any) => (
                  <tr key={adSet.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/campaigns/${campaign.id}/adsets/${adSet.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800"
                      >
                        {adSet.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          adSet.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {adSet.status === 'ACTIVE' ? 'Activo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {formatCurrency(adSet.spend)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      <span className={`font-semibold ${adSet.roas >= 2 ? 'text-green-600' : 'text-orange-600'}`}>
                        {adSet.roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-500">
                      {formatPercentage(adSet.spend / metrics.summary.total_spend * 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}