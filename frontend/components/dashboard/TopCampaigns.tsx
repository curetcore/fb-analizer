import { formatCurrency, formatNumber } from '@/lib/utils/formatters'

interface Campaign {
  id: number
  name: string
  roas: number
  spend: number
  revenue: number
  status?: string
  impressions?: number
  clicks?: number
}

interface TopCampaignsProps {
  campaigns: Campaign[]
}

export default function TopCampaigns({ campaigns }: TopCampaignsProps) {
  // Encuentra el máximo ROAS para escalar las barras
  const maxRoas = Math.max(...campaigns.map(c => c.roas || 0))
  
  // Función para determinar el color según el ROAS
  const getRoasColor = (roas: number) => {
    if (roas >= 3) return 'bg-green-500'
    if (roas >= 2) return 'bg-yellow-500'
    if (roas >= 1) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-4">
      {campaigns.slice(0, 5).map((campaign, index) => (
        <div key={campaign.id} className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">#{index + 1}</span>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {campaign.name}
                </p>
                {campaign.status && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      campaign.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {campaign.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span>Gasto: {formatCurrency(campaign.spend)}</span>
                <span>•</span>
                <span>Ingresos: {formatCurrency(campaign.revenue)}</span>
                {campaign.impressions && (
                  <>
                    <span>•</span>
                    <span>{formatNumber(campaign.impressions)} imp</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right ml-4">
              <p className={`text-lg font-bold ${
                campaign.roas >= 2 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {campaign.roas?.toFixed(2) || '0.00'}x
              </p>
              <p className="text-xs text-gray-500">ROAS</p>
            </div>
          </div>
          
          {/* Barra de progreso del ROAS */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getRoasColor(campaign.roas || 0)}`}
              style={{ width: `${Math.min((campaign.roas / maxRoas) * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
      
      {campaigns.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No hay campañas activas</p>
        </div>
      )}
    </div>
  )
}