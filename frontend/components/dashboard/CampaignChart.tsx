import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency, formatNumber } from '@/lib/utils/formatters'

interface ChartData {
  date: string
  spend: number
  conversions: number
  revenue: number
  roas?: number
}

interface CampaignChartProps {
  data: ChartData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-md">
        <p className="text-sm font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-sm">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-medium">
              {entry.name === 'Gasto' || entry.name === 'Ingresos' 
                ? formatCurrency(entry.value)
                : entry.name === 'ROAS'
                ? `${entry.value?.toFixed(2)}x`
                : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function CampaignChart({ data }: CampaignChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: format(new Date(item.date), 'dd MMM'),
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          yAxisId="left"
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="spend"
          stroke="#3b82f6"
          name="Gasto"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="#8b5cf6"
          name="Ingresos"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="conversions"
          stroke="#10b981"
          name="Conversiones"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="roas"
          stroke="#f59e0b"
          name="ROAS"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}