import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { LogOut, X } from "lucide-react";

function cssTimes(value) {
  return value.split(",").map((time) => {
    const amount = Number.parseFloat(time);
    return time.trim().endsWith("ms") ? amount : amount * 1000;
  });
}

function motionTime(element, type) {
  if (!element) return 0;
  const styles = window.getComputedStyle(element);
  const durations = cssTimes(styles[`${type}Duration`]);
  const delays = cssTimes(styles[`${type}Delay`]);
  return Math.max(0, ...durations.map((duration, index) => duration + (delays[index % delays.length] || 0)));
}

export default function MobileNavigationDrawer({ phase, onClose, onAnimationEnd, onTransitionEnd, returnFocusRef, items, profileName, profileInitials, businessName, email, onLogout }) {
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const closeButtonRef = useRef(null);
  const present = phase !== "closed";
  const interactive = present && phase !== "closing";

  useLayoutEffect(() => {
    if (!present) return undefined;

    const appShell = document.querySelector(".app-shell");
    const panelElement = panelRef.current;
    const returnFocusElement = returnFocusRef.current;
    const wasInert = appShell?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    if (appShell) appShell.inert = true;
    if (panelElement) panelElement.inert = false;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      if (appShell) appShell.inert = wasInert;
      document.body.style.overflow = previousOverflow;
      if (returnFocusElement?.isConnected) returnFocusElement.focus();
    };
  }, [present, returnFocusRef]);

  useLayoutEffect(() => {
    if (panelRef.current) panelRef.current.inert = !interactive;
  }, [present, interactive]);

  useEffect(() => {
    if (!interactive) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [interactive, onClose]);

  useEffect(() => {
    if (phase !== "opening" && phase !== "closing") return undefined;

    const elements = [panelRef.current, backdropRef.current];
    const motionType = phase === "opening" ? "animation" : "transition";
    const duration = Math.max(0, ...elements.map((element) => motionTime(element, motionType)));
    const timer = window.setTimeout(() => {
      if (phase === "opening") {
        onAnimationEnd();
      } else {
        onTransitionEnd("drawer");
        onTransitionEnd("backdrop");
      }
    }, duration + (duration ? 50 : 0));

    return () => window.clearTimeout(timer);
  }, [phase, onAnimationEnd, onTransitionEnd]);

  function finishTransition(part, event, propertyName) {
    if (phase !== "closing" || event.target !== event.currentTarget || event.propertyName !== propertyName) return;
    onTransitionEnd(part);
  }

  if (!present) return null;

  return createPortal(
    <>
    <div
      ref={backdropRef}
      aria-hidden="true"
      onTransitionEnd={(event) => finishTransition("backdrop", event, "opacity")}
      className={`mobile-navigation-backdrop fixed inset-0 z-[100] ${phase === "closing" ? "is-closing" : phase === "opening" ? "is-entering" : ""}`}
    />
    <div
      ref={panelRef}
      id="mobile-navigation-dialog"
      role="dialog"
      aria-modal={interactive ? "true" : undefined}
      aria-labelledby="mobile-navigation-title"
      aria-hidden={!interactive}
      inert={!interactive}
      onTransitionEnd={(event) => finishTransition("drawer", event, "transform")}
      onAnimationEnd={(event) => {
        if (phase === "opening" && event.target === event.currentTarget && event.animationName === "mobile-navigation-enter") onAnimationEnd();
      }}
      className={`mobile-navigation-drawer fixed inset-0 z-[101] h-[100dvh] w-screen overflow-y-auto bg-[#f0f5fa] ${phase === "closing" ? "is-closing" : phase === "opening" ? "is-entering" : ""}`}
    >
      <div className="flex min-h-full flex-col">
        <div className="shell-mobile-header flex min-h-16 items-center justify-between border-b border-[var(--kf-border)] bg-white px-5 py-3">
          <img src="/assets/kasflow-logo-horizontal.png" alt="KasFlow" className="h-8 w-auto max-w-[9rem] object-contain" />
          <h2 id="mobile-navigation-title" className="sr-only">Menu navigasi</h2>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Tutup menu navigasi" className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[var(--kf-radius-md)] text-[var(--kf-text-muted)] transition hover:bg-[var(--kf-surface-soft)] hover:text-[var(--kf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kf-accent)]">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-4 py-5">
          <ul className="mx-auto flex w-full max-w-xl flex-col gap-2">
            {items.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-[var(--kf-radius-md)] border px-4 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kf-accent)] ${isActive ? "border-[var(--kf-accent-soft)] bg-[var(--kf-accent-soft)] text-[var(--kf-accent-hover)]" : "border-transparent bg-white/80 text-[var(--kf-text)] hover:border-[var(--kf-border)] hover:bg-white"}`}
                >
                  {({ isActive }) => <><Icon size={20} strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" /><span>{label}</span></>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[var(--kf-border)] bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-xl items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--kf-accent-soft)] text-sm font-bold text-[var(--kf-accent-hover)]" aria-hidden="true">{profileInitials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--kf-text)]">{profileName}</p>
              <p className="truncate text-xs text-[var(--kf-text-muted)]">Pemilik usaha{businessName ? ` · ${businessName}` : ""}</p>
              {email && <p className="truncate text-xs text-[var(--kf-text-subtle)]">{email}</p>}
            </div>
          </div>
          <button type="button" onClick={onLogout} className="mx-auto mt-3 flex min-h-12 w-full max-w-xl items-center gap-3 rounded-[var(--kf-radius-md)] px-4 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kf-accent)]">
            <LogOut size={19} aria-hidden="true" /> Keluar
          </button>
        </div>
      </div>
    </div>
    </>,
    document.body,
  );
}
