import { formatCurrency } from '@/lib/utils/formatters'

interface Campaign {
  id: number
  name: string
  roas: number
  spend: number
  revenue: number
}

interface TopCampaignsProps {
  campaigns: Campaign[]
}

export default function TopCampaigns({ campaigns }: TopCampaignsProps) {
  return (
    <div className="space-y-4">
      {campaigns.slice(0, 5).map((campaign) => (
        <div key={campaign.id} className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {campaign.name}
            </p>
            <p className="text-sm text-gray-500">
              Gasto: {formatCurrency(campaign.spend)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-primary-600">
              {campaign.roas.toFixed(2)}x
            </p>
            <p className="text-xs text-gray-500">ROAS</p>
          </div>
        </div>
      ))}
    </div>
  )
}