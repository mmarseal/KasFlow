import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatLocalDate,
  getLocalDateDaysAgo,
  getStartOfMonth,
  getPastDaysArray,
  parseLocalDate,
  getJakartaDateMonthsAgo,
  getJakartaDashboardDateRange,
  getJakartaDateRangeDays,
} from '../src/utils/dateUtils.js'

describe('Canonical Local Calendar Date Utility Tests', () => {
  // Test 1: Local date at midnight
  test('1. Local date at midnight (00:00:00) returns current calendar date', () => {
    const midnight = new Date(2026, 9, 22, 0, 0, 0, 0) // Oct 22, 2026 00:00:00 local
    const formatted = formatLocalDate(midnight)
    assert.equal(formatted, '2026-10-22')
  })

  // Test 2: Local date between 00:00 and 06:59 (WIB early morning window)
  test('2. Local date between 00:00 and 06:59 returns correct local date (not previous day)', () => {
    const earlyMorning1 = new Date(2026, 9, 22, 1, 30, 0) // 01:30 AM
    const earlyMorning2 = new Date(2026, 9, 22, 4, 15, 0) // 04:15 AM
    const earlyMorning3 = new Date(2026, 9, 22, 6, 59, 59) // 06:59:59 AM

    assert.equal(formatLocalDate(earlyMorning1), '2026-10-22')
    assert.equal(formatLocalDate(earlyMorning2), '2026-10-22')
    assert.equal(formatLocalDate(earlyMorning3), '2026-10-22')
  })

  // Test 3: Local date after 07:00
  test('3. Local date after 07:00 returns correct local date', () => {
    const morning = new Date(2026, 9, 22, 7, 0, 0)
    const afternoon = new Date(2026, 9, 22, 14, 30, 0)
    const lateNight = new Date(2026, 9, 22, 23, 59, 59)

    assert.equal(formatLocalDate(morning), '2026-10-22')
    assert.equal(formatLocalDate(afternoon), '2026-10-22')
    assert.equal(formatLocalDate(lateNight), '2026-10-22')
  })

  // Test 4: Month and year rollover
  test('4. Month and year rollover are handled correctly', () => {
    // Year rollover: Jan 2 minus 3 days = Dec 30 of previous year
    const jan2 = new Date(2026, 0, 2)
    assert.equal(getLocalDateDaysAgo(3, jan2), '2025-12-30')

    // Month rollover (non-leap year): March 1 minus 1 day = Feb 28
    const march1NonLeap = new Date(2026, 2, 1)
    assert.equal(getLocalDateDaysAgo(1, march1NonLeap), '2026-02-28')

    // Month rollover (leap year 2024): March 1 minus 1 day = Feb 29
    const march1Leap = new Date(2024, 2, 1)
    assert.equal(getLocalDateDaysAgo(1, march1Leap), '2024-02-29')
  })

  // Test 5: Correct formatting of single-digit months and days (zero-padding)
  test('5. Single-digit months and days are zero-padded correctly', () => {
    const apr5 = new Date(2026, 3, 5) // Month 4, Day 5
    assert.equal(formatLocalDate(apr5), '2026-04-05')

    const sep9 = new Date(2026, 8, 9) // Month 9, Day 9
    assert.equal(formatLocalDate(sep9), '2026-09-09')

    const jan1 = new Date(2026, 0, 1) // Month 1, Day 1
    assert.equal(formatLocalDate(jan1), '2026-01-01')
  })

  // Test 6: Transaction form default date
  test('6. Form default date is valid YYYY-MM-DD matching today local date', () => {
    const defaultDate = formatLocalDate()
    assert.match(defaultDate, /^\d{4}-\d{2}-\d{2}$/)
    const [y, m, d] = defaultDate.split('-').map(Number)
    const now = new Date()
    assert.equal(y, now.getFullYear())
    assert.equal(m, now.getMonth() + 1)
    assert.equal(d, now.getDate())
  })

  // Test 7: Dashboard 7-day range generation and filtering
  test('7. Dashboard 7-day array generates 7 consecutive calendar dates', () => {
    const baseDate = new Date(2026, 9, 22)
    const days = getPastDaysArray(7, baseDate)

    assert.equal(days.length, 7)
    assert.deepEqual(days, [
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ])

    // Verify today's date matches last element
    assert.equal(days[days.length - 1], '2026-10-22')
    // Verify start date matches first element
    assert.equal(days[0], '2026-10-16')
  })

  // Test 8: Daily menu-sales date and range
  test('8. Menu-sales date matches local date and week range spans 7 days', () => {
    const baseDate = new Date(2026, 9, 22, 2, 0, 0) // 02:00 WIB
    const saleDate = formatLocalDate(baseDate)
    assert.equal(saleDate, '2026-10-22')

    const weekStart = getLocalDateDaysAgo(6, baseDate)
    assert.equal(weekStart, '2026-10-16')
  })

  // Test 9: Month start regression test (eliminates UTC-shift to previous month)
  test('9. getStartOfMonth returns 1st day of month without shifting to previous month', () => {
    const midMonth = new Date(2026, 9, 22, 3, 0, 0) // Oct 22
    const startOfMonth = getStartOfMonth(midMonth)
    assert.equal(startOfMonth, '2026-10-01')

    const janEnd = new Date(2026, 0, 31)
    assert.equal(getStartOfMonth(janEnd), '2026-01-01')
  })

  // Test 10: parseLocalDate parses YYYY-MM-DD cleanly at local midnight
  test('10. parseLocalDate parses YYYY-MM-DD into local Date at 00:00:00 without UTC shifting', () => {
    const d = parseLocalDate('2026-10-22')
    assert.equal(d.getFullYear(), 2026)
    assert.equal(d.getMonth(), 9) // 0-indexed October
    assert.equal(d.getDate(), 22)
    assert.equal(d.getHours(), 0)
    assert.equal(d.getMinutes(), 0)
    assert.equal(d.getSeconds(), 0)
  })

  // Test 11: Explicit Asia/Jakarta (WIB, UTC+7) early-morning test
  test('11. Explicit Asia/Jakarta comparison: UTC timestamp at 19:30Z corresponds to 02:30 WIB next day', () => {
    // 2026-10-21T19:30:00.000Z is 2026-10-22 02:30:00 in WIB (UTC+7)
    const utcDate = new Date('2026-10-21T19:30:00.000Z')
    // Intl in Asia/Jakarta format
    const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const jakartaDate = jakartaFormatter.format(utcDate)
    assert.equal(jakartaDate, '2026-10-22')

    // Contrast with the old bug: utcDate.toISOString().split('T')[0] was '2026-10-21'
    assert.equal(utcDate.toISOString().split('T')[0], '2026-10-21')
    assert.notEqual(jakartaDate, utcDate.toISOString().split('T')[0])
  })

  test('12. Dashboard ranges include both Jakarta calendar boundaries', () => {
    const base = new Date('2026-10-22T17:30:00.000Z') // Oct 23, 00:30 WIB
    assert.deepEqual(getJakartaDashboardDateRange('7days', base), { start: '2026-10-17', end: '2026-10-23' })
    assert.deepEqual(getJakartaDashboardDateRange('month', base), { start: '2026-10-01', end: '2026-10-23' })
    assert.deepEqual(getJakartaDashboardDateRange('3months', base), { start: '2026-07-23', end: '2026-10-23' })
    assert.deepEqual(getJakartaDateRangeDays('2026-10-17', '2026-10-23'), [
      '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23',
    ])
  })

  test('13. Three calendar months ago clamps safely at month ends and leap years', () => {
    assert.equal(getJakartaDateMonthsAgo(3, new Date('2026-05-31T16:59:00.000Z')), '2026-02-28')
    assert.equal(getJakartaDateMonthsAgo(3, new Date('2024-05-31T16:59:00.000Z')), '2024-02-29')
    assert.equal(getJakartaDateMonthsAgo(3, new Date('2026-01-31T16:59:00.000Z')), '2025-10-31')
  })
})
