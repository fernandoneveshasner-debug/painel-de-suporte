import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import type { Interacao, Tipo, Prioridade, Status } from '../types'

const statusLabel: Record<Status, string> = {
  aberto: 'Aberto',
  andamento: 'Em andamento',
  aguardando: 'Aguardando retorno',
  resolvido: 'Resolvido'
}

const prioridadeLabel: Record<Prioridade, string> = {
  alta: 'Alta prioridade',
  media: 'Média prioridade',
  baixa: 'Baixa prioridade'
}

export default function Dashboard() {
  const [interacoes, setInteracoes] = useState<Interacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)

  const [tipo, setTipo] = useState<Tipo>('cliente')
  const [contato, setContato] = useState('')
  const [canal, setCanal] = useState('WhatsApp')
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('media')
  const [status, setStatus] = useState<Status>('andamento')
  const [proximaAcao, setProximaAcao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)

  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')

  const [linksAnexo, setLinksAnexo] = useState<Record<string, string>>({})

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('suporte_interacoes')
      .select('*')
      .order('criado_em', { ascending: false })
    if (!error && data) {
      setInteracoes(data as Interacao[])
      gerarLinksAnexo(data as Interacao[])
    }
    setCarregando(false)
  }

  async function gerarLinksAnexo(lista: Interacao[]) {
    const novosLinks: Record<string, string> = {}
    for (const item of lista) {
      if (item.anexo_path) {
        const { data } = await supabase.storage
          .from('anexos-suporte')
          .createSignedUrl(item.anexo_path, 60 * 60)
        if (data?.signedUrl) novosLinks[item.id] = data.signedUrl
      }
    }
    setLinksAnexo(novosLinks)
  }

  function limparForm() {
    setEditId(null)
    setTipo('cliente')
    setContato('')
    setCanal('WhatsApp')
    setAssunto('')
    setDescricao('')
    setPrioridade('media')
    setStatus('andamento')
    setProximaAcao('')
    setArquivo(null)
  }

  function iniciarEdicao(item: Interacao) {
    setEditId(item.id)
    setTipo(item.tipo)
    setContato(item.contato)
    setCanal(item.canal)
    setAssunto(item.assunto)
    setDescricao(item.descricao || '')
    setPrioridade(item.prioridade)
    setStatus(item.status)
    setProximaAcao(item.proxima_acao || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!contato.trim() || !assunto.trim()) {
      alert('Preencha ao menos o nome do contato e o assunto.')
      return
    }

    let anexo_path: string | null = null
    if (arquivo) {
      const caminho = `${Date.now()}_${arquivo.name}`
      const { error: erroUpload } = await supabase.storage
        .from('anexos-suporte')
        .upload(caminho, arquivo)
      if (erroUpload) {
        alert('Falha ao enviar o anexo: ' + erroUpload.message)
        return
      }
      anexo_path = caminho
    }

    const dados = {
      tipo, contato, canal, assunto,
      descricao: descricao || null,
      prioridade, status,
      proxima_acao: proximaAcao || null,
      ...(anexo_path ? { anexo_path } : {})
    }

    if (editId) {
      const { error } = await supabase.from('suporte_interacoes').update(dados).eq('id', editId)
      if (error) { alert('Erro ao atualizar: ' + error.message); return }
    } else {
      const { error } = await supabase.from('suporte_interacoes').insert(dados)
      if (error) { alert('Erro ao registrar: ' + error.message); return }
    }

    limparForm()
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este registro?')) return
    const { error } = await supabase.from('suporte_interacoes').delete().eq('id', id)
    if (error) { alert('Erro ao excluir: ' + error.message); return }
    carregar()
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  const filtradas = interacoes.filter(i => {
    if (filtroTipo && i.tipo !== filtroTipo) return false
    if (filtroStatus && i.status !== filtroStatus) return false
    if (busca && !(i.contato.toLowerCase().includes(busca.toLowerCase()) || i.assunto.toLowerCase().includes(busca.toLowerCase()))) return false
    return true
  })

  const total = interacoes.length
  const abertos = interacoes.filter(i => i.status === 'aberto' || i.status === 'andamento').length
  const clientes = interacoes.filter(i => i.tipo === 'cliente').length
  const dev = interacoes.filter(i => i.tipo === 'desenvolvimento').length

  return (
    <div>
      <header className="topo">
        <img src="/logo.png" alt="Logo" />
        <div>
          <h1>Painel de registro de suporte</h1>
          <p>Interações com clientes (WhatsApp) e com o setor de desenvolvimento</p>
        </div>
        <button className="btn-sair" onClick={sair}>Sair</button>
      </header>

      <div className="wrap">
        <div className="grid">
          <form className="card" onSubmit={salvar}>
            <h2>{editId ? 'Editar interação' : 'Nova interação'}</h2>

            <label>Tipo de interação</label>
            <div className="tipo-toggle">
              <button type="button" className={tipo === 'cliente' ? 'ativo-cliente' : ''} onClick={() => { setTipo('cliente'); setCanal('WhatsApp') }}>Cliente</button>
              <button type="button" className={tipo === 'desenvolvimento' ? 'ativo-dev' : ''} onClick={() => { setTipo('desenvolvimento'); setCanal('Sistema interno') }}>Desenvolvimento</button>
            </div>

            <label>Nome do contato</label>
            <input value={contato} onChange={e => setContato(e.target.value)} placeholder="Ex: João Silva / Time Backend" />

            <label>Canal</label>
            <select value={canal} onChange={e => setCanal(e.target.value)}>
              <option>WhatsApp</option>
              <option>Ligação</option>
              <option>E-mail</option>
              <option>Sistema interno</option>
              <option>Presencial</option>
            </select>

            <label>Assunto</label>
            <input value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Resumo curto do assunto" />

            <label>Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes da interação..." />

            <div className="row2">
              <div>
                <label>Prioridade</label>
                <select value={prioridade} onChange={e => setPrioridade(e.target.value as Prioridade)}>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div>
                <label>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as Status)}>
                  <option value="aberto">Aberto</option>
                  <option value="andamento">Em andamento</option>
                  <option value="aguardando">Aguardando retorno</option>
                  <option value="resolvido">Resolvido</option>
                </select>
              </div>
            </div>

            <label>Próxima ação (opcional)</label>
            <input value={proximaAcao} onChange={e => setProximaAcao(e.target.value)} placeholder="Ex: Aguardar retorno do dev até sexta" />

            <label>Anexo (opcional)</label>
            <input type="file" onChange={e => setArquivo(e.target.files?.[0] || null)} />

            <button className="btn-salvar" type="submit">{editId ? 'Salvar alterações' : 'Registrar interação'}</button>
            {editId && <button type="button" className="btn-cancelar" onClick={limparForm}>Cancelar edição</button>}
          </form>

          <div>
            <div className="resumo">
              <div className="box"><b>{total}</b><span>Total</span></div>
              <div className="box"><b>{abertos}</b><span>Em aberto</span></div>
              <div className="box"><b>{clientes}</b><span>Clientes</span></div>
              <div className="box"><b>{dev}</b><span>Desenvolvimento</span></div>
            </div>

            <div className="card">
              <h2>Histórico de interações</h2>
              <div className="filtros">
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  <option value="cliente">Cliente</option>
                  <option value="desenvolvimento">Desenvolvimento</option>
                </select>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                  <option value="">Todos os status</option>
                  <option value="aberto">Aberto</option>
                  <option value="andamento">Em andamento</option>
                  <option value="aguardando">Aguardando retorno</option>
                  <option value="resolvido">Resolvido</option>
                </select>
                <input placeholder="Buscar por nome ou assunto" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>

              <div className="lista">
                {carregando && <p className="vazio">Carregando...</p>}
                {!carregando && filtradas.length === 0 && <p className="vazio">Nenhuma interação registrada ainda.</p>}
                {filtradas.map(i => (
                  <div key={i.id} className={`item ${i.tipo}`}>
                    <div className="item-top">
                      <div className="info">
                        <span className={`item-tag ${i.tipo === 'cliente' ? 'tag-cliente' : 'tag-dev'}`}>
                          {i.tipo === 'cliente' ? 'Cliente' : 'Desenvolvimento'}
                        </span>
                        <h3>#{String(i.numero).padStart(4, '0')} · {i.assunto}</h3>
                        <div className="contato">{i.contato} · {i.canal}</div>
                      </div>
                      <div className="acoes">
                        <button onClick={() => iniciarEdicao(i)}>Editar</button>
                        <button onClick={() => excluir(i.id)}>Excluir</button>
                      </div>
                    </div>
                    {i.descricao && <p className="desc">{i.descricao}</p>}
                    {i.proxima_acao && <p className="desc"><b>Próxima ação:</b> {i.proxima_acao}</p>}
                    {i.anexo_path && linksAnexo[i.id] && (
                      <p className="desc"><b>Anexo:</b> <a href={linksAnexo[i.id]} target="_blank" rel="noopener noreferrer">abrir arquivo</a></p>
                    )}
                    <div className="meta">
                      <span className={`pill pill-${i.status}`}>{statusLabel[i.status]}</span>
                      <span className={`prio-${i.prioridade}`}>{prioridadeLabel[i.prioridade]}</span>
                      <span>{new Date(i.criado_em).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
