import { useState, FormEvent } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [modoRecuperacao, setModoRecuperacao] = useState(false)
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false)
  const [emailRecuperacaoEnviado, setEmailRecuperacaoEnviado] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha inválidos.')
  }

  async function enviarRecuperacao(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviandoRecuperacao(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })
    setEnviandoRecuperacao(false)
    if (error) {
      setErro('Não foi possível enviar o e-mail de recuperação.')
      return
    }
    setEmailRecuperacaoEnviado(true)
  }

  function voltarAoLogin() {
    setModoRecuperacao(false)
    setEmailRecuperacaoEnviado(false)
    setErro('')
  }

  if (modoRecuperacao) {
    return (
      <div className="login-wrap">
        <form className="login-card" onSubmit={enviarRecuperacao}>
          <h1>Recuperar senha</h1>
          {emailRecuperacaoEnviado ? (
            <p className="mensagem-sucesso">Se o e-mail existir, enviamos um link de recuperação.</p>
          ) : (
            <>
              <label>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              {erro && <p className="erro">{erro}</p>}
              <button type="submit" disabled={enviandoRecuperacao}>
                {enviandoRecuperacao ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </>
          )}
          <button type="button" className="btn-cancelar" onClick={voltarAoLogin}>Voltar ao login</button>
        </form>
      </div>
    )
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={entrar}>
        <h1>Painel de Suporte</h1>
        <label>E-mail</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Senha</label>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
        {erro && <p className="erro">{erro}</p>}
        <button type="submit">Entrar</button>
        <button type="button" className="btn-cancelar" onClick={() => setModoRecuperacao(true)}>
          Esqueci minha senha
        </button>
      </form>
    </div>
  )
}
