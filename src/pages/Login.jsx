import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { Eye, EyeOff, AlertCircle, CircleCheck, Sparkles, Mail, LockKeyhole, UserRound, Wallet, ChartColumnIncreasing, FileText, ArrowRight } from 'lucide-react'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ nama: '', email: '', password: '' })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault()
    if (loading) return

    setError('')
    setSuccess('')

    if (!form.nama.trim()) return setError('Nama wajib diisi.')
    if (!form.email.trim()) return setError('Email wajib diisi.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Format email belum valid.')
    if (!form.password) return setError('Password wajib diisi.')
    if (form.password.length < 6) return setError('Password minimal 6 karakter.')
    if (!confirmPassword) return setError('Konfirmasi password wajib diisi.')
    if (form.password !== confirmPassword) return setError('Password dan konfirmasi password tidak cocok.')

    setLoading(true)
    try {
      const { error, session, sessionCleanupError } = await signUp(form.email.trim(), form.password, form.nama.trim())
      if (error) {
        setError('Pendaftaran gagal. Periksa email Anda atau coba lagi.')
        return
      }

      setForm(prev => ({ ...prev, password: '' }))
      setConfirmPassword('')

      if (sessionCleanupError && session) {
        setError('Akun berhasil dibuat, tetapi sesi aktif tidak dapat ditutup dengan aman. Anda akan tetap masuk dan mungkin diarahkan ke Dashboard.')
        return
      }

      if (sessionCleanupError) {
        setSuccess('Akun berhasil dibuat dan sesi lokal sudah tidak aktif, tetapi proses sign-out melaporkan kesalahan. Silakan masuk.')
      } else {
        setSuccess('Akun berhasil dibuat. Silakan masuk. Jika diminta, konfirmasi email Anda terlebih dahulu.')
      }
      setMode('login')
    } catch {
      setError('Pendaftaran gagal. Periksa koneksi Anda lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    if (loading) return

    setError('')
    setSuccess('')

    if (!form.email || !form.password) return setError('Email dan password wajib diisi.')
    if (form.password.length < 6) return setError('Password minimal 6 karakter.')

    setLoading(true)
    try {
      const { error } = await signIn(form.email, form.password)
      if (error) setError('Email atau password salah.')
    } catch {
      setError('Email atau password salah.')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'register') {
    const registerNameInvalid = error === 'Nama wajib diisi.'
    const registerEmailInvalid = error === 'Email wajib diisi.' || error === 'Format email belum valid.'
    const registerPasswordInvalid = error === 'Password wajib diisi.' || error === 'Password minimal 6 karakter.'
    const registerConfirmInvalid = error === 'Konfirmasi password wajib diisi.' || error === 'Password dan konfirmasi password tidak cocok.'

    return (
      <div className="relative isolate min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f9fcff_0%,#f1faff_52%,#f3fffb_100%)] text-[var(--kf-text)] lg:grid lg:grid-cols-2">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-40 top-12 h-[36rem] w-[30rem] rounded-[46%_54%_57%_43%] bg-gradient-to-br from-white via-emerald-100/90 to-cyan-200/80 blur-[3.5rem]" />
          <div className="absolute left-[31%] top-[12%] h-[48rem] w-[38rem] rounded-[44%_56%_38%_62%] bg-gradient-to-br from-sky-200/80 via-cyan-100/90 to-emerald-100/80 blur-[3rem]" />
          <div className="absolute -right-32 -top-28 h-[38rem] w-[36rem] rounded-[48%_52%_58%_42%] bg-gradient-to-br from-cyan-100/95 to-teal-200/85 blur-[3rem]" />
          <div className="absolute -bottom-56 -right-28 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tl from-emerald-100/90 to-cyan-200/80 blur-[3rem]" />
        </div>

        <section aria-labelledby="register-hero-heading" className="relative z-10 hidden min-h-screen lg:flex">
          <div className="flex min-h-screen w-full flex-col px-8 py-10 lg:px-[17.5%] lg:py-[5.8vh]">
            <img src="/assets/kasflow-logo-horizontal.png" alt="KasFlow" className="h-16 w-auto self-start object-contain" />

            <div className="mt-8 max-w-[36rem]">
              <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-100/90 bg-white/65 px-4 py-2 text-sm font-medium text-[var(--kf-accent-hover)] shadow-sm backdrop-blur-sm">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[var(--kf-accent)]" aria-hidden="true">
                  <Sparkles size={13} />
                </span>
                Mulai kelola keuangan usaha
              </p>

              <h1 id="register-hero-heading" className="text-5xl font-bold leading-[1.08] tracking-tight text-[var(--kf-text)] 2xl:text-[3.25rem]">
                <span className="block">Mulai mencatat</span>
                <span className="block">keuangan usahamu</span>
                <span className="block text-[var(--kf-accent)]">di KasFlow.</span>
              </h1>

              <p className="mt-5 max-w-[34rem] text-lg leading-[1.55] text-slate-600 xl:text-xl">
                Buat akun untuk mencatat transaksi dan melihat ringkasan usaha dari satu tempat.
              </p>

              <ul className="mt-9 space-y-5">
                <li className="flex items-center gap-6">
                  <span className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 shadow-sm ring-1 ring-white/80">
                    <Wallet size={29} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-base font-semibold text-[var(--kf-text)]">Catat transaksi harian</span>
                    <span className="mt-1 block max-w-[18rem] text-sm leading-5 text-slate-500">Pencatatan pemasukan dan pengeluaran yang mudah.</span>
                  </span>
                </li>
                <li className="flex items-center gap-6">
                  <span className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 text-blue-500 shadow-sm ring-1 ring-white/80">
                    <ChartColumnIncreasing size={29} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-base font-semibold text-[var(--kf-text)]">Pantau ringkasan keuangan</span>
                    <span className="mt-1 block max-w-[18rem] text-sm leading-5 text-slate-500">Lihat perkembangan usaha dalam satu dashboard.</span>
                  </span>
                </li>
                <li className="flex items-center gap-6">
                  <span className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 text-violet-500 shadow-sm ring-1 ring-white/80">
                    <FileText size={28} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-base font-semibold text-[var(--kf-text)]">Unduh laporan PDF dan Excel</span>
                    <span className="mt-1 block max-w-[18rem] text-sm leading-5 text-slate-500">Siap untuk pembukuan dan keperluan lainnya.</span>
                  </span>
                </li>
              </ul>
            </div>

            <footer className="mt-auto flex items-center gap-3 pt-8 text-xs text-slate-500">
              <span className="h-px w-10 bg-slate-300" aria-hidden="true" />
              Pencatatan keuangan untuk usaha sehari-hari.
            </footer>
          </div>
        </section>

        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-10 xl:px-12">
          <div className="w-full max-w-[39.5rem]">
            <section aria-labelledby="register-form-heading" className="rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/60 via-white/30 to-rose-100/35 p-7 shadow-2xl shadow-slate-900/10 ring-1 ring-white/35 backdrop-blur-[32px] sm:p-9 xl:p-12">
              <header className="mb-6 text-center sm:mb-7">
                <img src="/assets/kasflow-logo-vertical.png" alt="KasFlow" className="mx-auto mb-4 h-24 w-auto object-contain sm:h-28" />
                <h1 id="register-form-heading" className="text-[1.7rem] font-bold tracking-tight text-slate-900 sm:text-3xl">Buat akun KasFlow</h1>
                <p className="mt-2 text-base text-slate-500 sm:text-lg">Mulai kelola keuangan usaha Anda dengan lebih mudah.</p>
              </header>

              <form noValidate onSubmit={handleRegisterSubmit} aria-busy={loading} className="mr-3 flex flex-col gap-4 sm:mr-4 sm:gap-5 xl:mr-6">
                {error && (
                  <div id="register-error" role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="relative">
                  <label htmlFor="register-name" className="sr-only">Nama</label>
                  <UserRound size={21} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="register-name"
                    type="text"
                    name="nama"
                    autoComplete="name"
                    required
                    value={form.nama}
                    onChange={handleChange}
                    placeholder="Nama lengkap"
                    aria-invalid={registerNameInvalid}
                    aria-describedby={registerNameInvalid ? 'register-error' : undefined}
                    className="min-h-[3.5rem] w-full rounded-2xl border border-white/90 bg-white/75 py-3.5 pl-14 pr-5 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-500 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100/80"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="register-email" className="sr-only">Email</label>
                  <Mail size={21} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck="false"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    aria-invalid={registerEmailInvalid}
                    aria-describedby={registerEmailInvalid ? 'register-error' : undefined}
                    className="min-h-[3.5rem] w-full rounded-2xl border border-white/90 bg-white/75 py-3.5 pl-14 pr-5 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-500 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100/80"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="register-password" className="sr-only">Password</label>
                  <LockKeyhole size={21} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="register-password"
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password (minimal 6 karakter)"
                    aria-invalid={registerPasswordInvalid}
                    aria-describedby={registerPasswordInvalid ? 'register-error' : undefined}
                    className="min-h-[3.5rem] w-full rounded-2xl border border-white/90 bg-white/75 py-3.5 pl-14 pr-16 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-500 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    aria-pressed={showPass}
                    className="absolute right-3 top-1/2 inline-flex min-h-10 min-w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100/80 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    {showPass ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                  </button>
                </div>

                <div className="relative">
                  <label htmlFor="register-confirm-password" className="sr-only">Konfirmasi password</label>
                  <LockKeyhole size={21} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPass ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={event => { setConfirmPassword(event.target.value); setError(''); setSuccess('') }}
                    placeholder="Konfirmasi password"
                    aria-invalid={registerConfirmInvalid}
                    aria-describedby={registerConfirmInvalid ? 'register-error' : undefined}
                    className="min-h-[3.5rem] w-full rounded-2xl border border-white/90 bg-white/75 py-3.5 pl-14 pr-16 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-500 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    aria-label={showConfirmPass ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
                    aria-pressed={showConfirmPass}
                    className="absolute right-3 top-1/2 inline-flex min-h-10 min-w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100/80 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    {showConfirmPass ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 inline-flex min-h-[3.5rem] w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-600 to-teal-800 px-5 text-lg font-bold text-white shadow-lg shadow-emerald-900/15 transition duration-200 hover:brightness-105 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Memproses...' : 'Buat akun'}
                  {!loading && <ArrowRight size={21} aria-hidden="true" />}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500 sm:mt-7 sm:text-base">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); setShowRecoveryInfo(false) }}
                  className="cursor-pointer rounded-sm font-semibold text-sky-600 underline-offset-4 hover:text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Masuk
                </button>
              </p>
            </section>
          </div>
        </main>
      </div>
    )
  }

  const loginEmailInvalid = Boolean(error) && (
    error === 'Email atau password salah.' ||
    (error === 'Email dan password wajib diisi.' && !form.email)
  )
  const loginPasswordInvalid = Boolean(error) && (
    error === 'Email atau password salah.' ||
    (error === 'Email dan password wajib diisi.' && !form.password) ||
    error === 'Password minimal 6 karakter.'
  )

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f9fcff_0%,#f1faff_52%,#f3fffb_100%)] text-[var(--kf-text)] lg:grid lg:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 top-12 h-[36rem] w-[30rem] rounded-[46%_54%_57%_43%] bg-gradient-to-br from-white via-emerald-100/90 to-cyan-200/80 blur-[3.5rem]" />
        <div className="absolute left-[31%] top-[12%] h-[48rem] w-[38rem] rounded-[44%_56%_38%_62%] bg-gradient-to-br from-sky-200/80 via-cyan-100/90 to-emerald-100/80 blur-[3rem]" />
        <div className="absolute -right-32 -top-28 h-[38rem] w-[36rem] rounded-[48%_52%_58%_42%] bg-gradient-to-br from-cyan-100/95 to-teal-200/85 blur-[3rem]" />
        <div className="absolute -bottom-56 -right-28 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tl from-emerald-100/90 to-cyan-200/80 blur-[3rem]" />
      </div>

      <section aria-labelledby="login-hero-heading" className="relative z-10 hidden min-h-screen lg:flex">
        <div className="flex min-h-screen w-full flex-col px-8 py-10 lg:px-[17.5%] lg:py-[5.8vh]">
          <img src="/assets/kasflow-logo-horizontal.png" alt="KasFlow" className="h-16 w-auto self-start object-contain" />

          <div className="mt-8 max-w-[36rem]">
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-100/90 bg-white/65 px-4 py-2 text-sm font-medium text-[var(--kf-accent-hover)] shadow-sm backdrop-blur-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[var(--kf-accent)]" aria-hidden="true">
                <Sparkles size={13} />
              </span>
              Solusi keuangan untuk UMKM
            </p>

            <h1 id="login-hero-heading" className="text-5xl font-bold leading-[1.08] tracking-tight text-[var(--kf-text)] 2xl:text-[3.25rem]">
              <span className="block">Keuangan usaha</span>
              <span className="block">lebih tertata,</span>
              <span className="block text-[var(--kf-accent)]">mulai dari sini.</span>
            </h1>

            <p className="mt-5 max-w-[34rem] text-lg leading-[1.55] text-slate-600 xl:text-xl">
              Catat pemasukan dan pengeluaran, pantau ringkasan, dan siapkan laporan usaha dalam satu tempat.
            </p>

            <ul className="mt-9 space-y-5">
              <li className="flex items-center gap-6">
                <span className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 shadow-sm ring-1 ring-white/80">
                  <Wallet size={29} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-base font-semibold text-[var(--kf-text)]">Catat transaksi harian</span>
                  <span className="mt-1 block max-w-[18rem] text-sm leading-5 text-slate-500">Pencatatan pemasukan dan pengeluaran yang mudah.</span>
                </span>
              </li>
              <li className="flex items-center gap-6">
                <span className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 text-blue-500 shadow-sm ring-1 ring-white/80">
                  <ChartColumnIncreasing size={29} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-base font-semibold text-[var(--kf-text)]">Pantau ringkasan keuangan</span>
                  <span className="mt-1 block max-w-[18rem] text-sm leading-5 text-slate-500">Lihat perkembangan usaha dalam satu dashboard.</span>
                </span>
              </li>
              <li className="flex items-center gap-6">
                <span className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 text-violet-500 shadow-sm ring-1 ring-white/80">
                  <FileText size={28} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-base font-semibold text-[var(--kf-text)]">Unduh laporan PDF dan Excel</span>
                  <span className="mt-1 block max-w-[18rem] text-sm leading-5 text-slate-500">Siap untuk pembukuan dan keperluan lainnya.</span>
                </span>
              </li>
            </ul>
          </div>

          <footer className="mt-auto flex items-center gap-3 pt-8 text-xs text-slate-500">
            <span className="h-px w-10 bg-slate-300" aria-hidden="true" />
            Pencatatan keuangan untuk usaha sehari-hari.
          </footer>
        </div>
      </section>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-10 xl:px-12">
        <div className="w-full max-w-[39.5rem]">
          <section aria-labelledby="login-form-heading" className="rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/60 via-white/30 to-rose-100/35 p-7 shadow-2xl shadow-slate-900/10 ring-1 ring-white/35 backdrop-blur-[32px] sm:p-9 xl:p-12">
            <header className="mb-7 text-center sm:mb-8">
              <img src="/assets/kasflow-logo-vertical.png" alt="KasFlow" className="mx-auto mb-6 h-28 w-auto object-contain" />
              <h1 id="login-form-heading" className="text-[1.7rem] font-bold tracking-tight text-slate-900 sm:text-3xl">Selamat datang kembali</h1>
              <p className="mt-2 text-base text-slate-500 sm:text-lg">Masuk ke akun Anda untuk melanjutkan.</p>
            </header>

            <form noValidate onSubmit={handleLoginSubmit} aria-busy={loading} className="mr-3 flex flex-col gap-4 sm:mr-4 sm:gap-5 xl:mr-6">
              {error && (
                <div id="login-error" role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div role="status" className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-800">
                  <CircleCheck size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{success}</span>
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="sr-only">Email</label>
                <div className="relative">
                  <Mail size={22} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck="false"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    aria-invalid={loginEmailInvalid}
                    aria-describedby={loginEmailInvalid ? 'login-error' : undefined}
                    className="min-h-[3.75rem] w-full rounded-2xl border border-white/90 bg-white/75 py-4 pl-16 pr-5 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-500 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100/80"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="sr-only">Password</label>
                <div className="relative">
                  <LockKeyhole size={22} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    aria-invalid={loginPasswordInvalid}
                    aria-describedby={loginPasswordInvalid ? 'login-error' : undefined}
                    className="min-h-[3.75rem] w-full rounded-2xl border border-white/90 bg-white/75 py-4 pl-16 pr-16 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-500 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    aria-pressed={showPass}
                    className="absolute right-3 top-1/2 inline-flex min-h-10 min-w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100/80 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    {showPass ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => setShowRecoveryInfo(true)}
                  aria-controls="recovery-info"
                  aria-expanded={showRecoveryInfo}
                  className="cursor-pointer rounded-sm text-sm font-medium text-sky-600 underline-offset-4 hover:text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Lupa password?
                </button>
              </div>
              <p id="recovery-info" role="status" aria-live="polite" className="-mt-3 min-h-5 text-right text-sm leading-5 text-slate-600">
                {showRecoveryInfo ? 'Fitur pemulihan kata sandi belum tersedia saat ini.' : null}
              </p>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex min-h-[3.75rem] w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-600 to-teal-800 px-5 text-lg font-bold text-white shadow-lg shadow-emerald-900/15 transition duration-200 hover:brightness-105 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Memproses...' : 'Masuk'}
                {!loading && <ArrowRight size={21} aria-hidden="true" />}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500 sm:mt-8 sm:text-base">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccess(''); setShowRecoveryInfo(false) }}
                className="cursor-pointer rounded-sm font-semibold text-sky-600 underline-offset-4 hover:text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                Daftar sekarang
              </button>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
