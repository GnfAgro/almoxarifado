import { useState } from 'react'
import { supabase } from '../supabaseClient'

function NovoNome({ placeholder, aoAdicionar }) {
  const [valor, setValor] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (!valor.trim()) return
    setEnviando(true)
    const ok = await aoAdicionar(valor.trim())
    setEnviando(false)
    if (ok) setValor('')
  }

  return (
    <form className="novo-nome" onSubmit={enviar}>
      <input placeholder={placeholder} value={valor} onChange={(e) => setValor(e.target.value)} />
      <button className="botao botao-primario" disabled={enviando}>+</button>
    </form>
  )
}

export default function GerenciarCatalogo({ categorias, tipos, funcoes, aoAtualizar }) {
  const [abertas, setAbertas] = useState({})

  function alternar(id) {
    setAbertas((a) => ({ ...a, [id]: !a[id] }))
  }

  async function adicionar(tabela, payload) {
    const { error } = await supabase.from(tabela).insert(payload)
    if (error) {
      alert(error.message.includes('duplicate') ? 'Esse nome já existe aqui.' : error.message)
      return false
    }
    aoAtualizar()
    return true
  }

  async function remover(tabela, id, aviso) {
    if (!confirm(aviso)) return
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) {
      alert('Não foi possível remover: existem itens cadastrados usando isso.')
      return
    }
    aoAtualizar()
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--cor-tinta-suave)', marginBottom: 12 }}>
        Cada categoria tem seus próprios tipos, e cada tipo tem suas próprias funções.
      </div>

      <NovoNome
        placeholder="Nova categoria…"
        aoAdicionar={(nome) => adicionar('categorias', { nome })}
      />

      {categorias.length === 0 && <div className="vazio">Nenhuma categoria cadastrada.</div>}

      {categorias.map((cat) => {
        const tiposCat = tipos.filter((t) => t.categoria_id === cat.id)
        const aberta = !!abertas[cat.id]
        return (
          <div className="arvore-cat" key={cat.id}>
            <div className="arvore-cab" onClick={() => alternar(cat.id)}>
              <div>
                <strong>{cat.nome}</strong>
                <span className="arvore-contagem">
                  {tiposCat.length} {tiposCat.length === 1 ? 'tipo' : 'tipos'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="arvore-remover"
                  onClick={(e) => {
                    e.stopPropagation()
                    remover('categorias', cat.id, `Remover a categoria "${cat.nome}" e todos os tipos e funções dela?`)
                  }}
                >
                  Remover
                </button>
                <span>{aberta ? '▾' : '▸'}</span>
              </div>
            </div>

            {aberta && (
              <div className="arvore-corpo">
                {tiposCat.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--cor-tinta-suave)', marginBottom: 8 }}>
                    Nenhum tipo nesta categoria ainda.
                  </div>
                )}

                {tiposCat.map((tipo) => {
                  const funcoesTipo = funcoes.filter((f) => f.tipo_id === tipo.id)
                  return (
                    <div className="arvore-tipo" key={tipo.id}>
                      <div className="arvore-linha">
                        <span className="arvore-tipo-nome">{tipo.nome}</span>
                        <button
                          className="arvore-remover"
                          onClick={() => remover('tipos', tipo.id, `Remover o tipo "${tipo.nome}" e as funções dele?`)}
                        >
                          Remover
                        </button>
                      </div>
                      <div className="arvore-funcoes">
                        {funcoesTipo.map((f) => (
                          <span className="chip" key={f.id}>
                            {f.nome}
                            <button
                              aria-label={`Remover ${f.nome}`}
                              onClick={() => remover('funcoes', f.id, `Remover a função "${f.nome}"?`)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <NovoNome
                        placeholder="Nova função neste tipo…"
                        aoAdicionar={(nome) => adicionar('funcoes', { nome, tipo_id: tipo.id })}
                      />
                    </div>
                  )
                })}

                <NovoNome
                  placeholder="Novo tipo nesta categoria…"
                  aoAdicionar={(nome) => adicionar('tipos', { nome, categoria_id: cat.id })}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
