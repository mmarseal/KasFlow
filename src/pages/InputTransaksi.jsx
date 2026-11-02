import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { useTransactions } from "../hooks/useTransactions";
import { formatJakartaDate } from "../utils/dateUtils";
import { formatRupiah, formatTanggal } from "../utils/formatCurrency";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle, QrCode, TrendingDown, TrendingUp, Wallet } from "lucide-react";

const KATEGORI = ["Bahan Baku", "Operasional", "Tagihan", "Lain-lain"];
const getDefaultForm = () => ({ type: "income", amount: "", category: "", payment_method: "", note: "", transaction_date: formatJakartaDate() });

function transactionDetails(transaction) {
  return [transaction.category, transaction.payment_method === "cash" ? "Tunai" : transaction.payment_method?.toUpperCase()]
    .filter(Boolean)
    .join(" · ");
}

export default function InputTransaksi() {
  const { business } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const transaction = location.state?.transaction ?? null;
  const { transactions: todayTransactions, loading: summaryLoading, error: summaryError, summary, refetch: refetchToday } = useTransactions("today");
  const { transactions: recentTransactions, loading: recentLoading, error: recentError, refetch: refetchRecent } = useTransactions("recent");
  const [form, setForm] = useState(() => ({
    ...getDefaultForm(),
    ...(transaction ? { ...transaction, amount: String(transaction.amount), category: transaction.category || "", payment_method: transaction.payment_method || "", note: transaction.note || "" } : {}),
    type: transaction?.type || (["income", "expense"].includes(location.state?.type) ? location.state.type : "income"),
  }));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  function chooseType(type) {
    setForm((prev) => ({ ...prev, type, category: "", payment_method: "" }));
    setStatus(null);
  }

  async function handleSubmit(addAnother = false) {
    if (loading) return;
    if (!["income", "expense"].includes(form.type)) return setStatus({ type: "error", msg: "Pilih jenis transaksi dulu." });
    if (!form.amount || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return setStatus({ type: "error", msg: "Nominal harus lebih dari 0." });
    if (form.type === "expense" && !form.category) return setStatus({ type: "error", msg: "Pilih kategori pengeluaran." });
    if (form.type === "expense" && !["cash", "qris"].includes(form.payment_method)) return setStatus({ type: "error", msg: "Pilih metode pembayaran (Cash/QRIS)." });
    const [year, month, day] = (form.transaction_date || "").split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.transaction_date || "") || parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() + 1 !== month || parsedDate.getUTCDate() !== day) return setStatus({ type: "error", msg: "Tanggal transaksi tidak valid." });
    if (form.type === "income" && !["cash", "qris"].includes(form.payment_method)) return setStatus({ type: "error", msg: "Pilih sumber pemasukan (Cash/QRIS)." });
    if (!business?.id) return setStatus({ type: "error", msg: "Data bisnis tidak ditemukan. Harap refresh atau login ulang." });

    setLoading(true);
    setStatus(null);
    const payload = { business_id: business.id, type: form.type, amount: Number(form.amount), category: form.type === "expense" ? form.category : null, payment_method: form.payment_method, note: form.note || null, transaction_date: form.transaction_date };
    let result;
    try {
      result = transaction?.id
        ? await supabase.from("transactions").update(payload).eq("business_id", business.id).eq("id", transaction.id).select("id").maybeSingle()
        : await supabase.from("transactions").insert(payload);
    } catch {
      result = { error: new Error("Mutation failed"), data: null };
    }
    if (result.error || (transaction?.id && !result.data)) {
      setStatus({ type: "error", msg: result.error ? "Gagal menyimpan. Coba lagi." : "Transaksi tidak ditemukan atau sudah tidak dapat diubah." });
    } else if (transaction?.id) {
      navigate("/riwayat", { replace: true, state: { notice: "Transaksi berhasil diperbarui." } });
      setLoading(false);
      return;
    } else {
      if (addAnother) {
        setStatus({ type: "success", msg: "Transaksi berhasil disimpan. Form siap untuk transaksi berikutnya." });
        setForm((prev) => ({ ...prev, amount: "", transaction_date: formatJakartaDate() }));
      } else {
        setStatus({ type: "success", msg: "Transaksi berhasil disimpan!" });
        setForm(getDefaultForm());
      }
      refetchToday();
      refetchRecent();
    }
    setLoading(false);
  }

  const fieldClass = "min-h-12 w-full rounded-[var(--kf-radius-md)] border border-[var(--kf-border-strong)] bg-white px-4 text-base text-[var(--kf-text)] outline-none transition focus:border-[var(--kf-accent)]";
  const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--kf-text)]";
  const typeButton = (type, label, Icon) => {
    const active = form.type === type;
    const income = type === "income";
    return <button type="button" aria-pressed={active} onClick={() => chooseType(type)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--kf-radius-md)] border px-3 text-sm font-semibold transition sm:px-4 sm:text-base ${active ? income ? "border-[var(--kf-accent)] bg-[var(--kf-accent-soft)] text-[var(--kf-accent-hover)] ring-1 ring-[var(--kf-accent)]" : "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-300" : "border-[var(--kf-border)] bg-white text-[var(--kf-text-muted)] hover:bg-[var(--kf-surface-soft)]"}`}><Icon size={19} aria-hidden="true" />{label}</button>;
  };

  return (
    <div className="mx-auto flex min-w-0 w-full max-w-6xl flex-col gap-4 pb-8 md:gap-5">
      <header className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--kf-text)] sm:text-3xl">{transaction ? "Edit Transaksi" : "Catat Transaksi"}</h1>
        <p className="mt-1 text-sm text-[var(--kf-text-muted)]">Catat pemasukan atau pengeluaran usaha Anda dengan mudah.</p>
      </header>

      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.9fr)] xl:gap-6">
        <section aria-label="Form transaksi" className="min-w-0 rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-5 shadow-sm sm:p-6">
          <div className="grid grid-cols-2 gap-2 rounded-[var(--kf-radius-md)] bg-[var(--kf-surface-soft)] p-1">
            {typeButton("income", "Pemasukan", TrendingUp)}{typeButton("expense", "Pengeluaran", TrendingDown)}
          </div>

          <div className="mt-4 grid gap-4">
            {form.type === "income" ? (
              <fieldset>
                <legend className={labelClass}>Sumber Pembayaran</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: "cash", label: "Cash", Icon: Wallet }, { value: "qris", label: "QRIS", Icon: QrCode }].map(({ value, label, Icon }) => <button type="button" key={value} aria-pressed={form.payment_method === value} onClick={() => setForm((prev) => ({ ...prev, payment_method: value }))} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--kf-radius-md)] border px-3 text-sm font-semibold transition sm:px-4 sm:text-base ${form.payment_method === value ? "border-[var(--kf-accent)] bg-[var(--kf-accent-soft)] text-[var(--kf-accent-hover)] ring-1 ring-[var(--kf-accent)]" : "border-[var(--kf-border)] bg-white text-[var(--kf-text-muted)] hover:bg-[var(--kf-surface-soft)]"}`}><Icon size={18} aria-hidden="true" />{label}</button>)}
                </div>
              </fieldset>
            ) : (
              <>
                <div>
                  <label className={labelClass} htmlFor="transaction-category">Kategori Pengeluaran</label>
                  <select id="transaction-category" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} className={fieldClass}><option value="">Pilih kategori</option>{KATEGORI.map((category) => <option key={category}>{category}</option>)}</select>
                </div>
                <fieldset>
                  <legend className={labelClass}>Metode Pembayaran</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: "cash", label: "Cash", Icon: Wallet }, { value: "qris", label: "QRIS", Icon: QrCode }].map(({ value, label, Icon }) => <button type="button" key={value} aria-pressed={form.payment_method === value} onClick={() => setForm((prev) => ({ ...prev, payment_method: value }))} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--kf-radius-md)] border px-3 text-sm font-semibold transition sm:px-4 sm:text-base ${form.payment_method === value ? "border-[var(--kf-accent)] bg-[var(--kf-accent-soft)] text-[var(--kf-accent-hover)] ring-1 ring-[var(--kf-accent)]" : "border-[var(--kf-border)] bg-white text-[var(--kf-text-muted)] hover:bg-[var(--kf-surface-soft)]"}`}><Icon size={18} aria-hidden="true" />{label}</button>)}
                  </div>
                </fieldset>
              </>
            )}

            <div>
              <label className={labelClass} htmlFor="transaction-amount">Nominal</label>
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[var(--kf-text-muted)]">Rp</span><input id="transaction-amount" type="number" name="amount" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} min="1" inputMode="numeric" placeholder="0" className={`${fieldClass} min-h-16 pl-12 text-2xl font-bold`} /></div>
              <div className="mt-2 flex flex-wrap gap-2">{[10000, 25000, 50000, 100000].map((amount) => <button type="button" key={amount} onClick={() => setForm((prev) => ({ ...prev, amount: String(amount) }))} className="min-h-10 rounded-full border border-[var(--kf-border)] bg-[var(--kf-surface-soft)] px-3 text-sm font-semibold text-[var(--kf-text-muted)] hover:border-[var(--kf-accent)]">{amount / 1000}rb</button>)}</div>
              {form.amount && <p className="mt-1.5 text-sm font-semibold text-[var(--kf-accent-hover)]">{formatRupiah(Number(form.amount) || 0)}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={labelClass} htmlFor="transaction-date">Tanggal</label><input id="transaction-date" type="date" name="transaction_date" value={form.transaction_date} onChange={(event) => setForm((prev) => ({ ...prev, transaction_date: event.target.value }))} className={fieldClass} /></div>
              <div><label className={labelClass} htmlFor="transaction-note">Keterangan <span className="font-normal text-[var(--kf-text-subtle)]">(opsional)</span></label><input id="transaction-note" name="note" value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Contoh: penjualan siang" className={fieldClass} /></div>
            </div>
          </div>

          {status && <div role={status.type === "error" ? "alert" : "status"} className={`mt-4 flex items-center gap-3 rounded-xl border p-3 text-sm font-medium ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{status.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}{status.msg}</div>}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => navigate(-1)} disabled={loading} className="order-2 min-h-12 w-full rounded-[var(--kf-radius-md)] border border-[var(--kf-border-strong)] bg-white px-4 text-base font-semibold text-[var(--kf-text)] transition hover:bg-[var(--kf-surface-soft)] disabled:opacity-60 sm:order-1">Batal</button>
            <button type="button" onClick={() => handleSubmit()} disabled={loading} className={`order-1 min-h-12 w-full rounded-[var(--kf-radius-md)] px-4 text-base font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:order-2 ${form.type === "income" ? "bg-[var(--kf-accent)] hover:bg-[var(--kf-accent-hover)]" : "bg-rose-600 hover:bg-rose-700"}`}>{loading ? "Menyimpan..." : transaction ? "Simpan Perubahan" : `Simpan ${form.type === "income" ? "Pemasukan" : "Pengeluaran"}`}</button>
            {!transaction && <button type="button" onClick={() => handleSubmit(true)} disabled={loading} className="min-h-12 w-full rounded-[var(--kf-radius-md)] border border-[var(--kf-border-strong)] bg-white px-4 text-base font-semibold text-[var(--kf-text)] transition hover:bg-[var(--kf-surface-soft)] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">Simpan &amp; Catat Lagi</button>}
          </div>
        </section>

        <aside className="grid min-w-0 gap-4">
          <section aria-labelledby="today-summary-title" className="min-w-0 rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-5 shadow-sm sm:p-6">
            <h2 id="today-summary-title" className="font-bold text-[var(--kf-text)]">Ringkasan Hari Ini</h2>
            {summaryLoading ? <p className="mt-4 text-sm text-[var(--kf-text-muted)]">Memuat ringkasan...</p> : summaryError ? <p role="alert" className="mt-4 text-sm text-rose-700">Ringkasan hari ini gagal dimuat.</p> : <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-[var(--kf-text-muted)]"><TrendingUp size={17} className="text-emerald-700" aria-hidden="true" />Pemasukan</span><span className="text-sm font-bold text-emerald-700">{formatRupiah(summary.totalIncome)}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-[var(--kf-text-muted)]"><TrendingDown size={17} className="text-rose-700" aria-hidden="true" />Pengeluaran</span><span className="text-sm font-bold text-rose-700">{formatRupiah(summary.totalExpense)}</span></div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--kf-border)] pt-3"><span className="text-sm font-semibold text-[var(--kf-text)]">Selisih Bersih</span><span className="text-sm font-bold text-[var(--kf-text)]">{formatRupiah(summary.selisihBersih)}</span></div>
            </div>}
            {!summaryLoading && !summaryError && todayTransactions.length === 0 && <p className="mt-3 text-xs text-[var(--kf-text-subtle)]">Belum ada transaksi hari ini.</p>}
          </section>

          <section aria-labelledby="recent-transactions-title" className="min-w-0 rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-2"><h2 id="recent-transactions-title" className="font-bold text-[var(--kf-text)]">Transaksi Terbaru</h2><button type="button" onClick={() => navigate("/riwayat")} className="text-xs font-semibold text-[var(--kf-accent-hover)] hover:underline">Lihat semua</button></div>
            {recentLoading ? <p className="mt-4 text-sm text-[var(--kf-text-muted)]">Memuat transaksi...</p> : recentError ? <p role="alert" className="mt-4 text-sm text-rose-700">Transaksi terbaru gagal dimuat.</p> : recentTransactions.length === 0 ? <p className="mt-4 text-sm text-[var(--kf-text-muted)]">Belum ada transaksi.</p> : <ul className="mt-3 divide-y divide-[var(--kf-border)]">
              {recentTransactions.map((item) => {
                const income = item.type === "income";
                const details = transactionDetails(item);
                return <li key={item.id} className="flex min-w-0 items-center gap-3 py-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${income ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} aria-hidden="true">{income ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--kf-text)]">{item.note || item.category || (income ? "Pemasukan" : "Pengeluaran")}</p><p className="truncate text-xs text-[var(--kf-text-muted)]">{details || (income ? "Pemasukan" : "Pengeluaran")} · {formatTanggal(item.transaction_date)}</p></div>
                  <span className={`shrink-0 text-right text-sm font-bold ${income ? "text-emerald-700" : "text-rose-700"}`}>{income ? "+" : "−"}{formatRupiah(item.amount)}</span>
                </li>;
              })}
            </ul>}
          </section>
        </aside>
      </div>
    </div>
  );
}
