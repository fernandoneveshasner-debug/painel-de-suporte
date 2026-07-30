import type { Interacao, Empresa, ContatoNotificacao } from '../types'
import { FiltrosRelatorio, rotuloFiltros, nomeArquivo, formatarDataHora } from './filtros'
import { baixarArquivo } from './download'

function sim(v: boolean): string {
  return v ? 'Sim' : 'Não'
}

function num(n: number): string {
  return `#${String(n).padStart(4, '0')}`
}

export function montarTxt(
  chamados: Interacao[],
  f: FiltrosRelatorio,
  empresas: Empresa[],
  contatos: ContatoNotificacao[]
): string {
  const linhas: string[] = []
  linhas.push('RELATÓRIO DE CHAMADOS — PAINEL DE SUPORTE')
  linhas.push(`Emitido em: ${formatarDataHora(new Date().toISOString())}`)
  linhas.push(rotuloFiltros(f, empresas, contatos))
  linhas.push(`Total de chamados: ${chamados.length}`)
  linhas.push('')

  if (chamados.length === 0) {
    linhas.push('Nenhum chamado encontrado para os filtros selecionados.')
    return linhas.join('\n')
  }

  const div = '-'.repeat(72)
  for (const c of chamados) {
    linhas.push(div)
    linhas.push(`${num(c.numero)} · ${c.assunto}`)
    linhas.push(`Criado em: ${formatarDataHora(c.criado_em)}   Atualizado em: ${formatarDataHora(c.atualizado_em ?? null)}`)
    linhas.push(`Tipo: ${c.tipo === 'cliente' ? 'Cliente' : 'Desenvolvimento'}   Canal: ${c.canal}`)
    linhas.push(`Empresa: ${c.empresas?.nome ?? '—'}`)
    const categoria = c.tipos_ocorrencia?.categorias_ocorrencia?.nome ?? '—'
    const tipoOc = c.tipos_ocorrencia?.nome ?? '—'
    linhas.push(`Categoria: ${categoria}   Tipo de ocorrência: ${tipoOc}${c.tipo_ocorrencia_outro ? ` (${c.tipo_ocorrencia_outro})` : ''}`)
    linhas.push(`Módulo: ${c.modulo ?? '—'}   Impacto: ${c.impacto ?? '—'}`)
    linhas.push(`Prioridade: ${c.prioridade}   Status: ${c.status}`)
    linhas.push(`Solicitante: ${c.solicitante?.nome ?? '—'}   Responsável (destinatário): ${c.destinatario?.nome ?? '—'}`)
    linhas.push(`Descrição: ${c.descricao ?? '—'}`)
    linhas.push(`Próxima ação: ${c.proxima_acao ?? '—'}`)
    linhas.push(`Causa: ${c.causa ?? '—'}`)
    linhas.push(`Solução aplicada: ${c.solucao_aplicada ?? '—'}`)
    if (c.respondido_por && c.respondido_em) {
      linhas.push(`Resposta por: ${c.respondido_por.nome} em ${formatarDataHora(c.respondido_em)}`)
      linhas.push(`Resposta: ${c.resposta ?? '—'}`)
    }
    linhas.push(`Reincidente: ${sim(c.reincidente)}   Possui anexo: ${sim(!!c.anexo_path)}`)
    linhas.push('')
  }

  return linhas.join('\n')
}

export function gerarTxt(
  chamados: Interacao[],
  f: FiltrosRelatorio,
  empresas: Empresa[],
  contatos: ContatoNotificacao[]
): void {
  const texto = montarTxt(chamados, f, empresas, contatos)
  // BOM para o Bloco de Notas do Windows respeitar acentuação UTF-8
  baixarArquivo(nomeArquivo(f, 'txt'), '﻿' + texto, 'text/plain;charset=utf-8')
}
