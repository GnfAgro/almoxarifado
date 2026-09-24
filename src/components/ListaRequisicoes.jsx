import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

const ROTULO_TIPO = { entrada: 'Entrada', saida: 'Saída', compra: 'Compra' }
const ROTULO_STATUS = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  executado_urgente: 'Urgência executada',
}

export default function ListaRequisicoes({ requisicoes, itens, mapaItens, souAdmin, aoAtualizar }) {
  const { perfil } = useAuth()

  async function decidir(req, aprovar) {
    if (aprovar) {
      const item = itens.find((i) => i.id === req.item_id)
      if (item) {
        let novaQuantidade = Number(item.quantidade)
        if (req.tipo === 'entrada') novaQuantidade += Number(req.quantidade)
        if (req.tipo === 'saida') novaQuantidade -= Number(req.quantidade)
        // 'compra' não mexe em estoque agora — só entra quando o material chegar (entrada)

        if (novaQuantidade < 0) {
          alert('Não é possível aprovar: quantidade em estoque ficaria negativa.')
          return
        }
        if (req.tipo !== 'compra') {
          const { error: erroItem } = await supabase
            .from('itens')
            .update({ quantidade: novaQuantidade })
            .eq('id', item.id)
          if (erroItem) { alert(erroItem.message); return }
        }
      }
    }

    const { error } = await supabase
      .from('requisicoes')
      .update({
        status: aprovar ? 'aprovado' : 'rejeitado',
        admin_id: perfil.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', req.id)

    if (error) { alert(error.message); return }
    aoAtualizar()
  }

  if (requisicoes.length === 0) {
    return <div className="vazio">Nenhuma requisição por aqui.</div>
  }

  return (
    <div>
      {requisicoes.map((req) => {
        const item = mapaItens[req.item_id]
        return (
          <div className="req" key={req.id}>
            <div className="req-topo">
              <div>
                <div className="req-tipo">{ROTULO_TIPO[req.tipo]}</div>
                <div style={{ fontWeight: 600 }}>
                  {item ? item.nome : 'Item removido'} — {req.quantidade} {item?.unidade || ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {req.urgente && <span className="selo-urgente">URGÊNCIA</span>}
                <span className={`selo-status ${req.status === 'aprovado' || req.status === 'executado_urgente' ? 'aprovado' : req.status === 'rejeitado' ? 'rejeitado' : ''}`}>
                  {ROTULO_STATUS[req.status]}
                </span>
              </div>
            </div>

            {req.funcionario_nome && (
              <div style={{ fontSize: 13, color: 'var(--cor-tinta-suave)', marginTop: 6 }}>
                Retirado por: {req.funcionario_nome}
              </div>
            )}
            {req.observacao && (
              <div style={{ fontSize: 13, color: 'var(--cor-tinta-suave)', marginTop: 2 }}>
                Obs: {req.observacao}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--cor-tinta-suave)', marginTop: 4 }}>
              {new Date(req.created_at).toLocaleString('pt-BR')}
            </div>

            {souAdmin && req.status === 'pendente' && (
              <div className="req-acoes">
                <button className="botao botao-primario" onClick={() => decidir(req, true)}>Aprovar</button>
                <button className="botao botao-fantasma" onClick={() => decidir(req, false)}>Rejeitar</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
