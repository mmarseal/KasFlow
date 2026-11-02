import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { formatRupiah } from "../utils/formatCurrency";
import { parseLocalDate } from "../utils/dateUtils";
import { useTransactions } from "../hooks/useTransactions";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";

const FILTER = [{ label: "Hari Ini", value: "today" }, { label: "7 Hari Terakhir", value: "7days" }, { label: "Bulan Ini", value: "month" }];
const TYPE_FILTER = [{ label: "Semua", value: "all" }, { label: "Pemasukan", value: "income" }, { label: "Pengeluaran", value: "expense" }];
const dateLabel = (date) => parseLocalDate(date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const paymentLabel = (method) => method === "cash" ? "Tunai" : method === "qris" ? "QRIS" : "—";

export default function BukuKas() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("today");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteSelection, setDeleteSelection] = useState({ businessId: null, id: null });
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const { transactions, loading, summary, error, refetch } = useTransactions(filter);
  const deleteId = business?.id && deleteSelection.businessId === business.id ? deleteSelection.id : null;
  const filtered = useMemo(() => transactions.filter((tx) => {
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const haystack = `${tx.note || ""} ${tx.category || ""} ${tx.payment_method || ""} ${tx.type}`.toLowerCase();
    return matchesType && haystack.includes(search.trim().toLowerCase());
  }), [transactions, typeFilter, search]);
  const dates = useMemo(() => [...new Set(filtered.map((tx) => tx.transaction_date))].sort((a, b) => b.localeCompare(a)), [filtered]);

  async function handleDelete(id) {
    if (!business?.id || !id) return;
    setDeleteError("");
    const { data, error: deleteFailure } = await supabase.from("transactions").delete().eq("business_id", business.id).eq("id", id).select("id").maybeSingle();
    if (deleteFailure || !data) {
      setDeleteError(deleteFailure ? "Transaksi gagal dihapus. Coba lagi." : "Transaksi tidak ditemukan atau sudah dihapus.");
      return;
    }
    setDeleteSelection({ businessId: business.id, id: null });
    refetch();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 pb-5 md:gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-[var(--kf-text-muted)]">Catatan keuangan usaha</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--kf-text)] sm:text-3xl">Riwayat Transaksi</h1><p className="mt-1 text-sm text-[var(--kf-text-muted)]">Tinjau, cari, dan kelola transaksi bisnis Anda.</p></div>
        <button type="button" onClick={() => navigate("/catat")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--kf-radius-md)] bg-[var(--kf-accent)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--kf-accent-hover)]"><Plus size={18} /> Catat Transaksi</button>
      </header>

      {notice && <div role="status" className="rounded-[var(--kf-radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}<button onClick={() => setNotice("")} className="ml-3 underline">Tutup</button></div>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Ringkasan transaksi">
        {[{ label: "Pemasukan", value: summary.totalIncome, tone: "text-emerald-700" }, { label: "Pengeluaran", value: summary.totalExpense, tone: "text-rose-700" }, { label: "Selisih Bersih", value: summary.selisihBersih, tone: "text-teal-800" }].map((item) => <article key={item.label} className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-4 shadow-sm"><p className="text-sm font-medium text-[var(--kf-text-muted)]">{item.label}</p><p className={`mt-1 text-xl font-bold ${item.tone}`}>{formatRupiah(item.value)}</p></article>)}
      </section>

      <section className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-3 shadow-sm sm:p-4" aria-label="Filter transaksi">
        <div className="grid grid-cols-3 rounded-[var(--kf-radius-md)] bg-[var(--kf-surface-soft)] p-1 sm:inline-grid sm:min-w-[27rem]">
          {FILTER.map((item) => <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={`min-h-11 rounded-[var(--kf-radius-sm)] px-2 text-xs font-semibold sm:px-4 sm:text-sm ${filter === item.value ? "bg-white text-[var(--kf-accent-hover)] shadow-sm" : "text-[var(--kf-text-muted)]"}`}>{item.label}</button>)}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative"><span className="sr-only">Cari transaksi</span><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kf-text-subtle)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kategori atau catatan" className="min-h-12 w-full rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] bg-white pl-10 pr-3 text-base outline-none focus:border-[var(--kf-accent)]" /></label>
          <div className="grid grid-cols-3 rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] p-1">{TYPE_FILTER.map((item) => <button key={item.value} aria-pressed={typeFilter === item.value} onClick={() => setTypeFilter(item.value)} className={`min-h-10 rounded-[var(--kf-radius-sm)] px-2 text-xs font-semibold ${typeFilter === item.value ? "bg-[var(--kf-accent-soft)] text-[var(--kf-accent-hover)]" : "text-[var(--kf-text-muted)]"}`}>{item.label}</button>)}</div>
        </div>
        <p className="mt-2 text-xs text-[var(--kf-text-muted)]">Menampilkan {filter === "today" ? "hari ini" : filter === "7days" ? "7 hari terakhir" : "bulan ini"} · {filtered.length} transaksi</p>
      </section>

      {deleteError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{deleteError}</p>}
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Gagal memuat transaksi.<button onClick={refetch} className="min-h-10 rounded-lg px-3 font-semibold">Coba lagi</button></div>}
      {loading ? <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-20 animate-pulse rounded-[var(--kf-radius-lg)] bg-white shadow-sm" />)}</div> : filtered.length === 0 ? (
        <div className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white px-5 py-8 text-center shadow-sm"><BookOpen className="mx-auto text-[var(--kf-text-subtle)]" size={30} /><h2 className="mt-2 font-semibold text-[var(--kf-text)]">Belum ada transaksi</h2><p className="mt-1 text-sm text-[var(--kf-text-muted)]">Coba ubah rentang tanggal atau catat transaksi baru.</p><button onClick={() => navigate("/catat")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--kf-accent)] px-4 font-semibold text-white">Catat Transaksi <ArrowRight size={17} /></button></div>
      ) : dates.map((date) => (
        <section key={date} aria-label={dateLabel(date)}>
          <h2 className="mb-2 px-1 text-sm font-semibold capitalize text-[var(--kf-text-muted)]">{dateLabel(date)}</h2>
          <div className="overflow-hidden rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white shadow-sm">
            <div className="hidden grid-cols-[minmax(7rem,1fr)_minmax(10rem,2fr)_minmax(6rem,1fr)_minmax(8rem,1fr)_auto] items-center gap-3 border-b border-[var(--kf-border)] bg-[var(--kf-surface-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--kf-text-subtle)] md:grid"><span>Tanggal</span><span>Transaksi</span><span>Pembayaran</span><span className="text-right">Nominal</span><span>Aksi</span></div>
            {filtered.filter((tx) => tx.transaction_date === date).map((tx) => {
              const income = tx.type === "income";
              return <article key={tx.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--kf-border)] px-3 py-3 last:border-0 sm:px-4 md:grid-cols-[minmax(7rem,1fr)_minmax(10rem,2fr)_minmax(6rem,1fr)_minmax(8rem,1fr)_auto] md:gap-3">
                <div className="hidden text-sm text-[var(--kf-text-muted)] md:block">{dateLabel(tx.transaction_date)}</div>
                <div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${income ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{income ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}</span><div className="min-w-0"><p className="truncate font-semibold text-[var(--kf-text)]">{tx.note || (income ? "Pemasukan" : tx.category || "Pengeluaran")}</p><p className="truncate text-sm text-[var(--kf-text-muted)]">{income ? `${tx.category || "Pemasukan"} · ${paymentLabel(tx.payment_method)}` : `Pengeluaran · ${tx.category || "Pengeluaran"}`}</p><p className="text-xs text-[var(--kf-text-subtle)] md:hidden">{dateLabel(tx.transaction_date)}</p></div></div>
                <div className="hidden text-sm text-[var(--kf-text-muted)] md:block">{income ? paymentLabel(tx.payment_method) : tx.payment_method === "cash" ? "Cash" : paymentLabel(tx.payment_method)}</div>
                <p className={`text-right font-bold ${income ? "text-emerald-700" : "text-rose-700"}`}>{income ? "+" : "−"}{formatRupiah(tx.amount)}<span className="mt-0.5 block text-xs font-medium md:hidden">{income ? "Pemasukan" : "Pengeluaran"}</span></p>
                <div className="col-span-2 flex justify-end gap-2 md:col-span-1">{deleteId === tx.id ? <><button onClick={() => handleDelete(tx.id)} className="min-h-10 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white">Hapus</button><button onClick={() => setDeleteSelection({ businessId: business.id, id: null })} className="min-h-10 rounded-lg px-3 text-sm">Batal</button></> : <><button aria-label={`Edit transaksi ${tx.note || tx.category || ""}`} onClick={() => navigate("/catat", { state: { transaction: tx } })} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[var(--kf-accent-hover)] hover:bg-[var(--kf-accent-soft)]"><Pencil size={16} /> Edit</button><button aria-label={`Hapus transaksi ${tx.note || tx.category || ""}`} onClick={() => { setDeleteError(""); setDeleteSelection({ businessId: business?.id ?? null, id: tx.id }); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Hapus</button></>}</div>
              </article>;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
