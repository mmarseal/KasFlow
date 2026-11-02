import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import {
  Settings,
  Plus,
  Minus,
  Trophy,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { formatJakartaDate, getJakartaDateDaysAgo } from "../utils/dateUtils";

const FILTER = [
  { label: "Hari Ini", value: "today" },
  { label: "Minggu Ini", value: "week" },
];

function getDateRange(filter) {
  const today = formatJakartaDate();
  if (filter === "today") return { start: today, end: today };
  return { start: getJakartaDateDaysAgo(6), end: today };
}

export default function RekapMenu() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const [filter, setFilter] = useState("today");
  const [refreshToken, setRefreshToken] = useState(0);
  const [queryResult, setQueryResult] = useState({ key: null, menus: [], sales: [], error: null });
  const [qtyState, setQtyState] = useState({ businessId: null, values: {} }); // { menu_name: number }
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const businessId = business?.id ?? null;
  const queryKey = JSON.stringify([businessId, filter, refreshToken]);
  const currentResult = businessId && queryResult.key === queryKey ? queryResult : null;
  const menus = currentResult?.menus ?? [];
  const sales = currentResult?.sales ?? [];
  const queryError = currentResult?.error ?? null;
  const loading = Boolean(businessId) && !currentResult;
  const qty = businessId && qtyState.businessId === businessId ? qtyState.values : {};

  useEffect(() => {
    if (!businessId) return undefined;

    let active = true;
    const { start, end } = getDateRange(filter);

    async function loadData() {
      try {
        const [menuResult, salesResult] = await Promise.all([
          supabase
            .from("menus")
            .select("*")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("created_at"),
          supabase
            .from("menu_sales")
            .select("*")
            .eq("business_id", businessId)
            .gte("sale_date", start)
            .lte("sale_date", end),
        ]);

        if (!active) return;
        const error = menuResult.error || salesResult.error;
        setQueryResult({
          key: queryKey,
          menus: error ? [] : (menuResult.data || []),
          sales: error ? [] : (salesResult.data || []),
          error: error?.message ?? null,
        });
      } catch (error) {
        if (active) setQueryResult({ key: queryKey, menus: [], sales: [], error: error.message || "Gagal memuat rekap menu." });
      }
    }

    loadData();
    return () => { active = false };
  }, [businessId, filter, queryKey]);

  function changeQty(menuName, delta) {
    setQtyState((prev) => {
      const currentValues = prev.businessId === businessId ? prev.values : {};
      const current = currentValues[menuName] || 0;
      const next = Math.max(0, current + delta);
      return { businessId, values: { ...currentValues, [menuName]: next } };
    });
  }

  async function handleSimpan() {
    const entries = Object.entries(qty).filter(([, q]) => q > 0);
    if (entries.length === 0)
      return setStatus({ type: "error", msg: "Belum ada menu yang dipilih." });
    if (!business?.id)
      return setStatus({
        type: "error",
        msg: "Data bisnis tidak ditemukan. Harap login ulang.",
      });

    setSaving(true);
    setStatus(null);
    const today = formatJakartaDate();

    const inserts = entries.map(([menu_name, quantity]) => ({
      business_id: business.id,
      menu_name,
      quantity,
      sale_date: today,
    }));

    const { error } = await supabase.from("menu_sales").insert(inserts);

    if (!error) {
      setStatus({
        type: "success",
        msg: `${entries.length} menu berhasil dicatat!`,
      });
      setQtyState({ businessId, values: {} });
      setRefreshToken((token) => token + 1);
    } else {
      setStatus({ type: "error", msg: "Gagal menyimpan. Coba lagi." });
    }
    setSaving(false);
  }

  // Agregasi sales untuk ranking
  const aggregated = sales
    .reduce((acc, item) => {
      const found = acc.find(
        (a) => a.menu_name.toLowerCase() === item.menu_name.toLowerCase(),
      );
      if (found) found.quantity += item.quantity;
      else acc.push({ menu_name: item.menu_name, quantity: item.quantity });
      return acc;
    }, [])
    .sort((a, b) => b.quantity - a.quantity);

  const maxQty = aggregated[0]?.quantity || 1;
  const medalColor = ["text-yellow-500", "text-gray-400", "text-amber-600"];
  const totalDipilih = Object.values(qty).filter((q) => q > 0).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 pb-5 md:gap-5">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-2 md:hidden">
        <div>
          <h1 className="text-[var(--kf-text)] text-2xl font-bold">Rekap Menu</h1>
          <p className="text-[var(--kf-text-muted)] text-sm mt-1">
            Catat menu terjual hari ini
          </p>
        </div>
        <button
          onClick={() => navigate("/kelola-menu")}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--kf-border)] bg-white text-[var(--kf-text-muted)]"
        >
          <Settings size={20} />
        </button>
      </div>

      <header className="hidden md:block"><p className="text-sm text-[var(--kf-text-muted)]">Statistik porsi terjual</p><h1 className="text-3xl font-bold text-[var(--kf-text)]">Rekap Menu</h1></header>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--kf-text-muted)]">{filter === "today" ? "Penjualan hari ini" : "Penjualan 7 hari terakhir"}</p>
        <div className="grid grid-cols-2 rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] bg-[var(--kf-surface-soft)] p-1 shadow-sm sm:min-w-72">
          {FILTER.map((f) => <button type="button" key={f.value} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)} className={`min-h-11 rounded-[var(--kf-radius-sm)] px-4 text-sm font-semibold transition-all ${filter === f.value ? "bg-white text-[var(--kf-accent-hover)] shadow-sm" : "text-[var(--kf-text-muted)]"}`}>{f.label}</button>)}
        </div>
      </section>
      {!loading && !queryError && menus.length > 0 && <section className="grid grid-cols-2 gap-3" aria-label="Ringkasan penjualan menu">
        <article className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-4 shadow-sm"><p className="text-sm text-[var(--kf-text-muted)]">Total Porsi</p><p className="mt-1 text-2xl font-bold text-[var(--kf-text)]">{aggregated.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("id-ID")}</p></article>
        <article className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-4 shadow-sm"><p className="text-sm text-[var(--kf-text-muted)]">Menu Terlaris</p><p className="mt-1 truncate text-lg font-bold text-[var(--kf-accent-hover)]">{aggregated[0]?.menu_name || "Belum ada"}</p><p className="text-xs text-[var(--kf-text-subtle)]">{aggregated[0] ? `${aggregated[0].quantity} porsi` : "Belum ada penjualan"}</p></article>
      </section>}
      <div className="flex flex-col gap-4 pb-8 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-start">
        {/* Card Menu — Tap untuk pilih qty */}
        <div className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-4 shadow-sm sm:p-5 lg:col-start-1 lg:row-start-1">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-gray-700">
              Pilih Menu Terjual
            </p>
            {totalDipilih > 0 && (
              <span className="text-xs bg-[var(--kf-accent-soft)] text-[var(--kf-accent-hover)] px-2 py-0.5 rounded-full font-medium">
                {totalDipilih} menu dipilih
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : menus.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-400 text-sm mb-3">
                Belum ada menu. Setup dulu!
              </p>
              <button
                onClick={() => navigate("/kelola-menu")}
                className="min-h-11 rounded-[var(--kf-radius-md)] bg-[var(--kf-accent)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--kf-accent-hover)]"
              >
                + Kelola Menu
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {menus.map((menu) => {
                const q = qty[menu.name] || 0;
                const dipilih = q > 0;
                return (
                  <div
                    key={menu.id}
                    className={`rounded-xl border-2 p-3 transition-all ${
                      dipilih
                        ? "border-[var(--kf-accent)] bg-[var(--kf-accent-soft)]"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {/* Nama Menu */}
                    <p
                      className={`text-sm font-semibold mb-3 truncate ${dipilih ? "text-[var(--kf-accent-hover)]" : "text-[var(--kf-text)]"}`}
                    >
                      {menu.name}
                    </p>

                    {/* Stepper */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => changeQty(menu.name, -1)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          q > 0
                            ? "bg-[var(--kf-accent)] text-white"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        <Minus size={14} />
                      </button>

                      <span
                        className={`text-lg font-bold ${dipilih ? "text-green-600" : "text-gray-400"}`}
                      >
                        {q}
                      </span>

                      <button
                        onClick={() => changeQty(menu.name, 1)}
                        className="min-h-10 min-w-10 rounded-lg bg-[var(--kf-accent)] text-white flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status */}
        {status && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl ${
              status.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="text-sm font-medium">{status.msg}</span>
          </div>
        )}

        {queryError && (
          <div role="alert" className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">Gagal memuat rekap menu. Coba muat ulang halaman.</span>
          </div>
        )}

        {/* Tombol Simpan */}
        {totalDipilih > 0 && (
          <button
            onClick={handleSimpan}
            disabled={saving}
            className="w-full min-h-12 rounded-[var(--kf-radius-md)] bg-[var(--kf-accent)] text-white font-bold text-base shadow-sm hover:bg-[var(--kf-accent-hover)] disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : `Simpan Rekap (${totalDipilih} menu)`}
          </button>
        )}

        {/* Filter Tab Ranking */}
        {/* Ranking */}
        <div className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-4 shadow-sm sm:p-5 lg:col-start-2 lg:row-start-1 lg:row-span-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-yellow-500" />
            <p className="font-semibold text-gray-800">Menu Paling Laris</p>
          </div>

          <p className="mb-3 text-sm text-[var(--kf-text-muted)]">{filter === "today" ? "Penjualan hari ini" : "Penjualan 7 hari terakhir"} · {aggregated.reduce((sum, item) => sum + item.quantity, 0)} porsi</p>
          {aggregated.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-[var(--kf-text-muted)] text-sm">Belum ada penjualan menu</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {aggregated.map((item, idx) => (
                <div key={item.menu_name} className="flex items-center gap-3">
                  <div className="w-7 text-center shrink-0">
                    {idx < 3 ? (
                      <Trophy size={16} className={medalColor[idx]} />
                    ) : (
                      <span className="text-gray-400 text-sm font-bold">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.menu_name}
                      </p>
                      <p className="text-sm font-bold text-[var(--kf-accent-hover)] shrink-0 ml-2">
                        {item.quantity} porsi
                      </p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[var(--kf-accent)] h-1.5 rounded-full transition-all"
                        style={{ width: `${(item.quantity / maxQty) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
