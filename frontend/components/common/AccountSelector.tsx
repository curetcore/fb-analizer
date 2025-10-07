import React from 'react'
import { useAccounts } from '@/hooks/useAccounts'

interface AccountSelectorProps {
  selectedAccount: number | null
  onAccountChange: (accountId: number) => void
  accountIds: number[]
  className?: string
}

export default function AccountSelector({ 
  selectedAccount, 
  onAccountChange, 
  accountIds,
  className = ""
}: AccountSelectorProps) {
  const { accounts, loading } = useAccounts()

  // Filtrar solo las cuentas a las que el usuario tiene acceso
  const availableAccounts = accounts.filter(acc => accountIds.includes(acc.id))

  if (loading) {
    return (
      <div className={`px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 ${className}`}>
        <span className="text-gray-500">Cargando cuentas...</span>
      </div>
    )
  }

  return (
    <select
      value={selectedAccount || ''}
      onChange={(e) => onAccountChange(Number(e.target.value))}
      className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
    >
      {availableAccounts.length > 0 ? (
        availableAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.currency})
          </option>
        ))
      ) : (
        accountIds.map((id) => (
          <option key={id} value={id}>
            Cuenta {id}
          </option>
        ))
      )}
    </select>
  )
}