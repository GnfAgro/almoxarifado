import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCatalogo } from '../hooks/useCatalogo'
import { useRequisicoes } from '../hooks/useRequisicoes'
import { diasAte } from '../utils/datas'
import ListaEstoque from '../components/ListaEstoque'
import FormularioItem from '../components/FormularioItem'
import GerenciarCatalogo from '../components/GerenciarCatalogo'
import FormularioRequisicao from '../components/FormularioRequisicao'
import ListaRequisicoes from '../components/ListaRequisicoes'
import ItensAVencer from '../components/ItensAVencer'

// Mesmo painel para almoxarife e admin; o que aparece muda conforme o papel.
export default function AlmoxarifeDashboard({ souAdmin = false }) {
  const { perfil, sair } = useAuth()
  const [aba, setAba] = useState('estoque') // estoque | requisicoes | avencer | cadastros
  const [subReq, setSubReq] = useState('pendentes') // pendentes | historico
  // modo: null | { nome: 'item', item? } | { nome: 'movimento', itemId?, tipoInicial? } | { nome: 'nova-req' }
  const [modo, setModo] = useState(null)

  const catalogo = useCatalogo()
  const { requisicoes, mapaPerfis, carregando: carregandoReq, recarregar: recarregarReq } = useRequisicoes()

  const mapaItens = Object.fromEntries(catalogo.itens.map((i) => [i.id, i]))
  const pendentes = requisicoes.filter((r) => r.status === 'pendente')
  const historico = requisicoes.filter((r) => r.status !== 'pendente')
  const atrasados = requisicoes.filter(
    (r) => r.tipo === 'emprestimo' && r.status === 'aprovado' && diasAte(r.data_vencimento) < 0
  ).length

  function atualizarTudo() {
    catalogo.recarregar()
    recarregarReq()
  }

  function fechar() {
    setModo(null)
  }

  function aoSalvarMovimento() {
    fechar()
    atualizarTudo()
  }

  async function limparHistorico() {
    if (!confirm('Apagar todo o histórico finalizado? Pendentes e empréstimos em aberto são mantidos. Isso não altera o estoque.')) return
    const { data, error } = await supabase.rpc('limpar_historico')
    if (error) {
      alert(error.message)
      return
    }
    alert(`${data} registro(s) apagado(s).`)
    recarregarReq()
  }

  const abas = [
    { id: 'estoque', rotulo: 'Estoque' },
    { id: 'requisicoes', rotulo: souAdmin ? 'Pedidos' : 'Requisições', contador: souAdmin ? pendentes.length : 0 },
    { id: 'avencer', rotulo: 'A vencer', contador: atrasados },
    ...(souAdmin ? [{ id: 'cadastros', rotulo: 'Cadastros' }] : []),
  ]

  const mostrarFab = !modo && ((souAdmin && aba === 'estoque') || (!souAdmin && aba === 'requisicoes'))

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
        {modo?.nome === 'item' && (
          <FormularioItem
            categorias={catalogo.categorias}
            tipos={catalogo.tipos}
            funcoes={catalogo.funcoes}
            itemEditando={modo.item}
            aoSalvar={aoSalvarMovimento}
            aoCancelar={fechar}
          />
        )}

        {modo?.nome === 'movimento' && (
          <FormularioRequisicao
            itens={catalogo.itens}
            souAdmin={souAdmin}
            itemInicialId={modo.itemId}
            tipoInicial={modo.tipoInicial}
            aoSalvar={aoSalvarMovimento}
            aoCancelar={fechar}
          />
        )}

        {modo?.nome === 'nova-req' && (
          <FormularioRequisicao
            itens={catalogo.itens}
            souAdmin={false}
            aoSalvar={aoSalvarMovimento}
            aoCancelar={fechar}
          />
        )}

        {!modo && (
          <>
            {aba === 'estoque' && (
              <>
                {catalogo.carregando && <div className="vazio">Carregando…</div>}
                {catalogo.erro && <div className="erro">{catalogo.erro}</div>}
                <ListaEstoque
                  itens={catalogo.itens}
                  categorias={catalogo.categorias}
                  tipos={catalogo.tipos}
                  mapaCategorias={catalogo.mapaCategorias}
                  mapaTipos={catalogo.mapaTipos}
                  mapaFuncoes={catalogo.mapaFuncoes}
                  renderAcoes={
                    souAdmin
                      ? (item) => (
                          <div className="acoes-item">
                            <button className="botao botao-fantasma" onClick={() => setModo({ nome: 'item', item })}>
                              Editar
                            </button>
                            <button
                              className="botao botao-fantasma"
                              onClick={() => setModo({ nome: 'movimento', itemId: item.id, tipoInicial: 'entrada' })}
                            >
                              Dar entrada
                            </button>
                            <button
                              className="botao botao-fantasma"
                              onClick={() => setModo({ nome: 'movimento', itemId: item.id, tipoInicial: 'saida' })}
                            >
                              Dar baixa
                            </button>
                          </div>
                        )
                      : null
                  }
                />
              </>
            )}

            {aba === 'requisicoes' && (
              <>
                <div className="abas-secundarias">
                  <button className={subReq === 'pendentes' ? 'ativa' : ''} onClick={() => setSubReq('pendentes')}>
                    Pendentes ({pendentes.length})
                  </button>
                  <button className={subReq === 'historico' ? 'ativa' : ''} onClick={() => setSubReq('historico')}>
                    Histórico
                  </button>
                </div>

                {subReq === 'historico' && souAdmin && historico.length > 0 && (
                  <button
                    className="botao botao-fantasma botao-bloco"
                    style={{ marginBottom: 12 }}
                    onClick={limparHistorico}
                  >
                    Limpar histórico finalizado
                  </button>
                )}

                {carregandoReq ? (
                  <div className="vazio">Carregando…</div>
                ) : (
                  <ListaRequisicoes
                    requisicoes={subReq === 'pendentes' ? pendentes : historico}
                    mapaItens={mapaItens}
                    mapaPerfis={mapaPerfis}
                    souAdmin={souAdmin}
                    aoAtualizar={atualizarTudo}
                    vazioTexto={subReq === 'pendentes' ? 'Nenhuma requisição pendente.' : 'Histórico vazio.'}
                  />
                )}
              </>
            )}

            {aba === 'avencer' && (
              <ItensAVencer
                requisicoes={requisicoes}
                mapaItens={mapaItens}
                aoAtualizar={atualizarTudo}
              />
            )}

            {aba === 'cadastros' && souAdmin && (
              <GerenciarCatalogo
                categorias={catalogo.categorias}
                tipos={catalogo.tipos}
                funcoes={catalogo.funcoes}
                aoAtualizar={catalogo.recarregar}
              />
            )}
          </>
        )}
      </div>

      {mostrarFab && (
        <button
          className="botao botao-primario fab"
          onClick={() => setModo(souAdmin ? { nome: 'item' } : { nome: 'nova-req' })}
        >
          {souAdmin ? '+ Novo item' : '+ Nova requisição'}
        </button>
      )}

      {!modo && (
        <div className="nav-inferior">
          {abas.map((a) => (
            <button key={a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>
              {a.rotulo}
              {a.contador > 0 && <span className="contador">{a.contador}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
