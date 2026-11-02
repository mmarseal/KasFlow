/**
 * Canonical Local Calendar Date Utilities for KasFlow
 *
 * All functions operate strictly on local calendar components (year, month, date)
 * to avoid UTC offset discrepancies (e.g. UTC-midnight vs WIB early morning).
 */

/**
 * Format a Date instance into YYYY-MM-DD in the local calendar.
 * @param {Date} [d=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function formatLocalDate(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getJakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]))
}

export function formatJakartaDate(date = new Date()) {
  const { year, month, day } = getJakartaDateParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getJakartaDateDaysAgo(days, baseDate = new Date()) {
  const { year, month, day } = getJakartaDateParts(baseDate)
  const shifted = new Date(year, month - 1, day - days)
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`
}

export function getJakartaStartOfMonth(baseDate = new Date()) {
  const { year, month } = getJakartaDateParts(baseDate)
  return `${year}-${String(month).padStart(2, '0')}-01`
}

/**
 * Get a date N calendar months before the Jakarta calendar date of baseDate.
 * If the target month is shorter, clamp to its final day (for example, May 31
 * minus three months is February 28 or 29).
 * @param {number} months
 * @param {Date} [baseDate=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function getJakartaDateMonthsAgo(months, baseDate = new Date()) {
  const { year, month, day } = getJakartaDateParts(baseDate)
  const targetMonthDate = new Date(year, month - 1 - months, 1)
  const targetYear = targetMonthDate.getFullYear()
  const targetMonth = targetMonthDate.getMonth()
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDayOfTargetMonth)).padStart(2, '0')}`
}

/**
 * Build the inclusive date range used by the Dashboard in Asia/Jakarta.
 * @param {'7days' | 'month' | '3months'} period
 * @param {Date} [baseDate=new Date()]
 * @returns {{start: string, end: string}}
 */
export function getJakartaDashboardDateRange(period, baseDate = new Date()) {
  const end = formatJakartaDate(baseDate)
  if (period === '7days') return { start: getJakartaDateDaysAgo(6, baseDate), end }
  if (period === 'month') return { start: getJakartaStartOfMonth(baseDate), end }
  if (period === '3months') return { start: getJakartaDateMonthsAgo(3, baseDate), end }
  return { start: end, end }
}

/** Generate every inclusive Jakarta calendar date between YYYY-MM-DD values. */
export function getJakartaDateRangeDays(start, end) {
  const dates = []
  const [startYear, startMonth, startDay] = start.split('-').map(Number)
  const [endYear, endMonth, endDay] = end.split('-').map(Number)
  const cursor = new Date(startYear, startMonth - 1, startDay)
  const finalDate = new Date(endYear, endMonth - 1, endDay)
  while (cursor <= finalDate) {
    dates.push(formatLocalDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/**
 * Get a local calendar date string offset by a number of days.
 * @param {number} days - Number of days to subtract (positive for past, negative for future)
 * @param {Date} [baseDate=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateDaysAgo(days, baseDate = new Date()) {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - days)
  return formatLocalDate(d)
}

/**
 * Get the first day of the current month in YYYY-MM-DD.
 * @param {Date} [baseDate=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function getStartOfMonth(baseDate = new Date()) {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  return formatLocalDate(d)
}

/**
 * Generate an array of consecutive local dates for the past N days ending on baseDate.
 * E.g. count=7 returns [6-days-ago, ..., today].
 * @param {number} [count=7]
 * @param {Date} [baseDate=new Date()]
 * @returns {string[]}
 */
export function getPastDaysArray(count = 7, baseDate = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    return getLocalDateDaysAgo(count - 1 - i, baseDate)
  })
}

/**
 * Safely parse a YYYY-MM-DD string into a local Date instance at midnight (00:00:00).
 * Prevents ECMAScript UTC-parsing quirk of ISO date-only strings.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date()
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}
