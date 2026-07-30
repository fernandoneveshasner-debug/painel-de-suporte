import { useState } from 'react'
import type { Empresa, ContatoNotificacao, Status, Prioridade } from '../types'
import { FiltrosRelatorio, filtrosVazios, validarPeriodo, buscarChamados } from './filtros'
import { gerarTxt } from './gerarTxt'
import { gerarPdf } from './gerarPdf'

interface Props {
  empresas: Empresa[]
  contatos: ContatoNotificacao[]
}

export default function RelatoriosCard({ empresas, contatos }: Props) {
  const [f, setF] = useState<FiltrosRelatorio>(filtrosVazios())
  const [gerando, setGerando] = useState<'' | 'pdf' | 'txt'>('')
  const [erro, setErro] = useState('')

  function set<K extends keyof FiltrosRelatorio>(campo: K, valor: FiltrosRelatorio[K]) {
    setF(prev => ({ ...prev, [campo]: valor }))
  }

  async function gerar(formato: 'pdf' | 'txt') {
    setErro('')
    const problema = validarPeriodo(f)
    if (problema) { setErro(problema); return }
    setGerando(formato)
    try {
      const chamados = await buscarChamados(f)
      if (formato === 'txt') gerarTxt(chamados, f, empresas, contatos)
      else await gerarPdf(chamados, f, empresas, contatos)
    } catch (e) {
      setErro('Não foi possível gerar o relatório: ' + (e instanceof Error ? e.message : 'erro desconhecido'))
    } finally {
      setGerando('')
    }
  }

  return (
    <div className="card card-relatorios">
      <h2>Relatórios</h2>
      <p className="ajuda-campo" style={{ marginTop: 0 }}>
        Gere relatórios de chamados por período. PDF para a diretoria, TXT para o técnico.
      </p>

      <div className="row2">
        <div>
          <label>Data inicial</label>
          <input type="date" value={f.inicio} onChange={e => set('inicio', e.target.value)} />
        </div>
        <div>
          <label>Data final</label>
          <input type="date" value={f.fim} onChange={e => set('fim', e.target.value)} />
        </div>
      </div>

      <div className="row2">
        <div>
          <label>Tipo</label>
          <select value={f.tipo} onChange={e => set('tipo', e.target.value as FiltrosRelatorio['tipo'])}>
            <option value="">Todos</option>
            <option value="cliente">Cliente</option>
            <option value="desenvolvimento">Desenvolvimento</option>
          </select>
        </div>
        <div>
          <label>Empresa</label>
          <select value={f.empresaId} onChange={e => set('empresaId', e.target.value)}>
            <option value="">Todas</option>
            {empresas.map(em => <option key={em.id} value={em.id}>{em.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="row2">
        <div>
          <label>Status</label>
          <select value={f.status} onChange={e => set('status', e.target.value as '' | Status)}>
            <option value="">Todos</option>
            <option value="aberto">Aberto</option>
            <option value="andamento">Em andamento</option>
            <option value="aguardando">Aguardando retorno</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>
        <div>
          <label>Prioridade</label>
          <select value={f.prioridade} onChange={e => set('prioridade', e.target.value as '' | Prioridade)}>
            <option value="">Todas</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
      </div>

      <label>Responsável (destinatário)</label>
      <select value={f.destinatarioId} onChange={e => set('destinatarioId', e.target.value)}>
        <option value="">Todos</option>
        {contatos.filter(c => c.recebe_solicitacoes).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>

      {erro && <div className="erro-lista" style={{ marginTop: 12 }}>{erro}</div>}

      <div className="relatorios-botoes">
        <button type="button" className="btn-salvar" disabled={gerando !== ''} onClick={() => gerar('pdf')}>
          {gerando === 'pdf' ? 'Gerando PDF...' : 'Gerar PDF (diretoria)'}
        </button>
        <button type="button" className="btn-cancelar" disabled={gerando !== ''} onClick={() => gerar('txt')}>
          {gerando === 'txt' ? 'Gerando TXT...' : 'Gerar TXT (técnico)'}
        </button>
      </div>
    </div>
  )
}
