import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export interface GenerateReportData {
  name: string
  type: 'performance' | 'campaigns' | 'audience' | 'creative' | 'custom'
  format: 'pdf' | 'csv' | 'excel'
  dateRange: {
    start: string
    end: string
  }
  filters?: {
    account_ids?: number[]
    campaign_ids?: number[]
    status?: string[]
  }
  metrics?: string[]
  groupBy?: string[]
  schedule?: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly'
    day?: number
    hour?: number
  }
}

export const reportService = {
  async getReports(token: string) {
    const response = await axios.get(`${API_URL}/api/reports`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async generateReport(data: GenerateReportData, token: string) {
    const response = await axios.post(`${API_URL}/api/reports/generate`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async downloadReport(reportId: number, token: string) {
    const response = await axios.get(`${API_URL}/api/reports/${reportId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob',
    })
    return response.data
  },

  async deleteReport(reportId: number, token: string) {
    const response = await axios.delete(`${API_URL}/api/reports/${reportId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async getReportStatus(reportId: number, token: string) {
    const response = await axios.get(`${API_URL}/api/reports/${reportId}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async scheduleReport(data: GenerateReportData, token: string) {
    const response = await axios.post(`${API_URL}/api/reports/schedule`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async getScheduledReports(token: string) {
    const response = await axios.get(`${API_URL}/api/reports/scheduled`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async updateSchedule(reportId: number, schedule: any, token: string) {
    const response = await axios.put(
      `${API_URL}/api/reports/${reportId}/schedule`,
      schedule,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  },

  async cancelSchedule(reportId: number, token: string) {
    const response = await axios.delete(`${API_URL}/api/reports/${reportId}/schedule`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  // Funciones helper para descargar archivos
  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  // Obtener métricas disponibles por tipo de reporte
  getAvailableMetrics(reportType: string) {
    const metricsMap: { [key: string]: string[] } = {
      performance: [
        'impressions',
        'clicks',
        'ctr',
        'cpc',
        'spend',
        'conversions',
        'conversion_rate',
        'cpa',
        'roas',
        'revenue'
      ],
      campaigns: [
        'campaign_name',
        'status',
        'objective',
        'impressions',
        'clicks',
        'spend',
        'conversions',
        'roas'
      ],
      audience: [
        'age',
        'gender',
        'location',
        'impressions',
        'clicks',
        'conversions',
        'spend'
      ],
      creative: [
        'ad_name',
        'ad_format',
        'impressions',
        'clicks',
        'ctr',
        'engagement_rate',
        'video_views'
      ],
      custom: [
        // Todas las métricas disponibles
        'impressions',
        'clicks',
        'ctr',
        'cpc',
        'cpm',
        'spend',
        'conversions',
        'conversion_rate',
        'cpa',
        'roas',
        'revenue',
        'reach',
        'frequency',
        'engagement_rate'
      ]
    }
    
    return metricsMap[reportType] || metricsMap.custom
  },
}