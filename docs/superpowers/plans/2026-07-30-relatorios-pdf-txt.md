# Relatórios de Chamados (PDF/TXT) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao Painel de Suporte um card fixo que gera relatórios dos chamados filtrados por período e critérios, exportando em PDF (diretoria) e TXT (técnico), 100% no navegador.

**Architecture:** Módulo isolado em `src/relatorios/` com funções puras para filtro/métricas/formatação e dois geradores (PDF via pdfmake com import dinâmico; TXT via string + Blob). Um componente `RelatoriosCard` é montado na coluna direita do `Dashboard`, sem alterar formulário nem lista existentes.

**Tech Stack:** Vite + React 18 + TypeScript (strict) + Supabase-js. Nova dependência: `pdfmake` (+ `@types/pdfmake`).

## Global Constraints

- **TypeScript strict** — `tsconfig.json` tem `"strict": true`; todo código deve tipar corretamente.
- **Sem test runner** — o projeto não tem Vitest/Jest e a decisão foi **verificação manual**. Cada task fecha com `npm run build` (typecheck via `tsc -b`) + verificação manual descrita + commit. Não adicionar dependência de teste.
- **Não tocar** em `src/pages/Dashboard.tsx` além de montar o `<RelatoriosCard/>` (Task 5); não alterar o formulário, a lista, nem o fluxo n8n/Gmail.
- **Base do período:** `criado_em` (data de abertura).
- **"Responsável" = Destinatário** (`destinatario_contato_id`).
- **Resposta:** exibir `respondido_por` + `respondido_em` apenas quando ambos existirem.
- **Idioma:** todo texto de UI e dos relatórios em **português (pt-BR)**, UTF-8.
- **pdfmake carregado via `import()` dinâmico** dentro de `gerarPdf.ts` — nunca no topo de um módulo importado pelo Dashboard, para não entrar no chunk inicial.
- **Estilo visual:** reusar as classes/tokens de `src/styles.css` (`.card`, `.row2`, `.filtros`, `.btn-salvar`, vars `--azul-*`, etc.). Classes novas vão no fim de `styles.css`.
- Branch de trabalho: `feat/relatorios-pdf-txt` (já criado).

---

## File Structure

- `src/relatorios/filtros.ts` — tipo `FiltrosRelatorio`, `buscarChamados`, `rotuloFiltros`, `nomeArquivo`, formatação de datas.
- `src/relatorios/metricas.ts` — `ResumoRelatorio`, `calcularResumo` (pura).
- `src/relatorios/download.ts` — `baixarArquivo` (helper de download via Blob).
- `src/relatorios/gerarTxt.ts` — `montarTxt` (pura), `gerarTxt` (monta + baixa).
- `src/relatorios/gerarPdf.ts` — `carregarLogoDataUrl`, `montarDocDefinition` (pura), `gerarPdf` (import dinâmico + baixa).
- `src/relatorios/RelatoriosCard.tsx` — UI do card (filtros + botões + estados).
- `src/pages/Dashboard.tsx` — **modificar**: montar `<RelatoriosCard/>` na coluna direita.
- `src/styles.css` — **modificar**: classes do card de relatórios (append).
- `package.json` — **modificar**: adicionar `pdfmake` e `@types/pdfmake`.

Tipos reutilizados de `src/types.ts`: `Interacao`, `Empresa`, `ContatoNotificacao`, `Status`, `Prioridade`, `Tipo`.

---

## Task 1: Filtros, busca e formatação (`filtros.ts`)

**Files:**
- Create: `src/relatorios/filtros.ts`

**Interfaces:**
- Consumes: `supabase` de `../supabaseClient`; tipos `Interacao, Empresa, ContatoNotificacao, Status, Prioridade` de `../types`.
- Produces:
  - `interface FiltrosRelatorio { inicio: string; fim: string; tipo: '' | 'cliente' | 'desenvolvimento'; empresaId: string; status: '' | Status; prioridade: '' | Prioridade; destinatarioId: string }`
  - `function filtrosVazios(): FiltrosRelatorio`
  - `function validarPeriodo(f: FiltrosRelatorio): string | null` (retorna mensagem de erro ou `null`)
  - `async function buscarChamados(f: FiltrosRelatorio): Promise<Interacao[]>`
  - `function rotuloFiltros(f: FiltrosRelatorio, empresas: Empresa[], contatos: ContatoNotificacao[]): string`
  - `function nomeArquivo(f: FiltrosRelatorio, ext: 'pdf' | 'txt'): string`
  - `function formatarData(iso: string | null): string` (dd/mm/aaaa)
  - `function formatarDataHora(iso: string | null): string` (dd/mm/aaaa hh:mm)

- [ ] **Step 1: Criar o arquivo com todo o conteúdo**

```ts
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

// 'YYYY-MM-DD' -> 'dd/mm/aaaa' sem virar objeto Date (evita deslocamento de fuso)
function formatarDataDate(ymd: string): string {
  const [a, m, d] = ymd.split('-')
  return `${d}/${m}/${a}`
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
```

- [ ] **Step 2: Rodar o build para verificar tipos**

Run: `npm run build`
Expected: PASS (sem erros de TypeScript). O `filtros.ts` ainda não é importado por ninguém, mas deve compilar.

- [ ] **Step 3: Commit**

```bash
git add src/relatorios/filtros.ts
git commit -m "feat(relatorios): tipos de filtro, busca no Supabase e formatação"
```

---

## Task 2: Métricas do resumo (`metricas.ts`)

**Files:**
- Create: `src/relatorios/metricas.ts`

**Interfaces:**
- Consumes: `Interacao, Status, Prioridade, Tipo` de `../types`.
- Produces:
  - `interface ResumoRelatorio { total: number; porStatus: Record<Status, number>; porTipo: Record<Tipo, number>; porPrioridade: Record<Prioridade, number>; emAberto: number; resolvidos: number }`
  - `function calcularResumo(chamados: Interacao[]): ResumoRelatorio`

- [ ] **Step 1: Criar o arquivo**

```ts
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
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/relatorios/metricas.ts
git commit -m "feat(relatorios): cálculo do resumo de métricas"
```

---

## Task 3: Download helper + geração TXT (`download.ts`, `gerarTxt.ts`)

**Files:**
- Create: `src/relatorios/download.ts`
- Create: `src/relatorios/gerarTxt.ts`

**Interfaces:**
- Consumes: `FiltrosRelatorio, rotuloFiltros, nomeArquivo, formatarData, formatarDataHora` de `./filtros`; `Interacao, Empresa, ContatoNotificacao` de `../types`.
- Produces:
  - `download.ts`: `function baixarArquivo(nome: string, conteudo: BlobPart, mime: string): void`
  - `gerarTxt.ts`: `function montarTxt(chamados: Interacao[], f: FiltrosRelatorio, empresas: Empresa[], contatos: ContatoNotificacao[]): string` e `function gerarTxt(chamados: Interacao[], f: FiltrosRelatorio, empresas: Empresa[], contatos: ContatoNotificacao[]): void`

- [ ] **Step 1: Criar `download.ts`**

```ts
export function baixarArquivo(nome: string, conteudo: BlobPart, mime: string): void {
  const blob = new Blob([conteudo], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Criar `gerarTxt.ts`**

```ts
import type { Interacao, Empresa, ContatoNotificacao } from '../types'
import { FiltrosRelatorio, rotuloFiltros, nomeArquivo, formatarData, formatarDataHora } from './filtros'
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
```

Nota: `formatarData` foi importado mas pode não ser usado — se o `tsc` reclamar de import não usado (`noUnusedLocals` NÃO está ligado no tsconfig, então não reclama), pode deixar. Se preferir, remova `formatarData` do import.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/relatorios/download.ts src/relatorios/gerarTxt.ts
git commit -m "feat(relatorios): geração do relatório TXT (técnico) + helper de download"
```

---

## Task 4: Geração PDF com pdfmake (`gerarPdf.ts`)

**Files:**
- Modify: `package.json` (adicionar `pdfmake` e `@types/pdfmake`)
- Create: `src/relatorios/gerarPdf.ts`

**Interfaces:**
- Consumes: `FiltrosRelatorio, rotuloFiltros, nomeArquivo, formatarData, formatarDataHora` de `./filtros`; `ResumoRelatorio, calcularResumo` de `./metricas`; `Interacao, Empresa, ContatoNotificacao` de `../types`.
- Produces:
  - `async function carregarLogoDataUrl(): Promise<string | undefined>`
  - `function montarDocDefinition(chamados, resumo, f, empresas, contatos, logo?): TDocumentDefinitions`
  - `async function gerarPdf(chamados, f, empresas, contatos): Promise<void>`

- [ ] **Step 1: Instalar dependências**

```bash
npm install pdfmake@^0.2 && npm install -D @types/pdfmake
```

Expected: `package.json` passa a listar `pdfmake` em dependencies e `@types/pdfmake` em devDependencies.

- [ ] **Step 2: Criar `gerarPdf.ts`**

```ts
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
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS. Se o `tsc` reclamar de tipos do `pdfmake/build/vfs_fonts` (sem declaração), adicionar em `src/vite-env.d.ts`: `declare module 'pdfmake/build/vfs_fonts'` e `declare module 'pdfmake/build/pdfmake'` (apenas se necessário — `@types/pdfmake` costuma cobrir).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/relatorios/gerarPdf.ts src/vite-env.d.ts
git commit -m "feat(relatorios): geração do relatório PDF (diretoria) via pdfmake"
```

---

## Task 5: Card de UI e integração no Dashboard (`RelatoriosCard.tsx`, `Dashboard.tsx`, `styles.css`)

**Files:**
- Create: `src/relatorios/RelatoriosCard.tsx`
- Modify: `src/pages/Dashboard.tsx` (montar o card na coluna direita)
- Modify: `src/styles.css` (append das classes do card)

**Interfaces:**
- Consumes: `FiltrosRelatorio, filtrosVazios, validarPeriodo, buscarChamados` de `./filtros`; `gerarTxt` de `./gerarTxt`; `gerarPdf` de `./gerarPdf`; `Empresa, ContatoNotificacao, Status, Prioridade` de `../types`.
- Produces: `export default function RelatoriosCard({ empresas, contatos }: { empresas: Empresa[]; contatos: ContatoNotificacao[] })`

- [ ] **Step 1: Criar `RelatoriosCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Montar o card no Dashboard**

Em `src/pages/Dashboard.tsx`, adicionar o import no topo (junto dos outros imports):

```tsx
import RelatoriosCard from '../relatorios/RelatoriosCard'
```

E, na coluna direita, inserir o card **logo após** o bloco `<div className="resumo">...</div>` e **antes** do `<div className="card">` do "Histórico de interações". Ou seja, entre a linha que fecha `</div>` do `resumo` (por volta da linha 435) e a `<div className="card">` do histórico (linha 437), inserir:

```tsx
            <RelatoriosCard empresas={empresas} contatos={contatosNotificacao} />
```

Contexto exato do trecho a modificar (a estrutura atual é):

```tsx
            <div className="resumo">
              <div className="box"><b>{total}</b><span>Total</span></div>
              <div className="box"><b>{abertos}</b><span>Em aberto</span></div>
              <div className="box"><b>{clientes}</b><span>Clientes</span></div>
              <div className="box"><b>{dev}</b><span>Desenvolvimento</span></div>
            </div>

            <div className="card">
              <h2>Histórico de interações</h2>
```

Fica:

```tsx
            <div className="resumo">
              <div className="box"><b>{total}</b><span>Total</span></div>
              <div className="box"><b>{abertos}</b><span>Em aberto</span></div>
              <div className="box"><b>{clientes}</b><span>Clientes</span></div>
              <div className="box"><b>{dev}</b><span>Desenvolvimento</span></div>
            </div>

            <RelatoriosCard empresas={empresas} contatos={contatosNotificacao} />

            <div className="card">
              <h2>Histórico de interações</h2>
```

- [ ] **Step 3: Adicionar classes CSS (append em `src/styles.css`)**

```css
.card-relatorios{margin-bottom:18px;}
.card-relatorios .ajuda-campo{margin-bottom:6px;}
.relatorios-botoes{display:flex;gap:10px;margin-top:16px;}
.relatorios-botoes button{margin-top:0;flex:1;}
.relatorios-botoes button:disabled{opacity:.6;cursor:default;}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Verificação manual (fluxo completo)**

```bash
npm run dev
```

Depois, no navegador (logado):
1. O card **Relatórios** aparece na coluna direita, entre o resumo e o histórico, com visual consistente.
2. **Gerar PDF** com um período que tenha chamados → o arquivo baixa; abrir e conferir cabeçalho (logo + título + data), linha de filtros, resumo (bater contagens com o painel) e a tabela.
3. **Gerar TXT** do mesmo período → abrir e conferir blocos, acentuação (UTF-8) e campos.
4. Combinar filtros (ex.: Empresa + Status "Resolvido") e conferir que PDF/TXT respeitam.
5. Período invertido (inicial > final) → aparece a mensagem de validação e não gera.
6. Período/filtro sem resultados → relatório "vazio" coerente (PDF com "Nenhum chamado..."; TXT idem).

- [ ] **Step 6: Commit**

```bash
git add src/relatorios/RelatoriosCard.tsx src/pages/Dashboard.tsx src/styles.css
git commit -m "feat(relatorios): card de filtros e integração no Dashboard"
```

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura da spec:**
- Filtros (período/tipo/empresa/status/prioridade/responsável) → Task 1 (`FiltrosRelatorio`, `buscarChamados`) + Task 5 (UI). ✅
- Período por `criado_em` → Task 1 (`.gte/.lte` em `criado_em`). ✅
- Responsável = destinatário → Task 1 (`.eq('destinatario_contato_id')`) e exibição. ✅
- Resposta quando houver → Task 3 (TXT) e Task 4 (PDF), guardas `respondido_por && respondido_em`. ✅
- PDF gerencial sem gráfico (cabeçalho/logo, filtros, resumo textual, tabela, rodapé) → Task 4. ✅
- TXT técnico detalhado (bloco por chamado) → Task 3. ✅
- Nome dos arquivos → Task 1 (`nomeArquivo`). ✅
- Card fixo na coluna direita → Task 5. ✅
- Código isolado em `src/relatorios/`, Dashboard só ganha 1 linha (+import) → Tasks 1–5. ✅
- pdfmake via import dinâmico → Task 4 (`gerarPdf`). ✅
- Casos de borda (sem resultados, erro de query, período inválido, falha do pdfmake) → Tasks 3/4/5. ✅
- Verificação manual, sem test runner → refletido em todas as tasks. ✅
- Métrica de tempo de resolução fora de escopo (resolvido_em não preenchido) → não incluída, conforme spec. ✅

**Placeholders:** nenhum "TODO/TBD"; todo passo tem código real.

**Consistência de tipos:** `FiltrosRelatorio`, `ResumoRelatorio`, assinaturas de `buscarChamados/rotuloFiltros/nomeArquivo/formatarData/formatarDataHora/montarTxt/gerarTxt/calcularResumo/montarDocDefinition/gerarPdf` batem entre as tasks que as produzem e consomem.
