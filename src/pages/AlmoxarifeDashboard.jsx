import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCatalogo } from '../hooks/useCatalogo'
import { useRequisicoes } from '../hooks/useRequisicoes'
import ListaEstoque from '../components/ListaEstoque'
import FormularioItem from '../components/FormularioItem'
import GerenciarCatalogo from '../components/GerenciarCatalogo'
import FormularioRequisicao from '../components/FormularioRequisicao'
import ListaRequisicoes from '../components/ListaRequisicoes'

export default function AlmoxarifeDashboard({ souAdmin = false }) {
  const { perfil, sair } = useAuth()
  const [aba, setAba] = useState('estoque') // estoque | catalogo | requisicoes
  const [modo, setModo] = useState(null) // null | 'novo-item' | item (editando) | 'nova-req'

  const catalogo = useCatalogo(true)
  const { requisicoes, carregando: carregandoReq, recarregar: recarregarReq } = useRequisicoes()

  const mapaItens = Object.fromEntries(catalogo.itens.map((i) => [i.id, i]))

  function fecharModo() {
    setModo(null)
  }

  async function aoSalvarItem() {
    fecharModo()
    catalogo.recarregar()
  }

  async function aoSalvarRequisicao() {
    fecharModo()
    catalogo.recarregar()
    recarregarReq()
  }

  return (
    <div className="app-shell">
      <div className="topo">
        <div className="marca">
          GNF AGRO
          <small>{perfil?.nome} · {souAdmin ? 'Administrador' : 'Almoxarife'}</small>
        </div>
        <button className="sair" onClick={sair}>Sair</button>
      </div>

      <div className="conteudo">
        {modo === 'novo-item' && (
          <FormularioItem
            categorias={catalogo.categorias}
            tipos={catalogo.tipos}
            funcoes={catalogo.funcoes}
            aoSalvar={aoSalvarItem}
            aoCancelar={fecharModo}
          />
        )}

        {modo && modo !== 'novo-item' && modo !== 'nova-req' && (
          <FormularioItem
            categorias={catalogo.categorias}
            tipos={catalogo.tipos}
            funcoes={catalogo.funcoes}
            itemEditando={modo}
            aoSalvar={aoSalvarItem}
            aoCancelar={fecharModo}
          />
        )}

        {modo === 'nova-req' && (
          <FormularioRequisicao
            itens={catalogo.itens}
            aoSalvar={aoSalvarRequisicao}
            aoCancelar={fecharModo}
          />
        )}

        {!modo && (
          <>
            {aba === 'estoque' && (
              <>
                {catalogo.erro && <div className="erro">{catalogo.erro}</div>}
                <ListaEstoque
                  itens={catalogo.itens}
                  categorias={catalogo.categorias}
                  tipos={catalogo.tipos}
                  mapaCategorias={catalogo.mapaCategorias}
                  mapaTipos={catalogo.mapaTipos}
                  mapaFuncoes={catalogo.mapaFuncoes}
                  podeVerOculto={true}
                  renderAcoes={(item) => (
                    <button
                      className="botao botao-fantasma"
                      style={{ marginTop: 10, padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => setModo(item)}
                    >
                      Editar item
                    </button>
                  )}
                />
              </>
            )}

            {aba === 'catalogo' && (
              <GerenciarCatalogo
                categorias={catalogo.categorias}
                tipos={catalogo.tipos}
                funcoes={catalogo.funcoes}
                aoAtualizar={catalogo.recarregar}
              />
            )}

            {aba === 'requisicoes' && (
              <>
                {carregandoReq ? (
                  <div className="vazio">Carregando…</div>
                ) : (
                  <ListaRequisicoes
                    requisicoes={requisicoes}
                    itens={catalogo.itens}
                    mapaItens={mapaItens}
                    souAdmin={souAdmin}
                    aoAtualizar={() => { recarregarReq(); catalogo.recarregar() }}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      {!modo && (
        <button
          className="botao botao-primario fab"
          onClick={() => setModo(aba === 'requisicoes' ? 'nova-req' : 'novo-item')}
          style={{ display: aba === 'catalogo' ? 'none' : 'inline-flex' }}
        >
          {aba === 'requisicoes' ? '+ Nova requisição' : '+ Novo item'}
        </button>
      )}

      {!modo && (
        <div className="nav-inferior">
          <button className={aba === 'estoque' ? 'ativo' : ''} onClick={() => setAba('estoque')}>Estoque</button>
          <button className={aba === 'catalogo' ? 'ativo' : ''} onClick={() => setAba('catalogo')}>Categorias</button>
          <button className={aba === 'requisicoes' ? 'ativo' : ''} onClick={() => setAba('requisicoes')}>Requisições</button>
        </div>
      )}
    </div>
  )
}
