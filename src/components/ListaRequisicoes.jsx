import { supabase } from '../supabaseClient'
import { diasAte, formatarData } from '../utils/datas'

const ROTULO_TIPO = {
  entrada: 'Entrada',
  saida: 'Baixa (saída)',
  compra: 'Compra',
  emprestimo: 'Empréstimo',
}

// Só o admin exclui, e só o que já foi finalizado (nunca pendentes nem empréstimos em aberto)
function podeExcluir(req) {
  return (
    req.status === 'rejeitado' ||
    req.status === 'devolvido' ||
    (req.status === 'aprovado' && req.tipo !== 'emprestimo')
  )
}

function infoStatus(req) {
  if (req.tipo === 'emprestimo' && req.status === 'aprovado') {
    return diasAte(req.data_vencimento) < 0
      ? { rotulo: 'Atrasado', classe: 'rejeitado' }
      : { rotulo: 'Emprestado', classe: 'aprovado' }
  }
  if (req.status === 'devolvido') return { rotulo: 'Devolvido', classe: 'aprovado' }
  if (req.status === 'aprovado') return { rotulo: 'Aprovado', classe: 'aprovado' }
  if (req.status === 'rejeitado') return { rotulo: 'Rejeitado', classe: 'rejeitado' }
  return { rotulo: 'Pendente', classe: '' }
}

export default function ListaRequisicoes({ requisicoes, mapaItens, mapaPerfis, souAdmin, aoAtualizar, vazioTexto }) {
  async function chamar(funcao, args) {
    const { error } = await supabase.rpc(funcao, args)
    if (error) {
      alert(error.message)
      return
    }
    aoAtualizar()
  }

  async function excluir(req) {
    if (!confirm('Excluir este registro do histórico? Isso não altera o estoque.')) return
    const { error } = await supabase.from('requisicoes').delete().eq('id', req.id)
    if (error) {
      alert(error.message)
      return
    }
    aoAtualizar()
  }

  if (requisicoes.length === 0) {
    return <div className="vazio">{vazioTexto || 'Nenhuma requisição por aqui.'}</div>
  }

  return (
    <div>
      {requisicoes.map((req) => {
        const item = mapaItens[req.item_id]
        const status = infoStatus(req)
        const emAberto = req.tipo === 'emprestimo' && req.status === 'aprovado'
        return (
          <div className="req" key={req.id}>
            <div className="req-topo">
              <div>
                <div className="req-tipo">{ROTULO_TIPO[req.tipo]}</div>
                <div style={{ fontWeight: 600 }}>
                  {item ? item.nome : 'Item removido'} — {req.quantidade} {item?.unidade || ''}
                </div>
              </div>
              <span className={`selo-status ${status.classe}`}>{status.rotulo}</span>
            </div>

            <div className="req-detalhes">
              {req.servidor_nome && (
                <div>
                  {req.tipo === 'emprestimo' ? 'Servidor que pegou emprestado' : 'Servidor que retirou'}: {req.servidor_nome}
                </div>
              )}
              {req.tipo === 'emprestimo' && req.data_vencimento && (
                <div>Devolver até: {formatarData(req.data_vencimento)}</div>
              )}
              {req.devolvido_em && <div>Devolvido em: {formatarData(req.devolvido_em)}</div>}
              {req.tipo === 'entrada' && (
                <>
                  <div>Fornecedor: {req.fornecedor}</div>
                  <div>Nota fiscal: {req.nota_fiscal} · Recebido em {formatarData(req.data_recebimento)}</div>
                  <div>Receita agronômica: {req.receita_agronomica ? 'Sim' : 'Não'}</div>
                </>
              )}
              {req.observacao && <div>Obs: {req.observacao}</div>}
            </div>

            <div className="req-meta">
              {req.almoxarife_id && <>Solicitado por {mapaPerfis[req.almoxarife_id] || '—'} · </>}
              {req.admin_id && (
                <>{req.almoxarife_id ? 'Decidido' : 'Registrado'} por {mapaPerfis[req.admin_id] || '—'} · </>
              )}
              {new Date(req.created_at).toLocaleString('pt-BR')}
            </div>

            {souAdmin && req.status === 'pendente' && (
              <div className="req-acoes">
                <button className="botao botao-primario" onClick={() => chamar('aprovar_requisicao', { p_id: req.id })}>
                  Aprovar
                </button>
                <button className="botao botao-fantasma" onClick={() => chamar('rejeitar_requisicao', { p_id: req.id })}>
                  Rejeitar
                </button>
              </div>
            )}

            {emAberto && (
              <div className="req-acoes">
                <button className="botao botao-primario" onClick={() => chamar('registrar_devolucao', { p_id: req.id })}>
                  Registrar devolução
                </button>
              </div>
            )}

            {souAdmin && podeExcluir(req) && (
              <div className="req-acoes">
                <button className="botao botao-fantasma" onClick={() => excluir(req)}>
                  Excluir do histórico
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
