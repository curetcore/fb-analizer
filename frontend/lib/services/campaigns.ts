import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const campaignService = {
  async getCampaigns(accountId: number, token: string) {
    const response = await axios.get(`${API_URL}/api/campaigns`, {
      params: { accountId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async getCampaign(campaignId: number, token: string) {
    const response = await axios.get(`${API_URL}/api/campaigns/${campaignId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async createCampaign(data: any, token: string) {
    const response = await axios.post(`${API_URL}/api/campaigns`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async updateCampaign(campaignId: number, data: any, token: string) {
    const response = await axios.put(`${API_URL}/api/campaigns/${campaignId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async updateCampaignStatus(campaignId: number, status: string, token: string) {
    const response = await axios.patch(
      `${API_URL}/api/campaigns/${campaignId}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  },

  async deleteCampaign(campaignId: number, token: string) {
    const response = await axios.delete(`${API_URL}/api/campaigns/${campaignId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async duplicateCampaign(campaignId: number, token: string) {
    const response = await axios.post(
      `${API_URL}/api/campaigns/${campaignId}/duplicate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  },
}