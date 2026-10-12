import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useRequisicoes() {
  const [requisicoes, setRequisicoes] = useState([])
  const [mapaPerfis, setMapaPerfis] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    setCarregando(true)
    const [resReq, resPerfis] = await Promise.all([
      supabase.from('requisicoes').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nome'),
    ])
    setErro(resReq.error ? resReq.error.message : '')
    setRequisicoes(resReq.data || [])
    setMapaPerfis(Object.fromEntries((resPerfis.data || []).map((p) => [p.id, p.nome])))
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { requisicoes, mapaPerfis, carregando, erro, recarregar }
}
