import { Link } from 'react-router-dom'
import { useCatalogo } from '../hooks/useCatalogo'
import ListaEstoque from '../components/ListaEstoque'

export default function Estoque() {
  const { itens, categorias, tipos, mapaCategorias, mapaTipos, mapaFuncoes, carregando, erro } =
    useCatalogo(false)

  return (
    <div className="app-shell">
      <div className="topo">
        <div className="marca">
          GNF AGRO
          <small>Estoque do almoxarifado</small>
        </div>
        <Link to="/login" className="sair" style={{ textDecoration: 'none' }}>
          Entrar
        </Link>
      </div>

      <div className="conteudo">
        {carregando && <div className="vazio">Carregando estoque…</div>}
        {erro && <div className="erro">{erro}</div>}
        {!carregando && !erro && (
          <ListaEstoque
            itens={itens}
            categorias={categorias}
            tipos={tipos}
            mapaCategorias={mapaCategorias}
            mapaTipos={mapaTipos}
            mapaFuncoes={mapaFuncoes}
            podeVerOculto={false}
          />
        )}
      </div>
    </div>
  )
}
