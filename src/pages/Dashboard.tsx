import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import type { Empresa, Interacao, Tipo, TipoOcorrencia, Prioridade, Status } from '../types'

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
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [tiposOcorrencia, setTiposOcorrencia] = useState<TipoOcorrencia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNumero, setEditNumero] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [erroCarregamento, setErroCarregamento] = useState('')

  const [tipo, setTipo] = useState<Tipo>('cliente')
  const [contato, setContato] = useState('')
  const [canal, setCanal] = useState('WhatsApp')
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('media')
  const [status, setStatus] = useState<Status>('andamento')
  const [proximaAcao, setProximaAcao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [empresaNome, setEmpresaNome] = useState('')
  const [tipoOcorrenciaNome, setTipoOcorrenciaNome] = useState('')
  const [modulo, setModulo] = useState('')
  const [impacto, setImpacto] = useState('')
  const [reincidente, setReincidente] = useState(false)

  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')

  const [linksAnexo, setLinksAnexo] = useState<Record<string, string>>({})

  useEffect(() => { carregar(); carregarCadastros() }, [])

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('suporte_interacoes')
.select('*, empresas(nome), tipos_ocorrencia(nome)')
      .order('criado_em', { ascending: false })
    if (error) {
      setErroCarregamento('Não foi possível carregar os registros: ' + error.message)
    } else if (data) {
      setErroCarregamento('')
      setInteracoes(data as Interacao[])
      gerarLinksAnexo(data as Interacao[])
    }
    setCarregando(false)
  }


  function normalizarTexto(valor: string) {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  }

  async function carregarCadastros() {
    const [{ data: empresasData }, { data: tiposData }] = await Promise.all([
      supabase.from('empresas').select('id,nome,nome_normalizado,ativo').eq('ativo', true).order('nome'),
      supabase.from('tipos_ocorrencia').select('id,nome,nome_normalizado,status').in('status', ['aprovado', 'pendente']).order('nome')
    ])
    setEmpresas((empresasData || []) as Empresa[])
    setTiposOcorrencia((tiposData || []) as TipoOcorrencia[])
  }

  async function obterOuCriarEmpresa(nome: string) {
    const normalizado = normalizarTexto(nome)
    const existente = empresas.find(e => e.nome_normalizado === normalizado)
    if (existente) return existente.id

    const { data, error } = await supabase
      .from('empresas')
      .insert({ nome: nome.trim(), nome_normalizado: normalizado })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  }

  async function obterOuCriarTipoOcorrencia(nome: string) {
    const normalizado = normalizarTexto(nome)
    const existente = tiposOcorrencia.find(t => t.nome_normalizado === normalizado)
    if (existente) return existente.id

    const { data: usuario } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('tipos_ocorrencia')
      .insert({
        nome: nome.trim(),
        nome_normalizado: normalizado,
        status: 'pendente',
        criado_por: usuario.user?.id || null
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
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
    setEditNumero(null)
    setTipo('cliente')
    setContato('')
    setCanal('WhatsApp')
    setAssunto('')
    setDescricao('')
    setPrioridade('media')
    setStatus('andamento')
    setProximaAcao('')
    setArquivo(null)
    setEmpresaNome('')
    setTipoOcorrenciaNome('')
    setModulo('')
    setImpacto('')
    setReincidente(false)
  }

  function iniciarEdicao(item: Interacao) {
    setEditId(item.id)
    setEditNumero(item.numero)
    setTipo(item.tipo)
    setContato(item.contato)
    setCanal(item.canal)
    setAssunto(item.assunto)
    setDescricao(item.descricao || '')
    setPrioridade(item.prioridade)
    setStatus(item.status)
    setProximaAcao(item.proxima_acao || '')
    setEmpresaNome(item.empresas?.nome || '')
    setTipoOcorrenciaNome(item.tipos_ocorrencia?.nome || '')
    setModulo(item.modulo || '')
    setImpacto(item.impacto || '')
    setReincidente(item.reincidente || false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setMensagem('')
    if (!contato.trim() || !assunto.trim() || !empresaNome.trim() || !tipoOcorrenciaNome.trim()) {
      alert('Preencha contato, empresa, tipo de ocorrência e assunto.')
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

    let empresa_id: string
    let tipo_ocorrencia_id: string
    try {
      empresa_id = await obterOuCriarEmpresa(empresaNome)
      tipo_ocorrencia_id = await obterOuCriarTipoOcorrencia(tipoOcorrenciaNome)
    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido'
      alert('Não foi possível salvar a classificação: ' + mensagemErro)
      return
    }

    const dados = {
      tipo, contato, canal, assunto,
      descricao: descricao || null,
      prioridade, status,
      proxima_acao: proximaAcao || null,
      empresa_id,
      tipo_ocorrencia_id,
      modulo: modulo || null,
      impacto: impacto || null,
      reincidente,
      encaminhado_desenvolvimento: tipo === 'desenvolvimento',
      ...(anexo_path ? { anexo_path } : {})
    }

    if (editId) {
      const { error } = await supabase.from('suporte_interacoes').update(dados).eq('id', editId)
      if (error) { alert('Erro ao atualizar: ' + error.message); return }
      setMensagem(`Registro #${String(editNumero ?? 0).padStart(4, '0')} atualizado com sucesso.`)
    } else {
      const { data: criado, error } = await supabase
        .from('suporte_interacoes')
        .insert(dados)
        .select('numero')
        .single()
      if (error) { alert('Erro ao registrar: ' + error.message); return }
      setMensagem(`Registro #${String(criado.numero).padStart(4, '0')} criado com sucesso.`)
    }

    limparForm()
    await Promise.all([carregar(), carregarCadastros()])
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

            <div className="numero-registro">
              <span>Número do registro</span>
              <strong>{editNumero ? `#${String(editNumero).padStart(4, '0')}` : 'Gerado automaticamente ao salvar'}</strong>
            </div>

            {mensagem && <div className="mensagem-sucesso">{mensagem}</div>}

            <label>Tipo de interação</label>
            <div className="tipo-toggle">
              <button type="button" className={tipo === 'cliente' ? 'ativo-cliente' : ''} onClick={() => { setTipo('cliente'); setCanal('WhatsApp') }}>Cliente</button>
              <button type="button" className={tipo === 'desenvolvimento' ? 'ativo-dev' : ''} onClick={() => { setTipo('desenvolvimento'); setCanal('Sistema interno') }}>Desenvolvimento</button>
            </div>

            <label>Empresa</label>
            <input
              list="empresas-sugestoes"
              value={empresaNome}
              onChange={e => setEmpresaNome(e.target.value)}
              placeholder="Digite ou selecione a empresa"
            />
            <datalist id="empresas-sugestoes">
              {empresas.map(empresa => <option key={empresa.id} value={empresa.nome} />)}
            </datalist>
            <small className="ajuda-campo">Uma empresa nova será cadastrada automaticamente.</small>

            <label>Tipo de ocorrência</label>
            <input
              list="tipos-ocorrencia-sugestoes"
              value={tipoOcorrenciaNome}
              onChange={e => setTipoOcorrenciaNome(e.target.value)}
              placeholder="Ex: Falha ao emitir relatório"
            />
            <datalist id="tipos-ocorrencia-sugestoes">
              {tiposOcorrencia.map(item => <option key={item.id} value={item.nome} />)}
            </datalist>
            <small className="ajuda-campo">Ao digitar um tipo novo, ele será salvo como pendente e aparecerá nas próximas ocorrências.</small>

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
                <label>Módulo (opcional)</label>
                <input value={modulo} onChange={e => setModulo(e.target.value)} placeholder="Ex: Financeiro" />
              </div>
              <div>
                <label>Impacto (opcional)</label>
                <select value={impacto} onChange={e => setImpacto(e.target.value)}>
                  <option value="">Não informado</option>
                  <option value="baixo">Baixo</option>
                  <option value="medio">Médio</option>
                  <option value="alto">Alto</option>
                  <option value="critico">Crítico</option>
                </select>
              </div>
            </div>

            <label className="checkbox-linha">
              <input type="checkbox" checked={reincidente} onChange={e => setReincidente(e.target.checked)} />
              Esta ocorrência já aconteceu anteriormente
            </label>

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
                {!carregando && erroCarregamento && <p className="erro-lista">{erroCarregamento}</p>}
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
                        {(i.empresas?.nome || i.tipos_ocorrencia?.nome) && (
                          <div className="classificacao">
                            {i.empresas?.nome && <span>{i.empresas.nome}</span>}
                            {i.tipos_ocorrencia?.nome && <span>{i.tipos_ocorrencia.nome}</span>}
                          </div>
                        )}
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
                      {i.modulo && <span>Módulo: {i.modulo}</span>}
                      {i.impacto && <span>Impacto: {i.impacto}</span>}
                      {i.reincidente && <span className="reincidente">Reincidente</span>}
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
