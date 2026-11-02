import { useState } from 'react'
import { AlertCircle, CheckCircle, Save, Store, UserRound } from 'lucide-react'
import { useAuth } from '../context/useAuth'

const card = 'rounded-[var(--kf-radius-lg)] border border-[var(--kf-border)] bg-white p-5 shadow-[var(--kf-shadow-sm)] sm:p-6'

export default function Settings() {
  const { user, business, updateBusinessName } = useAuth()
  const [nameDraft, setNameDraft] = useState({ businessId: business?.id ?? null, value: business?.name || '', dirty: false })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const name = nameDraft.businessId === business?.id && nameDraft.dirty
    ? nameDraft.value
    : business?.name || ''

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Nama usaha wajib diisi.' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const { error } = await updateBusinessName(trimmedName)
      if (!error) setNameDraft({ businessId: business.id, value: trimmedName, dirty: false })
      setFeedback(error
        ? { type: 'error', message: 'Nama usaha gagal disimpan. Silakan coba lagi.' }
        : { type: 'success', message: 'Nama usaha berhasil diperbarui.' })
    } catch {
      setFeedback({ type: 'error', message: 'Nama usaha gagal disimpan. Silakan coba lagi.' })
    } finally {
      setSaving(false)
    }
  }

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
    <header className="mb-1">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--kf-text)] sm:text-3xl">Pengaturan</h1>
      <p className="mt-1 text-sm text-[var(--kf-text-muted)]">Kelola informasi dasar usaha Anda</p>
    </header>

    <section className={card} aria-labelledby="business-profile-title">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kf-accent-soft)] text-[var(--kf-accent)]"><Store size={20} aria-hidden="true" /></span>
        <div><h2 id="business-profile-title" className="font-semibold text-[var(--kf-text)]">Profil Usaha</h2><p className="text-sm text-[var(--kf-text-muted)]">Informasi usaha yang digunakan di KasFlow</p></div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label htmlFor="business-name" className="text-sm font-medium text-[var(--kf-text-muted)]">Nama Usaha</label>
        <input id="business-name" value={name} onChange={event => setNameDraft({ businessId: business?.id ?? null, value: event.target.value, dirty: true })} maxLength={120} disabled={!business?.id || saving} className="min-h-12 w-full rounded-[var(--kf-radius-sm)] border border-[var(--kf-border-strong)] bg-white px-4 text-base text-[var(--kf-text)] outline-none focus:border-[var(--kf-accent)] focus:ring-2 focus:ring-[var(--kf-accent-soft)] disabled:bg-[var(--kf-surface-soft)]" />
        <div className="flex justify-end"><button type="submit" disabled={saving || !business?.id || !name.trim() || name.trim() === business?.name} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--kf-radius-sm)] bg-[var(--kf-accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--kf-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"><Save size={17} aria-hidden="true" />{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
      </form>
      {!business?.id && <p className="mt-3 text-sm text-[var(--kf-text-muted)]">Data usaha belum tersedia.</p>}
      {feedback && <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}{feedback.message}</div>}
    </section>

    <section className={card} aria-labelledby="account-title">
      <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kf-surface-soft)] text-[var(--kf-text-muted)]"><UserRound size={20} aria-hidden="true" /></span><div><h2 id="account-title" className="font-semibold text-[var(--kf-text)]">Akun</h2><p className="text-sm text-[var(--kf-text-muted)]">Akun yang sedang digunakan</p></div></div>
      <p className="text-sm text-[var(--kf-text-muted)]">Email</p><p className="mt-1 break-all font-medium text-[var(--kf-text)]">{user?.email || 'Email tidak tersedia'}</p>
    </section>
  </div>
}
