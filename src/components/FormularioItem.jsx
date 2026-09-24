import { useState } from 'react'
import { supabase } from '../supabaseClient'

const VAZIO = {
  nome: '', apelidosTexto: '', categoria_id: '', tipo_id: '', funcao_id: '',
  codigo: '', unidade: '', quantidade: 0, quantidade_minima: 0,
  nota_fiscal: '', data_compra: '', loja: '',
}

export default function FormularioItem({ categorias, tipos, funcoes, itemEditando, aoSalvar, aoCancelar }) {
  const [dados, setDados] = useState(
    itemEditando
      ? { ...VAZIO, ...itemEditando, apelidosTexto: (itemEditando.apelidos || []).join(', ') }
      : VAZIO
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function set(campo, valor) {
    setDados((d) => ({ ...d, [campo]: valor }))
  }

  async function aoSubmeter(e) {
    e.preventDefault()
    setErro('')
    if (!dados.nome || !dados.categoria_id || !dados.tipo_id || !dados.unidade) {
      setErro('Preencha nome, categoria, tipo e unidade — são obrigatórios.')
      return
    }
    setSalvando(true)

    const payload = {
      nome: dados.nome,
      apelidos: dados.apelidosTexto
        ? dados.apelidosTexto.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      categoria_id: dados.categoria_id,
      tipo_id: dados.tipo_id,
      funcao_id: dados.funcao_id || null,
      codigo: dados.codigo || null,
      unidade: dados.unidade,
      quantidade: Number(dados.quantidade) || 0,
      quantidade_minima: Number(dados.quantidade_minima) || 0,
      nota_fiscal: dados.nota_fiscal || null,
      data_compra: dados.data_compra || null,
      loja: dados.loja || null,
    }

    const resultado = itemEditando
      ? await supabase.from('itens').update(payload).eq('id', itemEditando.id)
      : await supabase.from('itens').insert(payload)

    setSalvando(false)
    if (resultado.error) {
      setErro(resultado.error.message)
      return
    }
    aoSalvar()
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erro && <div className="erro">{erro}</div>}

      <div className="campo">
        <label>Nome do item *</label>
        <input value={dados.nome} onChange={(e) => set('nome', e.target.value)} required />
      </div>

      <div className="campo">
        <label>Também conhecido como (separe por vírgula)</label>
        <input
          value={dados.apelidosTexto}
          onChange={(e) => set('apelidosTexto', e.target.value)}
          placeholder="ex: parafuso sextavado, parafuso allen"
        />
      </div>

      <div className="campo">
        <label>Categoria *</label>
        <select value={dados.categoria_id} onChange={(e) => set('categoria_id', e.target.value)} required>
          <option value="">Selecione…</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="campo">
        <label>Tipo *</label>
        <select value={dados.tipo_id} onChange={(e) => set('tipo_id', e.target.value)} required>
          <option value="">Selecione…</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      <div className="campo">
        <label>Função (opcional)</label>
        <select value={dados.funcao_id} onChange={(e) => set('funcao_id', e.target.value)}>
          <option value="">Nenhuma</option>
          {funcoes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </div>

      <div className="campo">
        <label>Código (opcional — só se a peça exigir)</label>
        <input value={dados.codigo} onChange={(e) => set('codigo', e.target.value)} />
      </div>

      <div className="campo">
        <label>Unidade de medida *</label>
        <input
          value={dados.unidade}
          onChange={(e) => set('unidade', e.target.value)}
          placeholder="peça, litro, caixa, metro…"
          required
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="campo" style={{ flex: 1 }}>
          <label>Quantidade em estoque</label>
          <input type="number" min="0" value={dados.quantidade} onChange={(e) => set('quantidade', e.target.value)} />
        </div>
        <div className="campo" style={{ flex: 1 }}>
          <label>Estoque mínimo</label>
          <input type="number" min="0" value={dados.quantidade_minima} onChange={(e) => set('quantidade_minima', e.target.value)} />
        </div>
      </div>

      <div className="campo">
        <label>Nota fiscal (visível só p/ almoxarife e admin)</label>
        <input value={dados.nota_fiscal} onChange={(e) => set('nota_fiscal', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="campo" style={{ flex: 1 }}>
          <label>Data da compra</label>
          <input type="date" value={dados.data_compra || ''} onChange={(e) => set('data_compra', e.target.value)} />
        </div>
        <div className="campo" style={{ flex: 1 }}>
          <label>Loja / fornecedor</label>
          <input value={dados.loja} onChange={(e) => set('loja', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button type="button" className="botao botao-fantasma" onClick={aoCancelar}>Cancelar</button>
        <button className="botao botao-primario botao-bloco" disabled={salvando}>
          {salvando ? 'Salvando…' : itemEditando ? 'Salvar alterações' : 'Cadastrar item'}
        </button>
      </div>
    </form>
  )
}
