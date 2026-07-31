import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RedefinirSenha from './pages/RedefinirSenha'
import type { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [redefinindoSenha, setRedefinindoSenha] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRedefinindoSenha(true)
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (carregando) return null
  if (redefinindoSenha) return <RedefinirSenha onConcluida={() => setRedefinindoSenha(false)} />
  return session ? <Dashboard /> : <Login />
}
