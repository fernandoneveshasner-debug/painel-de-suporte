import { useState, FormEvent } from 'react'
import { supabase } from '../supabaseClient'

export default function RedefinirSenha({ onConcluida }: { onConcluida: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  async function redefinir(e: FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)

    if (error) {
      setErro('Não foi possível redefinir a senha. Solicite um novo link de recuperação.')
      return
    }
    setSucesso(true)
  }

  if (sucesso) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Painel de Suporte</h1>
          <p className="mensagem-sucesso">Senha redefinida com sucesso.</p>
          <button onClick={onConcluida}>Ir para o painel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={redefinir}>
        <h1>Definir nova senha</h1>
        <label>Nova senha</label>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} />
        <label>Confirmar nova senha</label>
        <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required minLength={6} />
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar nova senha'}</button>
      </form>
    </div>
  )
}
