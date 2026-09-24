import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null) // { id, nome, role }
  const [carregando, setCarregando] = useState(true)

  async function carregarPerfil(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, role')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Erro ao carregar perfil:', error.message)
      setPerfil(null)
    } else {
      setPerfil(data)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) carregarPerfil(session.user.id)
      setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        carregarPerfil(session.user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function entrar(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    return { error }
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, perfil, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
