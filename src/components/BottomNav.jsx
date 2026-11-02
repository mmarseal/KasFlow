import { NavLink } from "react-router-dom";
import { BookOpen, ChefHat, LayoutDashboard, PlusCircle } from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Beranda" },
  { to: "/catat", icon: PlusCircle, label: "Catat Transaksi" },
  { to: "/riwayat", icon: BookOpen, label: "Riwayat" },
  { to: "/rekap", icon: ChefHat, label: "Rekap Menu" },
];

export default function BottomNav() {
  return (
    <nav aria-label="Navigasi utama" className="shell-glass shell-bottom-nav fixed inset-x-0 bottom-0 z-50 border-x-0 border-b-0">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-xl items-stretch justify-around px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-t-xl px-1 text-center transition-colors focus-visible:z-10 ${isActive ? "font-semibold text-[var(--kf-accent-hover)]" : "text-[var(--kf-text-muted)] hover:bg-[var(--kf-surface-soft)] hover:text-[var(--kf-text)]"}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={21} strokeWidth={isActive ? 2.4 : 1.9} aria-hidden="true" />
                <span className="text-[13px] leading-tight">{label}</span>
                {isActive && <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-[var(--kf-accent)]" aria-hidden="true" />}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
