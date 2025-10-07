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

interface ChartData {
  date: string
  spend: number
  conversions: number
  revenue: number
}

interface CampaignChartProps {
  data: ChartData[]
}

export default function CampaignChart({ data }: CampaignChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: format(new Date(item.date), 'dd MMM'),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="spend"
          stroke="#3b82f6"
          name="Gasto"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="conversions"
          stroke="#10b981"
          name="Conversiones"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}