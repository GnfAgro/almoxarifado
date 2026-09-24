import { useMemo, useState } from 'react'
import EtiquetaItem from './EtiquetaItem'

export default function ListaEstoque({
  itens,
  categorias,
  tipos,
  mapaCategorias,
  mapaTipos,
  mapaFuncoes,
  podeVerOculto,
  renderAcoes,
}) {
  const [busca, setBusca] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [tipoId, setTipoId] = useState('')

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return itens.filter((item) => {
      if (categoriaId && item.categoria_id !== categoriaId) return false
      if (tipoId && item.tipo_id !== tipoId) return false
      if (!termo) return true
      const nomes = [item.nome, item.codigo, ...(item.apelidos || [])]
        .filter(Boolean)
        .map((s) => s.toLowerCase())
      return nomes.some((n) => n.includes(termo))
    })
  }, [itens, busca, categoriaId, tipoId])

  return (
    <div>
      <input
        className="busca"
        placeholder="Buscar por nome, apelido ou código…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <div className="filtros">
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Todas categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <select value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
          <option value="">Todos tipos</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 && <div className="vazio">Nenhum item encontrado.</div>}

      {filtrados.map((item) => (
        <EtiquetaItem
          key={item.id}
          item={item}
          categoriaNome={mapaCategorias[item.categoria_id]}
          tipoNome={mapaTipos[item.tipo_id]}
          funcaoNome={item.funcao_id ? mapaFuncoes[item.funcao_id] : null}
          podeVerOculto={podeVerOculto}
          acoes={renderAcoes ? renderAcoes(item) : null}
        />
      ))}
    </div>
  )
}
