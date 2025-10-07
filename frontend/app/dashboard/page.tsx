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
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)

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
  }, [selectedAccount, token])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const data = await metricsService.getDashboardMetrics(
        selectedAccount!,
        token!
      )
      setMetrics(data)
    } catch (error) {
      toast.error('Error al cargar las métricas')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {user && user.account_ids.length > 1 && (
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {user.account_ids.map((id) => (
                <option key={id} value={id}>
                  Cuenta {id}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : metrics ? (
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
          <div className="text-center py-12">
            <p className="text-gray-500">No hay datos disponibles</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}