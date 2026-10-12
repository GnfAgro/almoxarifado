import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { hojeISO } from '../utils/datas'

// Almoxarife: só PEDE ao admin (entrada, compra, empréstimo).
const TIPOS_ALMOXARIFE = [
  { valor: 'entrada', rotulo: 'Entrada de material' },
  { valor: 'compra', rotulo: 'Compra' },
  { valor: 'emprestimo', rotulo: 'Empréstimo' },
]
// Admin: registra direto (entrada e baixa), sem precisar de aprovação.
const TIPOS_ADMIN = [
  { valor: 'entrada', rotulo: 'Entrada de material' },
  { valor: 'saida', rotulo: 'Baixa de material (saída)' },
]

export default function FormularioRequisicao({ itens, souAdmin, itemInicialId = '', tipoInicial, aoSalvar, aoCancelar }) {
  const { perfil } = useAuth()
  const tipos = souAdmin ? TIPOS_ADMIN : TIPOS_ALMOXARIFE

  const [tipo, setTipo] = useState(tipoInicial || tipos[0].valor)
  const [itemId, setItemId] = useState(itemInicialId)
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  // entrada
  const [fornecedor, setFornecedor] = useState('')
  const [notaFiscal, setNotaFiscal] = useState('')
  const [dataRecebimento, setDataRecebimento] = useState(hojeISO())
  const [receita, setReceita] = useState('') // '' | 'sim' | 'nao'
  // empréstimo / baixa
  const [servidor, setServidor] = useState('')
  const [vencimento, setVencimento] = useState('')

  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function aoSubmeter(e) {
    e.preventDefault()
    setErro('')

    const qtd = Number(quantidade)
    const item = itens.find((i) => i.id === itemId)
    if (!item) return setErro('Selecione o item.')
    if (!qtd || qtd <= 0) return setErro('Informe uma quantidade válida.')

    if (tipo === 'entrada') {
      if (!fornecedor.trim()) return setErro('Informe o nome do fornecedor.')
      if (!notaFiscal.trim()) return setErro('Informe o número da nota fiscal.')
      if (!dataRecebimento) return setErro('Informe a data de recebimento.')
      if (!receita) return setErro('Informe se tem receita agronômica (sim ou não).')
    }
    if (tipo === 'emprestimo' || tipo === 'saida') {
      if (!servidor.trim()) {
        return setErro(
          tipo === 'emprestimo'
            ? 'Informe o nome do servidor que está pegando emprestado.'
            : 'Informe o nome do servidor que está retirando o material.'
        )
      }
      if (qtd > Number(item.quantidade)) {
        return setErro(`Só há ${item.quantidade} ${item.unidade} disponível em estoque.`)
      }
    }
    if (tipo === 'emprestimo' && !vencimento) {
      return setErro('Informe a data de vencimento (devolução).')
    }

    setEnviando(true)
    let resultado

    if (souAdmin) {
      resultado =
        tipo === 'entrada'
          ? await supabase.rpc('registrar_entrada', {
              p_item: itemId,
              p_qtd: qtd,
              p_fornecedor: fornecedor.trim(),
              p_nf: notaFiscal.trim(),
              p_data: dataRecebimento,
              p_receita: receita === 'sim',
              p_obs: observacao.trim() || null,
            })
          : await supabase.rpc('registrar_saida', {
              p_item: itemId,
              p_qtd: qtd,
              p_servidor: servidor.trim(),
              p_obs: observacao.trim() || null,
            })
    } else {
      const payload = {
        item_id: itemId,
        quantidade: qtd,
        tipo,
        status: 'pendente',
        almoxarife_id: perfil.id,
        observacao: observacao.trim() || null,
      }
      if (tipo === 'entrada') {
        payload.fornecedor = fornecedor.trim()
        payload.nota_fiscal = notaFiscal.trim()
        payload.data_recebimento = dataRecebimento
        payload.receita_agronomica = receita === 'sim'
      }
      if (tipo === 'emprestimo') {
        payload.servidor_nome = servidor.trim()
        payload.data_vencimento = vencimento
      }
      resultado = await supabase.from('requisicoes').insert(payload)
    }

    setEnviando(false)
    if (resultado.error) {
      setErro(resultado.error.message)
      return
    }
    aoSalvar()
  }

  const rotuloBotao = souAdmin
    ? tipo === 'entrada' ? 'Registrar entrada' : 'Registrar baixa'
    : 'Enviar requisição ao admin'

  return (
    <form onSubmit={aoSubmeter}>
      {erro && <div className="erro">{erro}</div>}

      <div className="campo">
        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {tipos.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
        </select>
      </div>

      <div className="campo">
        <label>Item</label>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
          <option value="">Selecione o item…</option>
          {itens.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}{i.codigo ? ` (${i.codigo})` : ''} — {i.quantidade} {i.unidade} disponível
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label>Quantidade</label>
        <input type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
      </div>

      {tipo === 'entrada' && (
        <>
          <div className="campo">
            <label>Fornecedor *</label>
            <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="campo" style={{ flex: 1 }}>
              <label>Nota fiscal (nº) *</label>
              <input value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} />
            </div>
            <div className="campo" style={{ flex: 1 }}>
              <label>Data de recebimento *</label>
              <input type="date" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
            </div>
          </div>
          <div className="campo">
            <label>Tem receita agronômica? *</label>
            <select value={receita} onChange={(e) => setReceita(e.target.value)}>
              <option value="">Selecione…</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>
        </>
      )}

      {(tipo === 'emprestimo' || tipo === 'saida') && (
        <div className="campo">
          <label>
            {tipo === 'emprestimo' ? 'Servidor que está pegando emprestado *' : 'Servidor que está retirando *'}
          </label>
          <input value={servidor} onChange={(e) => setServidor(e.target.value)} />
        </div>
      )}

      {tipo === 'emprestimo' && (
        <div className="campo">
          <label>Data de vencimento (devolução) *</label>
          <input type="date" min={hojeISO()} value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
        </div>
      )}

      <div className="campo">
        <label>{tipo === 'emprestimo' ? 'Comentário (opcional)' : 'Observação (opcional)'}</label>
        <textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="botao botao-fantasma" onClick={aoCancelar}>Cancelar</button>
        <button className="botao botao-primario botao-bloco" disabled={enviando}>
          {enviando ? 'Enviando…' : rotuloBotao}
        </button>
      </div>
    </form>
  )
}
