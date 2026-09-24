import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const TIPOS = [
  { valor: 'saida', rotulo: 'Saída de material' },
  { valor: 'entrada', rotulo: 'Entrada de material' },
  { valor: 'compra', rotulo: 'Compra' },
]

export default function FormularioRequisicao({ itens, aoSalvar, aoCancelar }) {
  const { perfil } = useAuth()
  const [itemId, setItemId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [tipo, setTipo] = useState('saida')
  const [urgente, setUrgente] = useState(false)
  const [funcionarioNome, setFuncionarioNome] = useState('')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function aoSubmeter(e) {
    e.preventDefault()
    setErro('')

    if (!itemId || !quantidade || Number(quantidade) <= 0) {
      setErro('Selecione o item e uma quantidade válida.')
      return
    }
    if (tipo === 'saida' && !funcionarioNome.trim()) {
      setErro('Informe o nome do funcionário que está retirando o material.')
      return
    }

    setEnviando(true)
    const ehUrgente = tipo === 'saida' && urgente

    const payloadBase = {
      item_id: itemId,
      quantidade: Number(quantidade),
      tipo,
      urgente: ehUrgente,
      funcionario_nome: tipo === 'saida' ? funcionarioNome.trim() : null,
      almoxarife_id: perfil.id,
      observacao: observacao || null,
    }

    if (ehUrgente) {
      // Saída de urgência: desconta o estoque na hora, sob responsabilidade do almoxarife,
      // sem esperar aprovação do admin (mas fica registrado e marcado como urgente).
      const item = itens.find((i) => i.id === itemId)
      if (!item) {
        setErro('Item não encontrado.')
        setEnviando(false)
        return
      }
      const novaQuantidade = Number(item.quantidade) - Number(quantidade)
      if (novaQuantidade < 0) {
        setErro('Quantidade maior do que o disponível em estoque.')
        setEnviando(false)
        return
      }

      const { error: erroItem } = await supabase
        .from('itens')
        .update({ quantidade: novaQuantidade })
        .eq('id', itemId)
      if (erroItem) {
        setErro(erroItem.message)
        setEnviando(false)
        return
      }

      const { error: erroReq } = await supabase.from('requisicoes').insert({
        ...payloadBase,
        status: 'executado_urgente',
        resolved_at: new Date().toISOString(),
      })
      setEnviando(false)
      if (erroReq) { setErro(erroReq.message); return }
    } else {
      const { error } = await supabase.from('requisicoes').insert({
        ...payloadBase,
        status: 'pendente',
      })
      setEnviando(false)
      if (error) { setErro(error.message); return }
    }

    aoSalvar()
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erro && <div className="erro">{erro}</div>}

      <div className="campo">
        <label>Tipo de requisição</label>
        <select value={tipo} onChange={(e) => { setTipo(e.target.value); setUrgente(false) }}>
          {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
        </select>
      </div>

      <div className="campo">
        <label>Item</label>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
          <option value="">Selecione o item…</option>
          {itens.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome} {i.codigo ? `(${i.codigo})` : ''} — {i.quantidade} {i.unidade} em estoque
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label>Quantidade</label>
        <input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
      </div>

      {tipo === 'saida' && (
        <div className="campo">
          <label>Funcionário que está retirando</label>
          <input value={funcionarioNome} onChange={(e) => setFuncionarioNome(e.target.value)} required />
        </div>
      )}

      {tipo === 'saida' && (
        <div className="campo campo-check">
          <input
            type="checkbox"
            id="urgente"
            checked={urgente}
            onChange={(e) => setUrgente(e.target.checked)}
          />
          <label htmlFor="urgente" style={{ margin: 0 }}>
            Saída de urgência — sai do estoque agora, sob minha responsabilidade, sem esperar aprovação
          </label>
        </div>
      )}

      <div className="campo">
        <label>Observação (opcional)</label>
        <textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="botao botao-fantasma" onClick={aoCancelar}>Cancelar</button>
        <button className={`botao botao-bloco ${urgente ? 'botao-alerta' : 'botao-primario'}`} disabled={enviando}>
          {enviando ? 'Enviando…' : urgente ? 'Confirmar saída de urgência' : 'Enviar requisição'}
        </button>
      </div>
    </form>
  )
}
