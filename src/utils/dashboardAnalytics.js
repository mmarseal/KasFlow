export function filterTransactionsByDateRange(transactions, start, end) {
  return transactions.filter((transaction) => transaction.transaction_date >= start && transaction.transaction_date <= end)
}

export function summarizeFinancialTransactions(transactions) {
  return transactions.reduce((totals, transaction) => {
    const amount = Number(transaction.amount || 0)
    if (transaction.type === 'income') totals.income += amount
    if (transaction.type === 'expense') totals.expense += amount
    return totals
  }, { income: 0, expense: 0 })
}

export function aggregateTransactionsByBuckets(transactions, buckets) {
  return buckets.map(({ start, end }) => {
    const totals = summarizeFinancialTransactions(filterTransactionsByDateRange(transactions, start, end))
    return { start, end, ...totals }
  })
}
