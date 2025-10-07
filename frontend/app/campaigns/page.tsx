'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { campaignService } from '@/lib/services/campaigns'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { ChevronUpIcon, ChevronDownIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

type SortField = 'name' | 'spend' | 'impressions' | 'clicks' | 'conversions' | 'roas'
type SortOrder = 'asc' | 'desc'

export default function CampaignsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('spend')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedCampaigns, setSelectedCampaigns] = useState<number[]>([])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (user && token) {
      fetchCampaigns()
    }
  }, [user, token])

  useEffect(() => {
    filterAndSortCampaigns()
  }, [campaigns, searchTerm, statusFilter, sortField, sortOrder])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      // Por ahora usamos datos mockeados
      const mockCampaigns = generateMockCampaigns()
      setCampaigns(mockCampaigns)
    } catch (error) {
      toast.error('Error al cargar las campañas')
    } finally {
      setLoading(false)
    }
  }

  const generateMockCampaigns = () => {
    const campaignTypes = [
      { name: 'Black Friday 2024', objective: 'CONVERSIONS', budget: 5000 },
      { name: 'Brand Awareness Q4', objective: 'BRAND_AWARENESS', budget: 3000 },
      { name: 'Holiday Sales', objective: 'CONVERSIONS', budget: 8000 },
      { name: 'Product Launch X', objective: 'TRAFFIC', budget: 4000 },
      { name: 'Remarketing Web', objective: 'CONVERSIONS', budget: 2500 },
      { name: 'Lead Generation B2B', objective: 'LEAD_GENERATION', budget: 6000 },
      { name: 'Summer Collection', objective: 'CATALOG_SALES', budget: 4500 },
      { name: 'App Install Campaign', objective: 'APP_INSTALLS', budget: 3500 },
      { name: 'Video Views Brand', objective: 'VIDEO_VIEWS', budget: 2000 },
      { name: 'Customer Retention', objective: 'CONVERSIONS', budget: 3000 }
    ]

    return campaignTypes.map((campaign, index) => {
      const spend = campaign.budget * (0.6 + Math.random() * 0.4)
      const impressions = Math.floor(spend * (800 + Math.random() * 400))
      const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.04))
      const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.08))
      const revenue = conversions * (20 + Math.random() * 80)

      return {
        id: index + 1,
        name: campaign.name,
        status: index < 7 ? 'ACTIVE' : 'PAUSED',
        objective: campaign.objective,
        budget_daily: campaign.budget / 30,
        spend,
        impressions,
        clicks,
        conversions,
        revenue,
        ctr: (clicks / impressions * 100),
        cpc: spend / clicks,
        roas: revenue / spend,
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      }
    })
  }

  const filterAndSortCampaigns = () => {
    let filtered = [...campaigns]

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.objective.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter)
    }

    // Ordenar
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredCampaigns(filtered)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const toggleCampaignSelection = (campaignId: number) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    )
  }

  const selectAllCampaigns = () => {
    if (selectedCampaigns.length === filteredCampaigns.length) {
      setSelectedCampaigns([])
    } else {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id))
    }
  }

  const getObjectiveColor = (objective: string) => {
    const colors: { [key: string]: string } = {
      CONVERSIONS: 'bg-green-100 text-green-800',
      TRAFFIC: 'bg-blue-100 text-blue-800',
      BRAND_AWARENESS: 'bg-purple-100 text-purple-800',
      LEAD_GENERATION: 'bg-yellow-100 text-yellow-800',
      CATALOG_SALES: 'bg-indigo-100 text-indigo-800',
      APP_INSTALLS: 'bg-pink-100 text-pink-800',
      VIDEO_VIEWS: 'bg-orange-100 text-orange-800'
    }
    return colors[objective] || 'bg-gray-100 text-gray-800'
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? 
      <ChevronUpIcon className="w-4 h-4" /> : 
      <ChevronDownIcon className="w-4 h-4" />
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <div className="flex gap-4">
            <Link
              href="/campaigns/new"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Nueva Campaña
            </Link>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o objetivo..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los estados</option>
              <option value="ACTIVE">Activas</option>
              <option value="PAUSED">Pausadas</option>
            </select>

            {/* Acciones en masa */}
            {selectedCampaigns.length > 0 && (
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Activar ({selectedCampaigns.length})
                </button>
                <button className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Pausar ({selectedCampaigns.length})
                </button>
                <Link
                  href={`/campaigns/compare?ids=${selectedCampaigns.join(',')}`}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Comparar
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Resumen de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card bg-gray-50">
            <p className="text-sm text-gray-600">Total Campañas</p>
            <p className="text-2xl font-bold">{filteredCampaigns.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {filteredCampaigns.filter(c => c.status === 'ACTIVE').length} activas
            </p>
          </div>
          <div className="card bg-blue-50">
            <p className="text-sm text-gray-600">Gasto Total</p>
            <p className="text-2xl font-bold">
              {formatCurrency(filteredCampaigns.reduce((sum, c) => sum + c.spend, 0))}
            </p>
          </div>
          <div className="card bg-green-50">
            <p className="text-sm text-gray-600">Conversiones</p>
            <p className="text-2xl font-bold">
              {formatNumber(filteredCampaigns.reduce((sum, c) => sum + c.conversions, 0))}
            </p>
          </div>
          <div className="card bg-purple-50">
            <p className="text-sm text-gray-600">CTR Promedio</p>
            <p className="text-2xl font-bold">
              {formatPercentage(
                filteredCampaigns.reduce((sum, c) => sum + c.ctr, 0) / filteredCampaigns.length || 0
              )}
            </p>
          </div>
          <div className="card bg-yellow-50">
            <p className="text-sm text-gray-600">ROAS Promedio</p>
            <p className="text-2xl font-bold">
              {(filteredCampaigns.reduce((sum, c) => sum + c.roas, 0) / filteredCampaigns.length || 0).toFixed(2)}x
            </p>
          </div>
        </div>

        {/* Tabla de campañas */}
        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                        onChange={selectAllCampaigns}
                        className="rounded"
                      />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Campaña
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Objetivo
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('spend')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Gasto
                        <SortIcon field="spend" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('impressions')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Impresiones
                        <SortIcon field="impressions" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('clicks')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Clics
                        <SortIcon field="clicks" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('conversions')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Conv.
                        <SortIcon field="conversions" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('roas')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        ROAS
                        <SortIcon field="roas" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCampaigns.includes(campaign.id)}
                          onChange={() => toggleCampaignSelection(campaign.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800"
                        >
                          {campaign.name}
                        </Link>
                        <p className="text-xs text-gray-500">
                          Presupuesto: {formatCurrency(campaign.budget_daily)}/día
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            campaign.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {campaign.status === 'ACTIVE' ? 'Activa' : 'Pausada'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getObjectiveColor(campaign.objective)}`}>
                          {campaign.objective.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {formatCurrency(campaign.spend)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {formatNumber(campaign.impressions)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {formatNumber(campaign.clicks)}
                        <span className="text-xs text-gray-500 block">
                          {formatPercentage(campaign.ctr)} CTR
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {formatNumber(campaign.conversions)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        <span className={`font-semibold ${campaign.roas >= 2 ? 'text-green-600' : 'text-orange-600'}`}>
                          {campaign.roas.toFixed(2)}x
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/campaigns/${campaign.id}/edit`}
                            className="text-gray-600 hover:text-primary-600"
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => toast.success('Próximamente: Duplicar campaña')}
                            className="text-gray-600 hover:text-primary-600"
                          >
                            Duplicar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCampaigns.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron campañas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}