import type { Interacao, Status, Prioridade, Tipo } from '../types'

export interface ResumoRelatorio {
  total: number
  porStatus: Record<Status, number>
  porTipo: Record<Tipo, number>
  porPrioridade: Record<Prioridade, number>
  emAberto: number
  resolvidos: number
}

export function calcularResumo(chamados: Interacao[]): ResumoRelatorio {
  const porStatus: Record<Status, number> = { aberto: 0, andamento: 0, aguardando: 0, resolvido: 0 }
  const porTipo: Record<Tipo, number> = { cliente: 0, desenvolvimento: 0 }
  const porPrioridade: Record<Prioridade, number> = { alta: 0, media: 0, baixa: 0 }

  for (const c of chamados) {
    porStatus[c.status]++
    porTipo[c.tipo]++
    porPrioridade[c.prioridade]++
  }

  const resolvidos = porStatus.resolvido
  const emAberto = porStatus.aberto + porStatus.andamento + porStatus.aguardando

  return { total: chamados.length, porStatus, porTipo, porPrioridade, emAberto, resolvidos }
}
