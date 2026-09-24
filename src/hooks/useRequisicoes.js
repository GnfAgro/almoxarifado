import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useRequisicoes() {
  const [requisicoes, setRequisicoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('requisicoes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setErro(error.message)
    else setErro('')
    setRequisicoes(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { requisicoes, carregando, erro, recarregar }
}
