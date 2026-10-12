import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Categorias -> Tipos (da categoria) -> Funções (do tipo) + Itens
export function useCatalogo() {
  const [categorias, setCategorias] = useState([])
  const [tipos, setTipos] = useState([])
  const [funcoes, setFuncoes] = useState([])
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro('')

    const [resCategorias, resTipos, resFuncoes, resItens] = await Promise.all([
      supabase.from('categorias').select('*').order('nome'),
      supabase.from('tipos').select('*').order('nome'),
      supabase.from('funcoes').select('*').order('nome'),
      supabase.from('itens').select('*').order('nome'),
    ])

    const primeiroErro =
      resCategorias.error || resTipos.error || resFuncoes.error || resItens.error
    if (primeiroErro) setErro(primeiroErro.message)

    setCategorias(resCategorias.data || [])
    setTipos(resTipos.data || [])
    setFuncoes(resFuncoes.data || [])
    setItens(resItens.data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const mapaCategorias = Object.fromEntries(categorias.map((c) => [c.id, c.nome]))
  const mapaTipos = Object.fromEntries(tipos.map((t) => [t.id, t.nome]))
  const mapaFuncoes = Object.fromEntries(funcoes.map((f) => [f.id, f.nome]))

  return {
    categorias, tipos, funcoes, itens,
    mapaCategorias, mapaTipos, mapaFuncoes,
    carregando, erro, recarregar,
  }
}
