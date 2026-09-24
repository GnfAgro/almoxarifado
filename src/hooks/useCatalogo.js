import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// areaRestrita = true -> busca a tabela completa 'itens' (precisa estar logado, RLS libera)
// areaRestrita = false -> busca a view pública 'itens_publico' (sem nota fiscal/data/loja)
export function useCatalogo(areaRestrita) {
  const [categorias, setCategorias] = useState([])
  const [tipos, setTipos] = useState([])
  const [funcoes, setFuncoes] = useState([])
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    const tabelaItens = areaRestrita ? 'itens' : 'itens_publico'

    const [resCategorias, resTipos, resFuncoes, resItens] = await Promise.all([
      supabase.from('categorias').select('*').order('nome'),
      supabase.from('tipos').select('*').order('nome'),
      supabase.from('funcoes').select('*').order('nome'),
      supabase.from(tabelaItens).select('*').order('nome'),
    ])

    if (resCategorias.error || resTipos.error || resFuncoes.error || resItens.error) {
      setErro(
        resCategorias.error?.message ||
          resTipos.error?.message ||
          resFuncoes.error?.message ||
          resItens.error?.message ||
          'Erro ao carregar dados.'
      )
    }

    setCategorias(resCategorias.data || [])
    setTipos(resTipos.data || [])
    setFuncoes(resFuncoes.data || [])
    setItens(resItens.data || [])
    setCarregando(false)
  }, [areaRestrita])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const mapaCategorias = Object.fromEntries(categorias.map((c) => [c.id, c.nome]))
  const mapaTipos = Object.fromEntries(tipos.map((t) => [t.id, t.nome]))
  const mapaFuncoes = Object.fromEntries(funcoes.map((f) => [f.id, f.nome]))

  return {
    categorias,
    tipos,
    funcoes,
    itens,
    mapaCategorias,
    mapaTipos,
    mapaFuncoes,
    carregando,
    erro,
    recarregar,
  }
}
