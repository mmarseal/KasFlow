import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateTransactionsByBuckets,
  filterTransactionsByDateRange,
  summarizeFinancialTransactions,
} from '../src/utils/dashboardAnalytics.js'

describe('Dashboard period transaction aggregation', () => {
  const transactions = [
    { id: 'before', transaction_date: '2026-07-22', type: 'income', amount: 100 },
    { id: 'start', transaction_date: '2026-07-23', type: 'income', amount: 200 },
    { id: 'middle', transaction_date: '2026-08-01', type: 'expense', amount: 50 },
    { id: 'end', transaction_date: '2026-10-23', type: 'income', amount: 300 },
    { id: 'after', transaction_date: '2026-10-24', type: 'expense', amount: 700 },
    { id: 'menu-sale', transaction_date: '2026-08-01', type: 'menu_sales', amount: 999 },
  ]

  test('filters inclusively at both boundaries and excludes out-of-range rows', () => {
    const filtered = filterTransactionsByDateRange(transactions, '2026-07-23', '2026-10-23')
    assert.deepEqual(filtered.map(({ id }) => id), ['start', 'middle', 'end', 'menu-sale'])
    assert.deepEqual(summarizeFinancialTransactions(filtered), { income: 500, expense: 50 })
  })

  test('chart buckets sum to the same income and expense totals as the filtered period', () => {
    const filtered = filterTransactionsByDateRange(transactions, '2026-07-23', '2026-10-23')
    const buckets = aggregateTransactionsByBuckets(filtered, [
      { start: '2026-07-23', end: '2026-08-01' },
      { start: '2026-08-02', end: '2026-10-23' },
    ])
    assert.deepEqual(buckets.map(({ income, expense }) => ({ income, expense })), [
      { income: 200, expense: 50 },
      { income: 300, expense: 0 },
    ])
    assert.deepEqual(
      buckets.reduce((sum, bucket) => ({ income: sum.income + bucket.income, expense: sum.expense + bucket.expense }), { income: 0, expense: 0 }),
      summarizeFinancialTransactions(filtered),
    )
  })

  test('empty date ranges produce zero financial totals and empty chart buckets', () => {
    const filtered = filterTransactionsByDateRange(transactions, '2026-11-01', '2026-11-30')
    assert.deepEqual(filtered, [])
    assert.deepEqual(summarizeFinancialTransactions(filtered), { income: 0, expense: 0 })
    assert.deepEqual(aggregateTransactionsByBuckets(filtered, [{ start: '2026-11-01', end: '2026-11-30' }]), [
      { start: '2026-11-01', end: '2026-11-30', income: 0, expense: 0 },
    ])
  })
})
