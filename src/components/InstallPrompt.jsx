import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => setShow(true), 3000);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
          <img
            src="/assets/kasflow-pwa-192x192.png"
            alt="KasFlow"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">
            Pasang di HP kamu
          </p>
          <p className="text-xs text-gray-500">
            Akses KasFlow lebih mudah
          </p>
        </div>

        <button
          onClick={handleInstall}
          className="min-h-11 bg-[var(--kf-accent)] text-white text-sm font-semibold px-3.5 rounded-[var(--kf-radius-sm)] flex items-center gap-1.5 shrink-0 hover:bg-[var(--kf-accent-hover)]"
        >
          <Download size={14} />
          Pasang
        </button>

        <button
          onClick={() => setShow(false)}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-[var(--kf-radius-sm)] text-[var(--kf-text-muted)] hover:bg-[var(--kf-surface-soft)] hover:text-[var(--kf-text)] shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
