import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const authService = {
  async login(email: string, password: string) {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password,
    })
    return response.data
  },

  async register(email: string, password: string, name: string) {
    const response = await axios.post(`${API_URL}/api/auth/register`, {
      email,
      password,
      name,
    })
    return response.data
  },

  async logout(token: string) {
    const response = await axios.post(
      `${API_URL}/api/auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  },

  async getMe(token: string) {
    const response = await axios.get(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
}