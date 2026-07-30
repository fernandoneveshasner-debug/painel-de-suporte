import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import type { Interacao, Empresa, ContatoNotificacao } from '../types'
import { FiltrosRelatorio, rotuloFiltros, nomeArquivo, formatarData, formatarDataHora } from './filtros'
import { calcularResumo, ResumoRelatorio } from './metricas'

const AZUL = '#0f4c81'
const CINZA = '#5b6b80'

export async function carregarLogoDataUrl(): Promise<string | undefined> {
  try {
    const resp = await fetch('/logo.png')
    if (!resp.ok) return undefined
    const blob = await resp.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

function num(n: number): string {
  return `#${String(n).padStart(4, '0')}`
}

function linhaResumo(rotulo: string, valor: number): Content {
  return { columns: [{ text: rotulo, color: CINZA }, { text: String(valor), alignment: 'right', bold: true }] }
}

export function montarDocDefinition(
  chamados: Interacao[],
  resumo: ResumoRelatorio,
  f: FiltrosRelatorio,
  empresas: Empresa[],
  contatos: ContatoNotificacao[],
  logo?: string
): TDocumentDefinitions {
  const cabecalho: Content = {
    columns: [
      ...(logo ? [{ image: logo, width: 34, height: 34 } as Content] : []),
      {
        stack: [
          { text: 'Relatório de Chamados', style: 'titulo' },
          { text: 'Painel de Suporte — Neves Tecnologia', color: CINZA, fontSize: 9 }
        ],
        margin: [logo ? 8 : 0, 2, 0, 0]
      },
      { text: `Emitido em\n${formatarDataHora(new Date().toISOString())}`, alignment: 'right', fontSize: 8, color: CINZA }
    ]
  }

  const resumoBloco: Content = {
    style: 'bloco',
    stack: [
      { text: 'Resumo', style: 'secao' },
      linhaResumo('Total de chamados', resumo.total),
      { text: 'Por status', color: CINZA, margin: [0, 6, 0, 2], fontSize: 9 },
      linhaResumo('Aberto', resumo.porStatus.aberto),
      linhaResumo('Em andamento', resumo.porStatus.andamento),
      linhaResumo('Aguardando retorno', resumo.porStatus.aguardando),
      linhaResumo('Resolvido', resumo.porStatus.resolvido),
      { text: 'Por tipo', color: CINZA, margin: [0, 6, 0, 2], fontSize: 9 },
      linhaResumo('Cliente', resumo.porTipo.cliente),
      linhaResumo('Desenvolvimento', resumo.porTipo.desenvolvimento),
      { text: 'Por prioridade', color: CINZA, margin: [0, 6, 0, 2], fontSize: 9 },
      linhaResumo('Alta', resumo.porPrioridade.alta),
      linhaResumo('Média', resumo.porPrioridade.media),
      linhaResumo('Baixa', resumo.porPrioridade.baixa),
      { text: 'Andamento × Resolução', color: CINZA, margin: [0, 6, 0, 2], fontSize: 9 },
      linhaResumo('Em aberto', resumo.emAberto),
      linhaResumo('Resolvidos', resumo.resolvidos)
    ]
  }

  const cabecalhoTabela = ['Nº', 'Abertura', 'Empresa', 'Assunto', 'Tipo', 'Prior.', 'Status', 'Responsável', 'Resposta']
    .map(t => ({ text: t, style: 'th' }))

  const linhas = chamados.map(c => ([
    { text: num(c.numero), fontSize: 8 },
    { text: formatarData(c.criado_em), fontSize: 8 },
    { text: c.empresas?.nome ?? '—', fontSize: 8 },
    { text: c.assunto, fontSize: 8 },
    { text: c.tipo === 'cliente' ? 'Cliente' : 'Dev', fontSize: 8 },
    { text: c.prioridade, fontSize: 8 },
    { text: c.status, fontSize: 8 },
    { text: c.destinatario?.nome ?? '—', fontSize: 8 },
    { text: c.respondido_por && c.respondido_em ? `${c.respondido_por.nome} (${formatarData(c.respondido_em)})` : '—', fontSize: 8 }
  ]))

  const tabela: Content = chamados.length === 0
    ? { text: 'Nenhum chamado encontrado para os filtros selecionados.', italics: true, color: CINZA, margin: [0, 10, 0, 0] }
    : {
        style: 'bloco',
        table: {
          headerRows: 1,
          widths: [26, 42, '*', '*', 26, 28, 44, '*', '*'],
          body: [cabecalhoTabela, ...linhas]
        },
        layout: {
          hLineColor: () => '#dde4ec',
          vLineColor: () => '#dde4ec'
        }
      }

  return {
    pageSize: 'A4',
    pageMargins: [28, 28, 28, 40],
    content: [
      cabecalho,
      { text: rotuloFiltros(f, empresas, contatos), fontSize: 8, color: CINZA, margin: [0, 8, 0, 0] },
      { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 539, y2: 4, lineColor: '#dde4ec' }] },
      resumoBloco,
      { text: 'Chamados', style: 'secao', margin: [0, 10, 0, 4] },
      tabela
    ],
    styles: {
      titulo: { fontSize: 15, bold: true, color: AZUL },
      secao: { fontSize: 11, bold: true, color: AZUL, margin: [0, 12, 0, 4] },
      bloco: { margin: [0, 4, 0, 0] },
      th: { fontSize: 8, bold: true, color: '#ffffff', fillColor: AZUL, margin: [0, 2, 0, 2] }
    },
    defaultStyle: { fontSize: 9 },
    footer: (currentPage: number, pageCount: number): Content => ({
      columns: [
        { text: 'Painel de Suporte — Neves Tecnologia', fontSize: 7, color: CINZA, margin: [28, 0, 0, 0] },
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 7, color: CINZA, margin: [0, 0, 28, 0] }
      ]
    })
  }
}

export async function gerarPdf(
  chamados: Interacao[],
  f: FiltrosRelatorio,
  empresas: Empresa[],
  contatos: ContatoNotificacao[]
): Promise<void> {
  const [pdfMakeMod, vfsMod, logo] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
    carregarLogoDataUrl()
  ])
  // pdfmake e vfs_fonts variam a forma do export entre versões — resolver defensivamente.
  const pdfMake: any = (pdfMakeMod as any).default ?? pdfMakeMod
  const vfs: any = (vfsMod as any).default ?? vfsMod
  pdfMake.vfs = vfs?.pdfMake?.vfs ?? vfs?.vfs ?? pdfMake.vfs

  const resumo = calcularResumo(chamados)
  const doc = montarDocDefinition(chamados, resumo, f, empresas, contatos, logo)
  pdfMake.createPdf(doc).download(nomeArquivo(f, 'pdf'))
}
