import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export interface AlertCondition {
  metric: string
  operator: string
  value: number
  timeframe?: string
}

export interface CreateAlertData {
  name: string
  type: string
  condition: AlertCondition
  campaign_id?: number
  account_id: number
  notification_channels: string[]
}

export interface UpdateAlertData {
  name?: string
  condition?: AlertCondition
  status?: string
  notification_channels?: string[]
}

export const alertService = {
  async getAlerts(token: string) {
    const response = await axios.get(`${API_URL}/api/alerts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async getAlert(alertId: number, token: string) {
    const response = await axios.get(`${API_URL}/api/alerts/${alertId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async createAlert(data: CreateAlertData, token: string) {
    const response = await axios.post(`${API_URL}/api/alerts`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async updateAlert(alertId: number, data: UpdateAlertData, token: string) {
    const response = await axios.put(`${API_URL}/api/alerts/${alertId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async deleteAlert(alertId: number, token: string) {
    const response = await axios.delete(`${API_URL}/api/alerts/${alertId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async toggleAlert(alertId: number, token: string) {
    const response = await axios.post(
      `${API_URL}/api/alerts/${alertId}/toggle`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  },

  async getAlertHistory(alertId: number, token: string) {
    const response = await axios.get(`${API_URL}/api/alerts/${alertId}/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async testAlert(alertId: number, token: string) {
    const response = await axios.post(
      `${API_URL}/api/alerts/${alertId}/test`,
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