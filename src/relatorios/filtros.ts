import { supabase } from '../supabaseClient'
import type { Interacao, Empresa, ContatoNotificacao, Status, Prioridade } from '../types'

export interface FiltrosRelatorio {
  inicio: string // 'YYYY-MM-DD' ou ''
  fim: string // 'YYYY-MM-DD' ou ''
  tipo: '' | 'cliente' | 'desenvolvimento'
  empresaId: string // '' = todas
  status: '' | Status
  prioridade: '' | Prioridade
  destinatarioId: string // '' = todos
}

export function filtrosVazios(): FiltrosRelatorio {
  return { inicio: '', fim: '', tipo: '', empresaId: '', status: '', prioridade: '', destinatarioId: '' }
}

export function validarPeriodo(f: FiltrosRelatorio): string | null {
  if (f.inicio && f.fim && f.inicio > f.fim) {
    return 'A data inicial não pode ser maior que a data final.'
  }
  return null
}

const SELECT_CHAMADOS = `
  *,
  empresas(nome),
  tipos_ocorrencia(nome, categorias_ocorrencia(nome)),
  solicitante:contatos_notificacao!suporte_interacoes_solicitante_contato_id_fkey(nome,email),
  destinatario:contatos_notificacao!suporte_interacoes_destinatario_contato_id_fkey(nome,email),
  respondido_por:contatos_notificacao!suporte_interacoes_respondido_por_contato_id_fkey(nome,email)
`

export async function buscarChamados(f: FiltrosRelatorio): Promise<Interacao[]> {
  let query = supabase
    .from('suporte_interacoes')
    .select(SELECT_CHAMADOS)
    .order('criado_em', { ascending: false })

  if (f.inicio) query = query.gte('criado_em', f.inicio)
  if (f.fim) query = query.lte('criado_em', `${f.fim}T23:59:59.999`)
  if (f.tipo) query = query.eq('tipo', f.tipo)
  if (f.empresaId) query = query.eq('empresa_id', f.empresaId)
  if (f.status) query = query.eq('status', f.status)
  if (f.prioridade) query = query.eq('prioridade', f.prioridade)
  if (f.destinatarioId) query = query.eq('destinatario_contato_id', f.destinatarioId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as unknown as Interacao[]
}

const STATUS_LABEL: Record<Status, string> = {
  aberto: 'Aberto',
  andamento: 'Em andamento',
  aguardando: 'Aguardando retorno',
  resolvido: 'Resolvido'
}
const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa'
}

export function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

// 'YYYY-MM-DD' -> 'dd/mm/aaaa' sem virar objeto Date (evita deslocamento de fuso)
function formatarDataDate(ymd: string): string {
  const [a, m, d] = ymd.split('-')
  return `${d}/${m}/${a}`
}

export function rotuloFiltros(f: FiltrosRelatorio, empresas: Empresa[], contatos: ContatoNotificacao[]): string {
  const periodo = f.inicio || f.fim
    ? `${f.inicio ? formatarDataDate(f.inicio) : 'início'} a ${f.fim ? formatarDataDate(f.fim) : 'hoje'}`
    : 'todos os períodos'
  const empresa = f.empresaId ? (empresas.find(e => e.id === f.empresaId)?.nome ?? '—') : 'todas'
  const responsavel = f.destinatarioId ? (contatos.find(c => c.id === f.destinatarioId)?.nome ?? '—') : 'todos'
  const tipo = f.tipo ? (f.tipo === 'cliente' ? 'Cliente' : 'Desenvolvimento') : 'todos'
  const status = f.status ? STATUS_LABEL[f.status] : 'todos'
  const prioridade = f.prioridade ? PRIORIDADE_LABEL[f.prioridade] : 'todas'
  return `Período: ${periodo} · Tipo: ${tipo} · Empresa: ${empresa} · Status: ${status} · Prioridade: ${prioridade} · Responsável: ${responsavel}`
}

export function nomeArquivo(f: FiltrosRelatorio, ext: 'pdf' | 'txt'): string {
  if (f.inicio || f.fim) {
    const ini = f.inicio || 'inicio'
    const fim = f.fim || 'hoje'
    return `relatorio-chamados_${ini}_a_${fim}.${ext}`
  }
  const hoje = new Date().toISOString().slice(0, 10)
  return `relatorio-chamados_completo_${hoje}.${ext}`
}
