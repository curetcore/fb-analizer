'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/formatters'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

export default function CompareCampaignsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, token, isAuthenticated } = useAuthStore()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const campaignIds = searchParams.get('ids')?.split(',').map(id => parseInt(id)) || []

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (campaignIds.length > 0 && token) {
      fetchCampaignsData()
    }
  }, [campaignIds, token])

  const fetchCampaignsData = () => {
    setLoading(true)
    try {
      // Generar datos mockeados para las campañas seleccionadas
      const mockCampaigns = campaignIds.map(id => generateMockCampaign(id))
      setCampaigns(mockCampaigns)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const generateMockCampaign = (id: number) => {
    const names = [
      'Black Friday 2024',
      'Brand Awareness Q4',
      'Holiday Sales',
      'Product Launch X',
      'Remarketing Web'
    ]
    
    const name = names[(id - 1) % names.length]
    const baseSpend = 3000 + (id * 1000)
    
    return {
      id,
      name,
      spend: baseSpend + Math.random() * 2000,
      impressions: Math.floor((baseSpend * 1000) + Math.random() * 500000),
      clicks: Math.floor((baseSpend * 30) + Math.random() * 5000),
      conversions: Math.floor((baseSpend * 0.1) + Math.random() * 100),
      revenue: baseSpend * (2 + Math.random() * 2),
      ctr: 2 + Math.random() * 3,
      cpc: 0.5 + Math.random() * 0.5,
      roas: 1.5 + Math.random() * 2.5,
      status: id % 2 === 0 ? 'ACTIVE' : 'PAUSED'
    }
  }

  // Preparar datos para gráficos
  const prepareBarChartData = () => {
    return campaigns.map(campaign => ({
      name: campaign.name.substring(0, 15) + '...',
      Gasto: campaign.spend,
      Ingresos: campaign.revenue,
      ROAS: campaign.roas
    }))
  }

  const prepareRadarData = () => {
    const metrics = ['CTR', 'CPC', 'ROAS', 'Conv Rate', 'Efficiency']
    return metrics.map(metric => {
      const data: any = { metric }
      campaigns.forEach(campaign => {
        switch (metric) {
          case 'CTR':
            data[campaign.name] = (campaign.ctr / 5) * 100 // Normalizado a 100
            break
          case 'CPC':
            data[campaign.name] = ((1 - campaign.cpc) / 1) * 100 // Inverso y normalizado
            break
          case 'ROAS':
            data[campaign.name] = (campaign.roas / 5) * 100 // Normalizado a 100
            break
          case 'Conv Rate':
            data[campaign.name] = ((campaign.conversions / campaign.clicks) * 100 / 10) * 100
            break
          case 'Efficiency':
            data[campaign.name] = ((campaign.revenue / campaign.spend) / 5) * 100
            break
        }
      })
      return data
    })
  }

  const getMetricWinner = (metric: string) => {
    let winner = campaigns[0]
    let maxValue = 0

    campaigns.forEach(campaign => {
      let value = 0
      switch (metric) {
        case 'spend':
          value = -campaign.spend // Menor es mejor
          break
        case 'impressions':
          value = campaign.impressions
          break
        case 'clicks':
          value = campaign.clicks
          break
        case 'conversions':
          value = campaign.conversions
          break
        case 'revenue':
          value = campaign.revenue
          break
        case 'ctr':
          value = campaign.ctr
          break
        case 'cpc':
          value = -campaign.cpc // Menor es mejor
          break
        case 'roas':
          value = campaign.roas
          break
      }
      
      if (value > maxValue) {
        maxValue = value
        winner = campaign
      }
    })

    return winner.id
  }

  if (!isAuthenticated) return null

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/campaigns"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comparación de Campañas</h1>
            <p className="text-sm text-gray-500">Comparando {campaigns.length} campañas</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No hay campañas para comparar</p>
            <Link
              href="/campaigns"
              className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-800"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Volver a campañas
            </Link>
          </div>
        ) : (
          <>
            {/* Tabla de comparación */}
            <div className="card overflow-hidden">
              <h2 className="text-lg font-semibold mb-4">Métricas principales</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Métrica
                      </th>
                      {campaigns.map((campaign, index) => (
                        <th
                          key={campaign.id}
                          className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            {campaign.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[
                      { key: 'spend', label: 'Gasto', format: formatCurrency },
                      { key: 'impressions', label: 'Impresiones', format: formatNumber },
                      { key: 'clicks', label: 'Clics', format: formatNumber },
                      { key: 'conversions', label: 'Conversiones', format: formatNumber },
                      { key: 'revenue', label: 'Ingresos', format: formatCurrency },
                      { key: 'ctr', label: 'CTR', format: (v: number) => formatPercentage(v) },
                      { key: 'cpc', label: 'CPC', format: formatCurrency },
                      { key: 'roas', label: 'ROAS', format: (v: number) => `${v.toFixed(2)}x` }
                    ].map(metric => {
                      const winnerId = getMetricWinner(metric.key)
                      return (
                        <tr key={metric.key}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {metric.label}
                          </td>
                          {campaigns.map(campaign => (
                            <td
                              key={campaign.id}
                              className={`px-4 py-3 text-sm text-center ${
                                campaign.id === winnerId
                                  ? 'font-semibold text-green-600 bg-green-50'
                                  : 'text-gray-900'
                              }`}
                            >
                              {metric.format(campaign[metric.key])}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráfico de barras */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Gasto vs Ingresos</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prepareBarChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Gasto" fill="#3b82f6" />
                  <Bar yAxisId="left" dataKey="Ingresos" fill="#10b981" />
                  <Bar yAxisId="right" dataKey="ROAS" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico radar */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Comparación de rendimiento</h2>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={prepareRadarData()}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  {campaigns.map((campaign, index) => (
                    <Radar
                      key={campaign.id}
                      name={campaign.name}
                      dataKey={campaign.name}
                      stroke={colors[index % colors.length]}
                      fill={colors[index % colors.length]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Resumen y recomendaciones */}
            <div className="card bg-blue-50 border-blue-200">
              <h2 className="text-lg font-semibold mb-4 text-blue-900">
                Recomendaciones basadas en la comparación
              </h2>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  La campaña con mejor ROAS es <strong>{campaigns.reduce((prev, current) => (prev.roas > current.roas) ? prev : current).name}</strong>.
                  Considera aumentar su presupuesto.
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  La campaña <strong>{campaigns.reduce((prev, current) => (prev.cpc > current.cpc) ? prev : current).name}</strong> tiene
                  el CPC más alto. Revisa la segmentación y creatividades.
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Hay una diferencia de {formatPercentage(
                    ((Math.max(...campaigns.map(c => c.ctr)) - Math.min(...campaigns.map(c => c.ctr))) / Math.min(...campaigns.map(c => c.ctr))) * 100
                  )} en CTR entre las campañas. Analiza qué hace diferente la de mejor rendimiento.
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}