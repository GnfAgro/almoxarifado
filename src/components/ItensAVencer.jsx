import { supabase } from '../supabaseClient'
import { diasAte, formatarData } from '../utils/datas'

function textoPrazo(dias) {
  if (dias < 0) return `Atrasado há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'Vence hoje'
  if (dias === 1) return 'Vence amanhã'
  return `Vence em ${dias} dias`
}

function Cartao({ req, item, aoDevolver }) {
  const dias = diasAte(req.data_vencimento)
  return (
    <div className={`req ${dias < 0 ? 'req-atrasada' : ''}`}>
      <div className="req-topo">
        <div>
          <div className="req-tipo">{textoPrazo(dias)}</div>
          <div style={{ fontWeight: 600 }}>
            {item ? item.nome : 'Item removido'} — {req.quantidade} {item?.unidade || ''}
          </div>
        </div>
        {dias < 0 && <span className="selo-alerta">ATRASADO</span>}
      </div>
      <div className="req-detalhes">
        <div>Servidor: {req.servidor_nome}</div>
        <div>Devolver até: {formatarData(req.data_vencimento)}</div>
        {req.observacao && <div>Comentário: {req.observacao}</div>}
      </div>
      <div className="req-acoes">
        <button className="botao botao-primario" onClick={() => aoDevolver(req)}>
          Registrar devolução
        </button>
      </div>
    </div>
  )
}

export default function ItensAVencer({ requisicoes, mapaItens, aoAtualizar }) {
  const abertos = requisicoes
    .filter((r) => r.tipo === 'emprestimo' && r.status === 'aprovado')
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))

  const atrasados = abertos.filter((r) => diasAte(r.data_vencimento) < 0)
  const proximos = abertos.filter((r) => {
    const d = diasAte(r.data_vencimento)
    return d >= 0 && d <= 3
  })
  const emDia = abertos.filter((r) => diasAte(r.data_vencimento) > 3)

  async function devolver(req) {
    const { error } = await supabase.rpc('registrar_devolucao', { p_id: req.id })
    if (error) {
      alert(error.message)
      return
    }
    aoAtualizar()
  }

  if (abertos.length === 0) {
    return <div className="vazio">Nenhum item emprestado no momento.</div>
  }

  function Secao({ titulo, lista, destaque }) {
    if (lista.length === 0) return null
    return (
      <div style={{ marginBottom: 18 }}>
        <div className={`secao-titulo ${destaque ? 'secao-alerta' : ''}`}>
          {titulo} ({lista.length})
        </div>
        {lista.map((r) => (
          <Cartao key={r.id} req={r} item={mapaItens[r.item_id]} aoDevolver={devolver} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <Secao titulo="Atrasados" lista={atrasados} destaque />
      <Secao titulo="Vencem em até 3 dias" lista={proximos} />
      <Secao titulo="Em dia" lista={emDia} />
    </div>
  )
}
