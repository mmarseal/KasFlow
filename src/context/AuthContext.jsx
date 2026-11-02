import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const pendingSignUpRef = useRef(null)

  // Fetch business milik user yang sedang login
  async function fetchBusiness(userId) {
    if (!userId) {
      setBusiness(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_user_id', userId)
        .single()

      if (error) {
        console.error('Gagal memuat data bisnis:', error.message)
        setBusiness(null)
      } else {
        setBusiness(data)
      }
    } catch (err) {
      console.error('Gagal memuat data bisnis:', err)
      setBusiness(null)
    }
  }

  function publishAuthSession(session) {
    const currentUser = session?.user ?? null
    setUser(currentUser)
    setTimeout(async () => {
      try {
        await fetchBusiness(currentUser?.id)
      } finally {
        setLoading(false)
      }
    }, 0)
  }

  useEffect(() => {
    let initialLoad = true

    // Cek session yang sudah ada
    supabase.auth.getSession()
      .then(async (res) => {
        const currentUser = res?.data?.session?.user ?? null
        setUser(currentUser)
        try {
          await fetchBusiness(currentUser?.id)
        } finally {
          setLoading(false)
          initialLoad = false
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil sesi:', err)
        setLoading(false)
        initialLoad = false
      })

    // Listen perubahan auth state.
    // PENTING: callback TIDAK BOLEH await Supabase network call secara langsung,
    // karena menyebabkan deadlock pada internal auth lock SDK Supabase.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const pendingSignUp = pendingSignUpRef.current
        if (
          event === 'SIGNED_IN' &&
          pendingSignUp &&
          session?.user?.email?.toLowerCase() === pendingSignUp.email
        ) {
          pendingSignUp.session = session
          return
        }

        const currentUser = session?.user ?? null
        setUser(currentUser)

        // Initial session sudah ditangani oleh getSession() di atas
        if (initialLoad) return

        // Defer business fetch agar callback kembali secara sinkron
        // dan melepas Supabase internal auth lock terlebih dahulu
        setTimeout(async () => {
          try {
            await fetchBusiness(currentUser?.id)
          } finally {
            setLoading(false)
          }
        }, 0)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password, nama) {
    const { data: existingSessionData, error: existingSessionError } = await supabase.auth.getSession()
    if (existingSessionError) return { error: existingSessionError, session: null, sessionCleanupError: null }
    if (existingSessionData?.session) {
      publishAuthSession(existingSessionData.session)
      return {
        error: new Error('Sesi aktif terdeteksi. Silakan gunakan sesi yang sedang masuk.'),
        session: existingSessionData.session,
        sessionCleanupError: null
      }
    }

    const pendingSignUp = { email: email.trim().toLowerCase(), session: null }
    pendingSignUpRef.current = pendingSignUp
    let sessionToPublish = null
    let clearedSignUpSessionToken = null

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nama } }
      })
      if (error) return { error, session: null, sessionCleanupError: null }

      const signUpSession = data?.session ?? null
      if (!signUpSession) return { error: null, session: null, sessionCleanupError: null }

      const { data: activeSessionData, error: activeSessionError } = await supabase.auth.getSession()
      if (activeSessionError) {
        sessionToPublish = pendingSignUp.session ?? signUpSession
        return { error: null, session: sessionToPublish, sessionCleanupError: activeSessionError }
      }

      const activeSession = activeSessionData?.session ?? null
      if (!activeSession) {
        clearedSignUpSessionToken = signUpSession.access_token
        return { error: null, session: null, sessionCleanupError: null }
      }

      if (activeSession.access_token !== signUpSession.access_token) {
        sessionToPublish = activeSession
        return {
          error: null,
          session: activeSession,
          sessionCleanupError: new Error('The active session changed during registration and was left untouched.')
        }
      }

      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) {
        const { data: remainingSessionData, error: remainingSessionError } = await supabase.auth.getSession()
        sessionToPublish = remainingSessionError
          ? activeSession
          : remainingSessionData?.session ?? null
        if (!sessionToPublish) clearedSignUpSessionToken = signUpSession.access_token
        return { error: null, session: sessionToPublish, sessionCleanupError: signOutError }
      }

      clearedSignUpSessionToken = signUpSession.access_token
      return { error: null, session: null, sessionCleanupError: null }
    } finally {
      if (pendingSignUpRef.current === pendingSignUp) pendingSignUpRef.current = null

      const deferredSession = pendingSignUp.session
      if (sessionToPublish) {
        publishAuthSession(sessionToPublish)
      } else if (deferredSession && deferredSession.access_token !== clearedSignUpSessionToken) {
        publishAuthSession(deferredSession)
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setBusiness(null)
  }

  async function updateBusinessName(name) {
    if (!business?.id) return { error: new Error('Data usaha belum tersedia.') }
    const { data, error } = await supabase
      .from('businesses')
      .update({ name })
      .eq('id', business.id)
      .select('id, name')
      .single()
    if (!error) setBusiness(data)
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, business, loading, signIn, signUp, signOut, updateBusinessName }}>
      {children}
    </AuthContext.Provider>
  )
}
