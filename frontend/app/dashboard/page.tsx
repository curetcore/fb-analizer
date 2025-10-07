'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import MetricCard from '@/components/dashboard/MetricCard'
import CampaignChart from '@/components/dashboard/CampaignChart'
import TopCampaigns from '@/components/dashboard/TopCampaigns'
import { metricsService } from '@/lib/services/metrics'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/formatters'
import { useAccounts } from '@/hooks/useAccounts'
import AccountSelector from '@/components/common/AccountSelector'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (user && user.account_ids.length > 0 && !selectedAccount) {
      setSelectedAccount(user.account_ids[0])
    }
  }, [user, selectedAccount])

  useEffect(() => {
    if (selectedAccount && token) {
      fetchDashboardData()
    }
  }, [selectedAccount, token, dateRange])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const data = await metricsService.getDashboardMetrics(
        selectedAccount!,
        token!,
        dateRange.startDate,
        dateRange.endDate
      )
      setMetrics(data)
    } catch (error: any) {
      console.error('Error al cargar métricas:', error)
      const errorMsg = error.response?.data?.error || 'Error al cargar las métricas'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex flex-wrap gap-4">
            {/* Selector de fechas */}
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
            {/* Selector de cuenta */}
            {user && user.account_ids.length > 1 && (
              <AccountSelector
                selectedAccount={selectedAccount}
                onAccountChange={setSelectedAccount}
                accountIds={user.account_ids}
              />
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : metrics && metrics.summary && metrics.summary.total_campaigns > 0 ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Gasto Total"
                value={formatCurrency(metrics.summary.total_spend)}
                change="+12.5%"
                trend="up"
              />
              <MetricCard
                title="Impresiones"
                value={formatNumber(metrics.summary.total_impressions)}
                change="+8.2%"
                trend="up"
              />
              <MetricCard
                title="CTR Promedio"
                value={formatPercentage(metrics.summary.avg_ctr)}
                change="-2.1%"
                trend="down"
              />
              <MetricCard
                title="ROAS"
                value={metrics.summary.avg_roas?.toFixed(2) || '0'}
                change="+15.3%"
                trend="up"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">
                  Tendencia de Gasto y Conversiones
                </h2>
                <CampaignChart data={metrics.trend} />
              </div>
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">
                  Top Campañas por ROAS
                </h2>
                <TopCampaigns campaigns={metrics.topCampaigns} />
              </div>
            </div>

            {/* Campaign Table */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">
                Todas las Campañas
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Campaña</th>
                      <th className="text-left py-2 px-4">Estado</th>
                      <th className="text-right py-2 px-4">Gasto</th>
                      <th className="text-right py-2 px-4">Impresiones</th>
                      <th className="text-right py-2 px-4">CTR</th>
                      <th className="text-right py-2 px-4">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.topCampaigns.map((campaign: any) => (
                      <tr key={campaign.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{campaign.name}</td>
                        <td className="py-2 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              campaign.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {campaign.status}
                          </span>
                        </td>
                        <td className="text-right py-2 px-4">
                          {formatCurrency(campaign.spend)}
                        </td>
                        <td className="text-right py-2 px-4">
                          {formatNumber(campaign.impressions)}
                        </td>
                        <td className="text-right py-2 px-4">
                          {formatPercentage(campaign.ctr)}
                        </td>
                        <td className="text-right py-2 px-4">
                          {campaign.roas?.toFixed(2) || '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm p-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de campañas</h3>
            <p className="text-gray-500 mb-6">
              {metrics?.summary?.total_campaigns === 0 
                ? 'No se han sincronizado campañas de Facebook Ads todavía.'
                : 'No hay datos disponibles para el rango de fechas seleccionado.'}
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Ir a Configuración
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}