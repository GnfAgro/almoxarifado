import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { entrar } = useAuth()
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function aoSubmeter(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await entrar(email, senha)
    setEnviando(false)
    if (error) {
      setErro('E-mail ou senha incorretos.')
      return
    }
    navegar('/painel')
  }

  return (
    <div className="tela-login">
      <div className="marca-login">GNF AGRO</div>
      <div className="sub-login">Acesso do almoxarife e administrador</div>

      {erro && <div className="erro">{erro}</div>}

      <form onSubmit={aoSubmeter}>
        <div className="campo">
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className="campo">
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button className="botao botao-primario botao-bloco" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
