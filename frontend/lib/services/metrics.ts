import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const metricsService = {
  async getDashboardMetrics(accountId: number, token: string) {
    const response = await axios.get(`${API_URL}/api/metrics/dashboard`, {
      params: { accountId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async getCampaignMetrics(campaignId: number, token: string, dateRange?: { start: string; end: string }) {
    const response = await axios.get(`${API_URL}/api/metrics/campaigns/${campaignId}`, {
      params: dateRange,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async getHourlyMetrics(accountId: number, token: string) {
    const response = await axios.get(`${API_URL}/api/metrics/hourly`, {
      params: { accountId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async compareCampaigns(campaignIds: number[], token: string, dateRange?: { start: string; end: string }) {
    const response = await axios.post(
      `${API_URL}/api/metrics/compare`,
      { campaignIds, ...dateRange },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  },
}