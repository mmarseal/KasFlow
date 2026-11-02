import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, Utensils, Pencil, X } from "lucide-react";

export default function KelolaMenu() {
  const { business } = useAuth();
  const [refreshToken, setRefreshToken] = useState(0);
  const [queryResult, setQueryResult] = useState({ key: null, menus: [], error: null });
  const [newName, setNewName] = useState("");
  const [editingMenu, setEditingMenu] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const businessId = business?.id ?? null;
  const queryKey = JSON.stringify([businessId, refreshToken]);
  const currentResult = businessId && queryResult.key === queryKey ? queryResult : null;
  const menus = currentResult?.menus ?? [];
  const queryError = currentResult?.error ?? null;
  const loading = Boolean(businessId) && !currentResult;

  useEffect(() => {
    if (!businessId) return undefined;

    let active = true;
    async function loadMenus() {
      try {
        const { data, error } = await supabase
          .from("menus")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: true });

        if (!active) return;
        setQueryResult({ key: queryKey, menus: error ? [] : (data || []), error: error?.message ?? null });
      } catch (error) {
        if (active) setQueryResult({ key: queryKey, menus: [], error: error.message || "Gagal memuat menu." });
      }
    }

    loadMenus();
    return () => { active = false };
  }, [businessId, queryKey]);

  async function handleTambah() {
    setError("");
    if (!newName.trim()) return setError("Nama menu tidak boleh kosong.");
    const duplikat = menus.find(
      (m) => m.name.toLowerCase() === newName.trim().toLowerCase(),
    );
    if (duplikat) return setError("Menu sudah ada di daftar.");
    if (!business?.id)
      return setError("Data bisnis tidak ditemukan. Harap login ulang.");

    setSaving(true);
    const { error } = await supabase.from("menus").insert({
      business_id: business.id,
      name: newName.trim(),
    });
    if (!error) {
      setNewName("");
      setRefreshToken((token) => token + 1);
    } else setError("Gagal menyimpan. Coba lagi.");
    setSaving(false);
  }

  async function toggleAktif(menu) {
    if (!business?.id) return;
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("menus")
        .update({ is_active: !menu.is_active })
        .eq("id", menu.id)
        .eq("business_id", business.id);
      if (updateError) {
        setError("Gagal memperbarui status menu. Coba lagi.");
        return;
      }
    } catch {
      setError("Gagal memperbarui status menu. Coba lagi.");
      return;
    }
    setQueryResult((prev) => prev.key === queryKey ? {
      ...prev,
      menus: prev.menus.map((m) => m.id === menu.id ? { ...m, is_active: !m.is_active } : m),
    } : prev);
  }

  function openEdit(menu) {
    setError("");
    setEditingMenu(menu);
    setEditName(menu.name);
  }

  function closeEdit() {
    if (editSaving) return;
    setEditingMenu(null);
    setEditName("");
  }

  async function handleEdit(event) {
    event.preventDefault();
    const trimmedName = editName.trim();
    if (!trimmedName) return setError("Nama menu tidak boleh kosong.");
    const duplicate = menus.find((menu) => menu.id !== editingMenu?.id && menu.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) return setError("Menu sudah ada di daftar.");
    if (!business?.id || !editingMenu?.id) return setError("Data bisnis atau menu tidak ditemukan. Harap muat ulang.");

    setEditSaving(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("menus")
        .update({ name: trimmedName })
        .eq("id", editingMenu.id)
        .eq("business_id", business.id);
      if (updateError) {
        setError("Gagal memperbarui menu. Coba lagi.");
        return;
      }
      setQueryResult((prev) => prev.key === queryKey ? {
        ...prev,
        menus: prev.menus.map((menu) => menu.id === editingMenu.id ? { ...menu, name: trimmedName } : menu),
      } : prev);
      setEditingMenu(null);
      setEditName("");
    } catch {
      setError("Gagal memperbarui menu. Coba lagi.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleHapus(id) {
    if (!business?.id) return;
    setError("");
    try {
      const { error: deleteError } = await supabase
        .from("menus")
        .delete()
        .eq("id", id)
        .eq("business_id", business.id);
      if (deleteError) {
        setError("Gagal menghapus menu. Coba lagi.");
        return;
      }
    } catch {
      setError("Gagal menghapus menu. Coba lagi.");
      return;
    }
    setQueryResult((prev) => prev.key === queryKey ? {
      ...prev,
      menus: prev.menus.filter((m) => m.id !== id),
    } : prev);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-8">
      <header><p className="text-sm text-[var(--kf-text-muted)]">Kelola menu yang tersedia untuk usaha Anda.</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--kf-text)] sm:text-3xl">Kelola Menu</h1></header>

      <section className="rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="add-menu-title">
        <h2 id="add-menu-title" className="mb-3 text-base font-semibold text-[var(--kf-text)]">Tambah Menu</h2>
        <form onSubmit={(event) => { event.preventDefault(); handleTambah(); }} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="new-menu-name" className="sr-only">Nama menu</label>
          <input id="new-menu-name" type="text" placeholder="Contoh: Ayam Bakar" value={newName} onChange={(e) => { setNewName(e.target.value); setError(""); }} className="min-h-12 min-w-0 flex-1 rounded-[var(--kf-radius-md)] border border-[var(--kf-border-strong)] px-4 text-base text-[var(--kf-text)] outline-none focus:border-[var(--kf-accent)]" />
          <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--kf-radius-md)] bg-[var(--kf-accent)] px-5 text-base font-semibold text-white shadow-sm transition hover:bg-[var(--kf-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={19} />{saving ? "Menyimpan..." : "Tambah Menu"}</button>
        </form>
        {error && <div role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-rose-700"><AlertCircle size={17} />{error}</div>}
      </section>

      <section className="overflow-hidden rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white shadow-sm" aria-labelledby="menu-list-title">
        <div className="flex items-center justify-between border-b border-[var(--kf-border)] px-4 py-4 sm:px-5"><div><h2 id="menu-list-title" className="font-semibold text-[var(--kf-text)]">Daftar Menu</h2><p className="mt-0.5 text-sm text-[var(--kf-text-muted)]">{menus.length} menu terdaftar</p></div></div>
        {queryError && <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Gagal memuat menu. Coba muat ulang halaman.</div>}
        {loading ? <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--kf-surface-soft)]" />)}</div> : menus.length === 0 ? (
          <div className="px-5 py-10 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kf-surface-soft)] text-[var(--kf-text-subtle)]"><Utensils size={23} /></span><h3 className="mt-3 font-semibold text-[var(--kf-text)]">Belum ada menu</h3><p className="mt-1 text-sm text-[var(--kf-text-muted)]">Tambahkan menu pertama usaha Anda melalui formulir di atas.</p></div>
        ) : <>
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_10rem] items-center gap-4 bg-[var(--kf-surface-soft)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--kf-text-subtle)] sm:grid"><span>Nama Menu</span><span>Status</span><span className="text-right">Aksi</span></div>
          <ul className="divide-y divide-[var(--kf-border)]">
            {menus.map((menu) => <li key={menu.id} className="flex flex-col gap-3 px-4 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_8rem_10rem] sm:items-center sm:gap-4 sm:px-5">
              <p className={`break-words text-base font-semibold ${menu.is_active ? "text-[var(--kf-text)]" : "text-[var(--kf-text-muted)]"}`}>{menu.name}</p>
              <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${menu.is_active ? "bg-[var(--kf-accent-soft)] text-[var(--kf-accent-hover)]" : "bg-gray-100 text-gray-600"}`}>{menu.is_active ? "Aktif" : "Nonaktif"}</span>
              <div className="flex items-center justify-end gap-2">
                <button type="button" aria-label={`Edit ${menu.name}`} onClick={() => openEdit(menu)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--kf-radius-sm)] text-[var(--kf-accent-hover)] hover:bg-[var(--kf-accent-soft)]"><Pencil size={18} /></button>
                <button type="button" aria-label={`${menu.is_active ? "Nonaktifkan" : "Aktifkan"} ${menu.name}`} aria-pressed={menu.is_active} onClick={() => toggleAktif(menu)} className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--kf-radius-sm)] border px-3 text-sm font-semibold transition ${menu.is_active ? "border-[var(--kf-border)] text-[var(--kf-text-muted)] hover:bg-[var(--kf-surface-soft)]" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>{menu.is_active ? <ToggleRight size={21} /> : <ToggleLeft size={21} />}{menu.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                <button type="button" aria-label={`Hapus ${menu.name}`} onClick={() => handleHapus(menu.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--kf-radius-sm)] text-rose-700 hover:bg-rose-50"><Trash2 size={18} /></button>
              </div>
            </li>)}
          </ul>
        </>}
      </section>
      {editingMenu && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEdit(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="edit-menu-title" className="w-full max-w-md rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-5 shadow-2xl sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="edit-menu-title" className="text-lg font-bold text-[var(--kf-text)]">Edit Menu</h2><p className="mt-1 text-sm text-[var(--kf-text-muted)]">Perbarui nama menu.</p></div><button type="button" aria-label="Tutup" onClick={closeEdit} disabled={editSaving} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--kf-radius-sm)] text-[var(--kf-text-muted)] hover:bg-[var(--kf-surface-soft)] disabled:opacity-50"><X size={18} /></button></div>
          <form onSubmit={handleEdit} className="flex flex-col gap-4"><label htmlFor="edit-menu-name" className="text-sm font-medium text-[var(--kf-text-muted)]">Nama Menu</label><input id="edit-menu-name" autoFocus value={editName} onChange={(event) => { setEditName(event.target.value); setError(""); }} maxLength={120} disabled={editSaving} className="min-h-12 w-full rounded-[var(--kf-radius-sm)] border border-[var(--kf-border-strong)] px-4 text-base text-[var(--kf-text)] outline-none focus:border-[var(--kf-accent)] disabled:bg-[var(--kf-surface-soft)]" />{error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={closeEdit} disabled={editSaving} className="min-h-11 rounded-[var(--kf-radius-sm)] border border-[var(--kf-border)] px-4 text-sm font-semibold text-[var(--kf-text-muted)] disabled:opacity-50">Batal</button><button type="submit" disabled={editSaving || !editName.trim()} className="min-h-11 rounded-[var(--kf-radius-sm)] bg-[var(--kf-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--kf-accent-hover)] disabled:opacity-50">{editSaving ? "Menyimpan…" : "Simpan"}</button></div></form>
        </section>
      </div>}
    </div>
  );
}
