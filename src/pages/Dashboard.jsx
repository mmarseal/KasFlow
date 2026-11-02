import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { formatRupiah } from "../utils/formatCurrency";
import { getJakartaDashboardDateRange, getJakartaDateRangeDays } from "../utils/dateUtils";
import { aggregateTransactionsByBuckets, filterTransactionsByDateRange, summarizeFinancialTransactions } from "../utils/dashboardAnalytics";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  RefreshCw,
  Sun,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS = [
  { label: "7 Hari Terakhir", value: "7days" },
  { label: "Bulan Ini", value: "month" },
  { label: "3 Bulan Terakhir", value: "3months" },
];

function jakartaParts(date = new Date()) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
}

function shortDay(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(".", "");
}

function shortDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function longDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function formatAxisAmount(value) {
  const amount = Number(value);
  if (amount >= 1000000) return `${(amount / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (amount >= 1000) return `${(amount / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}rb`;
  return amount.toLocaleString("id-ID");
}

function CashFlowTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, endDate } = payload[0].payload;
  const dateLabel = date === endDate ? longDate(date) : `${longDate(date)} – ${longDate(endDate)}`;

  return (
    <div className="max-w-[min(11rem,calc(100vw-2rem))] rounded-lg border border-[var(--kf-border)] bg-white/95 px-2 py-1.5 shadow-[var(--kf-shadow-md)] backdrop-blur-sm sm:max-w-[min(18rem,calc(100vw-2rem))] sm:rounded-xl sm:px-3 sm:py-2">
      <p className="mb-1 break-words text-[10px] font-semibold leading-4 text-[var(--kf-text)] sm:mb-1.5 sm:text-xs sm:leading-normal">{dateLabel}</p>
      <div className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
        {payload.map(({ name, value, color }) => (
          <div key={name} className="flex min-w-0 items-center justify-between gap-2 text-[10px] leading-4 sm:gap-4 sm:text-xs sm:leading-normal">
            <span className="flex min-w-0 items-center gap-1 text-[var(--kf-text-muted)] sm:gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2" style={{ backgroundColor: color }} />{name}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[var(--kf-text)]">{formatRupiah(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function greeting(hour) {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function paymentLabel(method) {
  if (method === "cash") return "Tunai";
  if (method === "qris") return "QRIS";
  return method || "";
}

function formatRecentDate(transaction) {
  const date = new Date(`${transaction.transaction_date}T12:00:00+07:00`);
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  if (!transaction.created_at) return dateLabel;
  const timeLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(transaction.created_at));
  return `${dateLabel} · ${timeLabel} WIB`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { business, user } = useAuth();
  const { period } = useOutletContext();
  const businessId = business?.id ?? null;
  const userName = user?.user_metadata?.nama || user?.email?.split("@")[0] || "";
  const profileName = userName || "Pengguna";
  const [refreshToken, setRefreshToken] = useState(0);
  const [isMobileChart, setIsMobileChart] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  const [isTouchChart, setIsTouchChart] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const [result, setResult] = useState({ key: null, transactions: [], recentTransactions: [], periodError: null, recentError: null });
  const now = new Date();
  const currentHour = Number(jakartaParts(now).hour);
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const dateRange = getJakartaDashboardDateRange(period, now);
  const queryStartDate = dateRange.start;
  const key = JSON.stringify([businessId, period, dateRange.start, dateRange.end, refreshToken]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 639px)");
    const touchQuery = window.matchMedia("(pointer: coarse)");
    const updateChartViewport = () => {
      setIsMobileChart(mobileQuery.matches);
      setIsTouchChart(touchQuery.matches);
    };
    updateChartViewport();
    mobileQuery.addEventListener("change", updateChartViewport);
    touchQuery.addEventListener("change", updateChartViewport);
    return () => {
      mobileQuery.removeEventListener("change", updateChartViewport);
      touchQuery.removeEventListener("change", updateChartViewport);
    };
  }, []);

  useEffect(() => {
    if (!businessId) return undefined;
    let active = true;

    async function loadTransactions() {
      try {
        const [periodResult, recentResult] = await Promise.all([
          supabase
          .from("transactions")
          .select("id, type, amount, transaction_date, payment_method, category, note, created_at")
          .eq("business_id", businessId)
          .gte("transaction_date", queryStartDate)
          .lte("transaction_date", dateRange.end)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false }),
          supabase
            .from("transactions")
            .select("id, type, amount, transaction_date, payment_method, category, note, created_at")
            .eq("business_id", businessId)
            .order("transaction_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (!active) return;
        setResult({
          key,
          transactions: periodResult.error ? [] : periodResult.data || [],
          recentTransactions: recentResult.error ? [] : recentResult.data || [],
          periodError: periodResult.error?.message ?? null,
          recentError: recentResult.error?.message ?? null,
        });
      } catch (error) {
        if (active) setResult({
          key,
          transactions: [],
          recentTransactions: [],
          periodError: error.message || "Gagal memuat transaksi.",
          recentError: error.message || "Gagal memuat transaksi.",
        });
      }
    }

    loadTransactions();
    return () => { active = false; };
  }, [businessId, key, queryStartDate, dateRange.end]);

  const current = businessId && result.key === key ? result : null;
  const transactions = current?.transactions ?? [];
  const loading = Boolean(businessId) && !current;
  const periodError = current?.periodError ?? null;
  const recentError = current?.recentError ?? null;
  const periodTransactions = filterTransactionsByDateRange(transactions, dateRange.start, dateRange.end);
  const { income, expense } = summarizeFinancialTransactions(periodTransactions);
  const net = income - expense;
  const periodDates = useMemo(() => getJakartaDateRangeDays(dateRange.start, dateRange.end), [dateRange.start, dateRange.end]);
  const chartBuckets = period === "3months"
    ? Array.from({ length: Math.ceil(periodDates.length / 7) }, (_, index) => ({
      start: periodDates[index * 7],
      end: periodDates[Math.min((index + 1) * 7 - 1, periodDates.length - 1)],
    }))
    : periodDates.map((date) => ({ start: date, end: date }));
  const chartData = aggregateTransactionsByBuckets(periodTransactions, chartBuckets).map(({ start, end, income: bucketIncome, expense: bucketExpense }) => {
    const bucketLabel = period === "3months"
      ? start.slice(0, 7) === end.slice(0, 7)
        ? `${shortDate(start).replace(/\s+/g, " ")}–${Number(end.slice(-2))}`
        : `${shortDate(start)}–${shortDate(end)}`
      : period === "month" ? String(Number(start.slice(-2))) : shortDay(start);
    return {
      date: start,
      endDate: end,
      hari: bucketLabel,
      labelMobile: shortDate(start),
      Pemasukan: bucketIncome,
      Pengeluaran: bucketExpense,
    };
  });
  const mobileChartTicks = Array.from(new Set([0, Math.round((chartData.length - 1) / 3), Math.round(2 * (chartData.length - 1) / 3), chartData.length - 1]))
    .map((index) => chartData[index]?.labelMobile)
    .filter(Boolean);
  const recentTransactions = current?.recentTransactions ?? [];
  const refresh = () => setRefreshToken((token) => token + 1);
  const openInput = (type) => navigate("/catat", { state: { type, from: location.pathname } });
  const summaryCards = [
    { label: "Pemasukan", amount: income, icon: TrendingUp, color: "text-emerald-700", surface: "bg-emerald-50", iconTone: "text-emerald-700" },
    { label: "Pengeluaran", amount: expense, icon: TrendingDown, color: "text-rose-700", surface: "bg-rose-50", iconTone: "text-rose-700" },
    { label: "Selisih Bersih", amount: net, icon: Banknote, color: "text-teal-800", surface: "bg-teal-50", iconTone: "text-teal-800" },
  ];
  const chartSubtitle = `Pemasukan dan pengeluaran · ${PERIODS.find(({ value }) => value === period)?.label.toLowerCase()} (${shortDate(dateRange.start)} – ${shortDate(dateRange.end)})`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 pb-4 md:gap-5">
      <section aria-label="Ringkasan dashboard" className="flex flex-col gap-4">
        <div className="grid gap-3 py-2 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)] lg:items-center lg:gap-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--kf-text)] sm:text-3xl">
              {greeting(currentHour)}, {profileName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-1 text-sm leading-6 text-[var(--kf-text-muted)] sm:text-base">Berikut ringkasan keuangan usaha Anda untuk {PERIODS.find(({ value }) => value === period)?.label.toLowerCase()}.</p>
          </div>

          <aside aria-label="Informasi hari ini" className="flex items-start gap-3 rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] bg-white p-3 text-sm shadow-[var(--kf-shadow-card)] sm:p-4 lg:items-center">
            <Sun size={21} className="mt-0.5 shrink-0 text-amber-600 lg:mt-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold capitalize text-[var(--kf-text)]">{todayLabel}</p>
              <p className="mt-0.5 leading-5 text-[var(--kf-text-muted)]">Semoga usaha Anda lancar hari ini.</p>
            </div>
          </aside>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,1fr)]">
        <article className="min-w-0 rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-4 shadow-[var(--kf-shadow-card)] md:col-start-1 md:row-start-2 xl:col-start-1 xl:row-start-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--kf-text)]">Arus Kas</h2>
              <p className="min-w-0 text-sm leading-5 text-[var(--kf-text-muted)]">{chartSubtitle}</p>
            </div>
            <button type="button" onClick={refresh} aria-label="Muat ulang transaksi" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--kf-radius-sm)] text-[var(--kf-text-muted)] transition hover:bg-[var(--kf-surface-soft)] hover:text-[var(--kf-text)]"><RefreshCw size={18} aria-hidden="true" /></button>
          </div>
          {loading ? <div className="h-56 animate-pulse rounded-xl bg-[var(--kf-surface-soft)]" /> : periodError ? (
            <p role="alert" className="flex min-h-32 items-center justify-center rounded-[var(--kf-radius-md)] bg-rose-50 px-5 text-center text-sm text-rose-700">Gagal memuat arus kas. Coba muat ulang.</p>
          ) : periodTransactions.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-[var(--kf-radius-md)] bg-[var(--kf-surface-soft)] px-5 py-4 text-center">
              <CalendarDays size={25} className="text-[var(--kf-text-subtle)]" aria-hidden="true" />
              <p className="mt-2 font-semibold text-[var(--kf-text)]">Belum ada transaksi</p>
              <p className="mt-1 text-sm text-[var(--kf-text-muted)]">Arus kas periode ini akan muncul setelah transaksi dicatat.</p>
            </div>
          ) : (
            <div className="h-60 w-full min-w-0 sm:h-56" role="img" aria-label={`Grafik pemasukan dan pengeluaran ${chartSubtitle}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={3} margin={{ top: 4, right: isMobileChart ? 0 : 4, left: isMobileChart ? 0 : 6, bottom: isMobileChart ? 2 : 6 }}>
                  <CartesianGrid vertical={false} stroke="#edf1ef" />
                  <XAxis dataKey={isMobileChart ? "labelMobile" : "hari"} ticks={isMobileChart ? mobileChartTicks : undefined} interval={isMobileChart ? 0 : period === "3months" ? 1 : period === "month" ? 3 : 0} minTickGap={isMobileChart ? 6 : 12} tickMargin={isMobileChart ? 6 : 8} tick={{ fontSize: isMobileChart ? 10 : period === "3months" ? 10 : 12, fill: "#77837f" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, (dataMax) => dataMax > 0 ? Math.ceil(dataMax * 1.1) : 1]} tickCount={4} allowDecimals={false} tick={{ fontSize: isMobileChart ? 10 : 11, fill: "#77837f" }} axisLine={false} tickLine={false} tickFormatter={formatAxisAmount} width={isMobileChart ? 50 : 68} />
                  <Tooltip content={<CashFlowTooltip />} trigger={isTouchChart ? "click" : "hover"} offset={6} allowEscapeViewBox={{ x: false, y: false }} cursor={isMobileChart ? { fill: "rgba(8, 127, 104, 0.055)" } : undefined} wrapperStyle={{ outline: "none", zIndex: 20 }} />
                  <Legend align="center" verticalAlign="bottom" layout="horizontal" iconType={isMobileChart ? "circle" : "rect"} iconSize={isMobileChart ? 7 : 14} wrapperStyle={{ display: "flex", justifyContent: "center", whiteSpace: "nowrap", fontSize: isMobileChart ? 10 : 13, paddingTop: isMobileChart ? 2 : 8 }} />
                  <Bar dataKey="Pemasukan" fill="#0f8b70" radius={[5, 5, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="Pengeluaran" fill="#d26464" radius={[5, 5, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <section aria-label="Ringkasan keuangan" className="flex flex-col gap-2.5 md:col-start-1 md:row-start-1 xl:col-span-2 xl:row-start-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--kf-text)]">Ringkasan keuangan</h2>
              <p className="text-sm text-[var(--kf-text-muted)]">Menampilkan {PERIODS.find(({ value }) => value === period)?.label.toLowerCase()}.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summaryCards.map(({ label, amount, icon: Icon, color, surface, iconTone }) => (
              <article key={label} className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-3.5 shadow-[var(--kf-shadow-card)] sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--kf-text-muted)]">{label}</p>
                    {loading ? <div className="mt-2 h-8 w-36 animate-pulse rounded-lg bg-[var(--kf-surface-soft)]" /> : <p className={`mt-1 break-all text-2xl font-bold tracking-tight ${color}`}>{formatRupiah(amount)}</p>}
                  </div>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--kf-radius-md)] ${surface}`}><Icon size={23} className={iconTone} aria-hidden="true" /></span>
                </div>
                <p className="mt-2 text-xs text-[var(--kf-text-subtle)]">{PERIODS.find(({ value }) => value === period)?.label}</p>
              </article>
            ))}
          </div>
        </section>

        <article className="min-w-0 rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-4 shadow-[var(--kf-shadow-card)] md:col-start-1 md:row-start-3 xl:col-start-2 xl:row-start-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--kf-text)]">Transaksi Terbaru</h2>
              <p className="text-sm text-[var(--kf-text-muted)]">5 catatan terakhir</p>
            </div>
            <button type="button" onClick={() => navigate("/riwayat")} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[var(--kf-accent-hover)] hover:bg-[var(--kf-accent-soft)]">Lihat semua <ArrowRight size={16} aria-hidden="true" /></button>
          </div>
          {loading ? <div className="space-y-3 py-2">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-[var(--kf-surface-soft)]" />)}</div> : recentError ? (
            <p role="alert" className="flex min-h-32 items-center justify-center rounded-[var(--kf-radius-md)] bg-rose-50 px-5 text-center text-sm text-rose-700">Gagal memuat transaksi terbaru. Coba muat ulang.</p>
          ) : recentTransactions.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-[var(--kf-radius-md)] bg-[var(--kf-surface-soft)] px-5 py-4 text-center">
              <Banknote size={25} className="text-[var(--kf-text-subtle)]" aria-hidden="true" />
              <p className="mt-2 font-semibold text-[var(--kf-text)]">Belum ada catatan</p>
              <p className="mt-1 text-sm text-[var(--kf-text-muted)]">Transaksi terbaru akan tampil di sini.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--kf-border)]">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === "income";
                const title = isIncome ? "Pemasukan" : tx.category || "Pengeluaran";
                const details = [tx.note, formatRecentDate(tx), paymentLabel(tx.payment_method)].filter(Boolean).join(" · ");
                return (
                  <li key={tx.id} className="flex min-w-0 items-center gap-3 py-3 first:pt-1 last:pb-1">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isIncome ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {isIncome ? <ArrowDownLeft size={19} aria-hidden="true" /> : <ArrowUpRight size={19} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--kf-text)]">{title}</p>
                      <p className="truncate text-xs text-[var(--kf-text-muted)]">{details}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${isIncome ? "text-emerald-700" : "text-rose-700"}`}>{isIncome ? "+" : "−"}{formatRupiah(Number(tx.amount || 0))}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>

      <section aria-label="Aksi cepat" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => openInput("income")} className="flex min-h-14 items-center justify-between rounded-[var(--kf-radius-lg)] border border-emerald-200 bg-white px-4 text-left shadow-[var(--kf-shadow-card)] transition hover:border-emerald-300 hover:bg-emerald-50/50 sm:px-5">
          <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><TrendingUp size={20} aria-hidden="true" /></span><span><span className="block font-semibold text-[var(--kf-text)]">+ Catat Pemasukan</span><span className="block text-xs text-[var(--kf-text-muted)]">Tambahkan pemasukan usaha</span></span></span><ArrowRight size={18} className="text-emerald-700" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => openInput("expense")} className="flex min-h-14 items-center justify-between rounded-[var(--kf-radius-lg)] border border-rose-200 bg-white px-4 text-left shadow-[var(--kf-shadow-card)] transition hover:border-rose-300 hover:bg-rose-50/50 sm:px-5">
          <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700"><TrendingDown size={20} aria-hidden="true" /></span><span><span className="block font-semibold text-[var(--kf-text)]">− Catat Pengeluaran</span><span className="block text-xs text-[var(--kf-text-muted)]">Tambahkan pengeluaran usaha</span></span></span><ArrowRight size={18} className="text-rose-700" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
