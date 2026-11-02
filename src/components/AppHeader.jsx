import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Banknote, ChevronDown, Download, FileDown, LogOut, Menu, Plus, Search, Settings, UtensilsCrossed, X } from "lucide-react";
import MobileNavigationDrawer from "./MobileNavigationDrawer";

const PERIODS = [
  { label: "7 Hari Terakhir", value: "7days" },
  { label: "Bulan Ini", value: "month" },
  { label: "3 Bulan Terakhir", value: "3months" },
];

const SHORTCUTS = [
  { label: "Catat Transaksi", detail: "Tambah pemasukan atau pengeluaran", keywords: "catat transaksi pemasukan pengeluaran", to: "/catat", icon: Plus },
  { label: "Riwayat Transaksi", detail: "Tinjau dan cari catatan transaksi", keywords: "riwayat transaksi catatan", to: "/riwayat", icon: FileDown },
  { label: "Kelola Menu", detail: "Buka daftar menu usaha", keywords: "menu kelola daftar", to: "/kelola-menu", icon: UtensilsCrossed },
  { label: "Rekap Menu", detail: "Lihat ringkasan penjualan menu", keywords: "rekap menu penjualan", to: "/rekap", icon: Banknote },
  { label: "Export Laporan", detail: "Unduh laporan PDF atau Excel", keywords: "export laporan pdf excel", to: "/export", icon: Download },
];

export default function AppHeader({ user, businessName, period, setPeriod, onLogout, navigationItems }) {
  const { pathname } = useLocation();
  const isDashboard = pathname === "/dashboard";
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 8);
  const [drawerPhase, setDrawerPhase] = useState("closed");
  const drawerPhaseRef = useRef("closed");
  const pendingDrawerTransitionsRef = useRef(new Set());
  const menuButtonRef = useRef(null);
  const profileName = user?.user_metadata?.nama || user?.email?.split("@")[0] || "Pengguna";
  const profileInitials = profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const matchingShortcuts = SHORTCUTS.filter(({ label, keywords }) =>
    `${label} ${keywords}`.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );
  const updateDrawerPhase = useCallback((phase) => {
    drawerPhaseRef.current = phase;
    setDrawerPhase(phase);
  }, []);
  const openDrawer = useCallback(() => {
    pendingDrawerTransitionsRef.current.clear();
    updateDrawerPhase("opening");
  }, [updateDrawerPhase]);
  const closeDrawer = useCallback(() => {
    const currentPhase = drawerPhaseRef.current;
    if (currentPhase === "closed" || currentPhase === "closing") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pendingDrawerTransitionsRef.current.clear();
      updateDrawerPhase("closed");
      return;
    }
    pendingDrawerTransitionsRef.current = new Set(["drawer", "backdrop"]);
    updateDrawerPhase("closing");
  }, [updateDrawerPhase]);
  const handleDrawerAnimationEnd = useCallback(() => {
    if (drawerPhaseRef.current === "opening") updateDrawerPhase("open");
  }, [updateDrawerPhase]);
  const handleDrawerTransitionEnd = useCallback((part) => {
    if (drawerPhaseRef.current !== "closing") return;
    pendingDrawerTransitionsRef.current.delete(part);
    if (pendingDrawerTransitionsRef.current.size === 0) updateDrawerPhase("closed");
  }, [updateDrawerPhase]);
  const drawerOpen = drawerPhase === "opening" || drawerPhase === "open";

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    function focusAppSearch(event) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && (
        target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );
      if (event.key !== "/" || isTyping || event.metaKey || event.ctrlKey || event.altKey) return;
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile && isDashboard) return;
      event.preventDefault();
      if (isMobile) setMobileSearchOpen(true);
      searchRef.current?.focus();
      setSearchOpen(true);
    }
    document.addEventListener("keydown", focusAppSearch);
    return () => document.removeEventListener("keydown", focusAppSearch);
  }, [isDashboard]);

  function chooseShortcut(to) {
    setSearchTerm("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
    navigate(to);
  }

  const compactSearch = !isDashboard && !mobileSearchOpen;
  const searchWrapperMobileClass = isDashboard
    ? "max-md:hidden"
    : mobileSearchOpen
      ? "max-md:fixed max-md:inset-x-3 max-md:top-3 max-md:z-10"
      : "max-md:w-12";

  return (
    <>
    <header className={`app-header sticky top-0 z-30 ${isScrolled ? "is-scrolled" : ""} ${mobileSearchOpen ? "max-md:z-[60]" : ""}`}>
      <div className="mx-auto grid w-full max-w-[88rem] grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-1 px-3 py-3 sm:px-6 md:grid-cols-1 md:items-center md:gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
        <div className="flex h-12 min-w-0 items-center md:hidden">
          <img src="/assets/kasflow-logo-horizontal.png" alt="KasFlow" className="h-8 w-auto max-w-[5.5rem] object-contain" />
        </div>
        <div className={`group relative col-start-3 row-start-1 min-w-0 md:col-start-1 md:row-start-1 ${searchWrapperMobileClass}`}>
          <label htmlFor="app-search" className="sr-only">Cari transaksi, menu, atau laporan</label>
          <Search size={19} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kf-text-subtle)] transition-colors group-focus-within:text-[var(--kf-accent)] sm:left-4" aria-hidden="true" />
          <input
            ref={searchRef}
            id="app-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => {
              setSearchOpen(true);
              if (!isDashboard && window.matchMedia("(max-width: 767px)").matches) setMobileSearchOpen(true);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
                setSearchOpen(false);
                setMobileSearchOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSearchOpen(false);
                setMobileSearchOpen(false);
              }
              if (event.key === "Enter" && searchTerm.trim()) {
                event.preventDefault();
                chooseShortcut(matchingShortcuts[0]?.to || "/riwayat");
              }
            }}
            placeholder="Cari transaksi, menu, atau laporan..."
            aria-describedby="app-search-hint"
            aria-expanded={searchOpen}
            aria-controls="app-search-shortcuts"
            className={`min-h-12 w-full min-w-0 rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] bg-white py-2 pl-9 pr-10 text-base text-[var(--kf-text)] shadow-[var(--kf-shadow-card)] outline-none transition placeholder:text-transparent hover:border-[var(--kf-border-strong)] focus:border-[var(--kf-accent)] focus:ring-2 focus:ring-[var(--kf-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kf-accent)] sm:pl-11 sm:pr-16 sm:placeholder:text-[var(--kf-text-subtle)] sm:hover:placeholder:text-[var(--kf-text-muted)] ${compactSearch ? "max-md:w-12 max-md:px-0 max-md:text-transparent max-md:placeholder:text-transparent max-md:caret-transparent max-md:cursor-pointer" : ""}`}
          />
          {mobileSearchOpen && !searchTerm && <span aria-hidden="true" className="pointer-events-none absolute left-9 right-12 top-1/2 hidden -translate-y-1/2 truncate text-sm text-[var(--kf-text-subtle)] max-sm:block">Cari transaksi, menu, atau laporan...</span>}
          {mobileSearchOpen && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setMobileSearchOpen(false); setSearchOpen(false); searchRef.current?.blur(); }} aria-label="Tutup pencarian" className="absolute right-1.5 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[var(--kf-radius-sm)] text-[var(--kf-text-muted)] hover:bg-[var(--kf-surface-soft)] md:hidden"><X size={19} aria-hidden="true" /></button>}
          <span id="app-search-hint" className="sr-only">Tekan garis miring untuk memfokuskan pencarian. Ini mencari pintasan halaman; untuk mencari catatan, gunakan Riwayat Transaksi.</span>
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs font-semibold text-[var(--kf-text-subtle)] md:block">/</kbd>
          {searchOpen && (
            <div id="app-search-shortcuts" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] bg-white p-2 shadow-[var(--kf-shadow-md)]">
              {matchingShortcuts.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {matchingShortcuts.map(({ label, detail, to, icon: Icon }) => (
                    <button key={to} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseShortcut(to)} className="flex min-h-12 items-center gap-3 rounded-[var(--kf-radius-sm)] px-3 text-left transition-colors hover:bg-[var(--kf-surface-soft)] focus-visible:bg-[var(--kf-surface-soft)]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--kf-radius-sm)] bg-[var(--kf-accent-soft)] text-[var(--kf-accent)]"><Icon size={18} aria-hidden="true" /></span>
                      <span className="min-w-0"><span className="block text-sm font-semibold text-[var(--kf-text)]">{label}</span><span className="block truncate text-xs text-[var(--kf-text-muted)]">{detail}</span></span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-[var(--kf-text)]">Tidak ada pintasan yang cocok.</p>
                  <p className="mt-0.5 text-xs text-[var(--kf-text-muted)]">Cari catatan transaksi dari halaman Riwayat.</p>
                  <button type="button" onClick={() => chooseShortcut("/riwayat")} className="mt-2 min-h-10 rounded-[var(--kf-radius-sm)] px-2 text-sm font-semibold text-[var(--kf-accent-hover)] hover:bg-[var(--kf-accent-soft)]">Buka Riwayat Transaksi</button>
                </div>
              )}
              <p className="border-t border-[var(--kf-border)] px-3 pt-2 text-xs text-[var(--kf-text-subtle)]">Pintasan halaman. Untuk mencari catatan, gunakan Riwayat Transaksi.</p>
            </div>
          )}
        </div>

        <div className="col-start-4 row-start-1 flex items-center justify-end gap-1 md:col-start-1 md:row-start-2 md:gap-3 lg:col-start-2 lg:row-start-1">
          {isDashboard && (
            <div className="md:contents">
              <label htmlFor="app-period" className="sr-only">Periode ringkasan</label>
              <div className="relative min-w-36 shrink-0">
                <select id="app-period" value={period} onChange={(event) => setPeriod(event.target.value)} className="min-h-12 w-full appearance-none rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] bg-white px-3 pr-9 text-sm font-semibold text-[var(--kf-text)] shadow-[var(--kf-shadow-card)] outline-none transition-colors hover:border-[var(--kf-border-strong)] hover:bg-[var(--kf-surface-soft)] focus:border-[var(--kf-accent)] focus:ring-2 focus:ring-[var(--kf-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kf-accent)]">
                  {PERIODS.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kf-text-muted)]" aria-hidden="true" />
              </div>
            </div>
          )}

          <details ref={profileMenuRef} className="group relative hidden md:block">
            <summary aria-label={`Profil ${profileName}, Pemilik usaha`} className="flex min-h-12 cursor-pointer list-none items-center gap-0 rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] bg-white px-3 text-left text-[var(--kf-text)] shadow-[var(--kf-shadow-card)] transition-colors hover:border-[var(--kf-border-strong)] hover:bg-[var(--kf-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kf-accent)] group-open:bg-[var(--kf-surface-soft)] group-open:text-[var(--kf-accent-hover)] sm:gap-3 sm:px-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kf-accent-soft)] text-sm font-bold text-[var(--kf-accent-hover)]" aria-hidden="true">{profileInitials}</span>
              <span className="hidden min-w-0 sm:block"><span className="block max-w-36 truncate text-sm font-semibold text-[var(--kf-text)]">{profileName}</span><span className="block text-xs text-[var(--kf-text-muted)]">Pemilik usaha</span></span>
              <ChevronDown size={16} className="hidden shrink-0 text-[var(--kf-text-muted)] transition-transform group-open:rotate-180 sm:block" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-[var(--kf-radius-md)] border border-[var(--kf-border)] bg-white p-2 shadow-[var(--kf-shadow-md)]">
              <p className="truncate px-3 py-2 text-xs text-[var(--kf-text-muted)]">{user?.email || profileName}</p>
              <button type="button" onClick={() => { navigate("/settings"); if (profileMenuRef.current) profileMenuRef.current.open = false; }} className="flex min-h-11 w-full items-center gap-2 rounded-[var(--kf-radius-sm)] px-3 text-left text-sm font-medium text-[var(--kf-text)] hover:bg-[var(--kf-surface-soft)]"><Settings size={17} aria-hidden="true" /> Pengaturan akun</button>
              <button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-2 rounded-[var(--kf-radius-sm)] px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"><LogOut size={17} aria-hidden="true" /> Keluar</button>
            </div>
          </details>

          <button ref={menuButtonRef} type="button" onClick={() => { setMobileSearchOpen(false); setSearchOpen(false); openDrawer(); }} aria-label="Buka menu navigasi" aria-haspopup="dialog" aria-controls="mobile-navigation-dialog" aria-expanded={drawerOpen} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--kf-radius-md)] text-[var(--kf-text)] transition-colors hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kf-accent)] md:hidden">
            <Menu size={23} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
    <MobileNavigationDrawer phase={drawerPhase} onClose={closeDrawer} onAnimationEnd={handleDrawerAnimationEnd} onTransitionEnd={handleDrawerTransitionEnd} returnFocusRef={menuButtonRef} items={navigationItems} profileName={profileName} profileInitials={profileInitials} businessName={businessName} email={user?.email} onLogout={onLogout} />
    </>
  );
}
