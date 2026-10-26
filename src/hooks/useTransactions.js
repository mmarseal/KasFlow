import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import { formatJakartaDate, getJakartaDateDaysAgo, getJakartaStartOfMonth } from '../utils/dateUtils'

function getDateRange(range) {
  const today = formatJakartaDate()

  if (range === 'today') return { start: today, end: today }

  if (range === '7days' || range === 'week') {
    return { start: getJakartaDateDaysAgo(6), end: today }
  }

  if (range === 'month') {
    return { start: getJakartaStartOfMonth(), end: today }
  }

  return { start: today, end: today }
}

/**
 * Hook untuk fetch dan manage data transaksi
 * @param {'today' | 'week' | 'month' | '7days' | 'recent'} range - periode data
 */
export function useTransactions(range = 'today') {
  const { business } = useAuth()
  const businessId = business?.id ?? null
  const [refreshToken, setRefreshToken] = useState(0)
  const [result, setResult] = useState({ key: null, transactions: [], error: null })

  const key = JSON.stringify([businessId, range, refreshToken])

  useEffect(() => {
    if (!businessId) return undefined

    let active = true
    const isRecent = range === 'recent'
    const { start, end } = getDateRange(range)

    async function loadTransactions() {
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('business_id', businessId)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })

        if (!isRecent) query = query.gte('transaction_date', start).lte('transaction_date', end)
        if (isRecent) query = query.limit(4)

        const { data, error } = await query

        if (!active) return
        setResult({
          key,
          transactions: error ? [] : (data || []),
          error: error?.message ?? null,
        })
      } catch (error) {
        if (!active) return
        setResult({ key, transactions: [], error: error.message || 'Gagal memuat transaksi.' })
      }
    }

    loadTransactions()
    return () => { active = false }
  }, [businessId, key, range])

  const currentResult = businessId && result.key === key ? result : null
  const transactions = currentResult?.transactions ?? []
  const loading = Boolean(businessId) && !currentResult
  const error = currentResult?.error ?? null

  const summary = {
    totalIncome: transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    totalExpense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    get selisihBersih() { return this.totalIncome - this.totalExpense }
  }

  return {
    transactions,
    loading,
    error,
    summary,
    refetch: () => setRefreshToken((token) => token + 1),
  }
}
