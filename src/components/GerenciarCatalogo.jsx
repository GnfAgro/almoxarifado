import { useState } from 'react'
import { supabase } from '../supabaseClient'

const TABELAS = {
  categoria: { tabela: 'categorias', rotulo: 'Categoria', plural: 'Categorias' },
  tipo: { tabela: 'tipos', rotulo: 'Tipo', plural: 'Tipos' },
  funcao: { tabela: 'funcoes', rotulo: 'Função', plural: 'Funções' },
}

export default function GerenciarCatalogo({ categorias, tipos, funcoes, aoAtualizar }) {
  const [aba, setAba] = useState('categoria')
  const [nomeNovo, setNomeNovo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const listas = { categoria: categorias, tipo: tipos, funcao: funcoes }
  const { tabela, rotulo } = TABELAS[aba]

  async function adicionar(e) {
    e.preventDefault()
    if (!nomeNovo.trim()) return
    setEnviando(true)
    setErro('')
    const { error } = await supabase.from(tabela).insert({ nome: nomeNovo.trim() })
    setEnviando(false)
    if (error) {
      setErro(error.message.includes('duplicate') ? 'Esse nome já existe.' : error.message)
      return
    }
    setNomeNovo('')
    aoAtualizar()
  }

  async function remover(id) {
    if (!confirm(`Remover este ${rotulo.toLowerCase()}? Isso só funciona se nenhum item estiver usando ele.`)) return
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) {
      alert('Não foi possível remover — provavelmente existe item usando esse valor.')
      return
    }
    aoAtualizar()
  }

  return (
    <div>
      <div className="abas-secundarias">
        {Object.entries(TABELAS).map(([chave, info]) => (
          <button
            key={chave}
            className={aba === chave ? 'ativa' : ''}
            onClick={() => { setAba(chave); setErro('') }}
          >
            {info.plural}
          </button>
        ))}
      </div>

      {erro && <div className="erro">{erro}</div>}

      <form onSubmit={adicionar} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={{ flex: 1, padding: '10px 11px', border: '1px solid var(--cor-borda-forte)', borderRadius: 4 }}
          placeholder={`Nova ${rotulo.toLowerCase()}…`}
          value={nomeNovo}
          onChange={(e) => setNomeNovo(e.target.value)}
        />
        <button className="botao botao-primario" disabled={enviando}>Adicionar</button>
      </form>

      {listas[aba].length === 0 && <div className="vazio">Nenhuma {rotulo.toLowerCase()} cadastrada.</div>}

      {listas[aba].map((item) => (
        <div key={item.id} className="req" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{item.nome}</span>
          <button className="botao botao-fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => remover(item.id)}>
            Remover
          </button>
        </div>
      ))}
    </div>
  )
}
