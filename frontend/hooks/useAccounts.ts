import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export interface Account {
  id: number
  name: string
  facebook_id: string
  currency: string
  timezone: string
  status: string
}

export function useAccounts() {
  const { token, user } = useAuthStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !user) {
      setLoading(false)
      return
    }

    const fetchAccounts = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/accounts`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setAccounts(response.data.accounts)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching accounts:', err)
        setError(err.response?.data?.error || 'Error al cargar las cuentas')
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [token, user])

  return { accounts, loading, error }
}