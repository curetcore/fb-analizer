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
      if (user && user.account_ids.length > 0 && token) {
        const data = await campaignService.getCampaigns(user.account_ids[0], token)
        setCampaigns(data.campaigns || [])
      }
    } catch (error: any) {
      console.error('Error al cargar campañas:', error)
      toast.error(error.response?.data?.error || 'Error al cargar las campañas')
    } finally {
      setLoading(false)
    }
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
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay campañas</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {campaigns.length === 0 
                    ? 'No se han sincronizado campañas de Facebook Ads todavía.'
                    : 'No se encontraron campañas con los filtros aplicados.'}
                </p>
                {campaigns.length === 0 && (
                  <div className="mt-6">
                    <Link
                      href="/settings"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      Ir a Configuración
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}