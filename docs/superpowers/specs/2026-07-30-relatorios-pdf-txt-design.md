# Spec A — Relatórios de Chamados (PDF e TXT) por período

- **Data:** 2026-07-30
- **Projeto:** Painel de Suporte (`suporte-neves`) — Vite + React 18 + TypeScript + Supabase
- **Status:** Aprovado no brainstorming, aguardando revisão da spec

## 1. Objetivo

Permitir gerar relatórios dos chamados (`suporte_interacoes`) filtrados por período e outros
critérios, em dois formatos com públicos distintos:

- **PDF** — para a **diretoria**: acompanhar andamento dos problemas × resoluções. Visão
  gerencial, tabular, **sem gráficos**.
- **TXT** — para o **técnico**: extração crua e detalhada, um bloco por chamado.

Fora de escopo (viram specs próprias depois): dashboard visual, gráficos, múltiplos anexos por
chamado (Spec B), carimbar `resolvido_em` ao resolver.

## 2. Escopo e decisões confirmadas

| Decisão | Valor |
|---|---|
| Base do período | `criado_em` (data de abertura) |
| "Responsável" (filtro) | **Destinatário** (`destinatario_contato_id`) — a quem o cliente enviou o chamado |
| Resposta no relatório | Quando houver `respondido_por` + `respondido_em`, mostrar quem respondeu e quando |
| Local na UI | **Card fixo** na coluna direita do Dashboard (não é modal) |
| Geração de PDF | `pdfmake`, client-side, carregado via **dynamic import** |
| Geração de TXT | String montada em JS + download via `Blob` |
| Testes | **Verificação manual** (sem adicionar test runner) |
| Backend | Nenhum — tudo no navegador. Não toca no fluxo n8n/Gmail nem no formulário atual |

## 3. Filtros do relatório

Todos opcionais; campo vazio = "todos". Reaproveitam os cadastros já carregados no Dashboard
(`empresas`, `contatosNotificacao`).

- **Período**: data início / data fim (aplicadas sobre `criado_em`)
- **Tipo**: `cliente` | `desenvolvimento`
- **Empresa**: dropdown de `empresas` (ativas)
- **Status**: `aberto` | `andamento` | `aguardando` | `resolvido`
- **Prioridade**: `baixa` | `media` | `alta`
- **Responsável (destinatário)**: dropdown de `contatos_notificacao`

Regras:
- Se início e fim vazios → todos os períodos.
- Se só um dos limites do período for informado, aplica só esse limite (`>=` ou `<=`).
- Início > fim → mensagem de validação, não gera.

## 4. Busca de dados

Query dedicada (independente da lista da tela) em `suporte_interacoes`, com o mesmo `select` de
joins usado hoje em `Dashboard.carregar()`:

```
*,
empresas(nome),
tipos_ocorrencia(nome, categorias_ocorrencia(nome)),
solicitante:contatos_notificacao!...solicitante...(nome,email),
destinatario:contatos_notificacao!...destinatario...(nome,email),
respondido_por:contatos_notificacao!...respondido_por...(nome,email)
```

Filtros aplicados no servidor: `.gte('criado_em', inicio)`, `.lte('criado_em', fimInclusivoFimDoDia)`,
`.eq('tipo', ...)`, `.eq('empresa_id', ...)`, `.eq('status', ...)`, `.eq('prioridade', ...)`,
`.eq('destinatario_contato_id', ...)` — apenas os preenchidos. Ordenação por `criado_em` desc.

Observação: o fim do período deve cobrir o dia inteiro (até 23:59:59), então a data-fim vira
`fim + 1 dia` com `<` ou o timestamp final do dia.

## 5. Conteúdo do PDF (diretoria)

Montado com pdfmake (`docDefinition`):

1. **Cabeçalho**: logo (`/logo.png` como dataURL/base64) + título "Relatório de Chamados" +
   intervalo do período + data/hora de emissão.
2. **Linha de filtros aplicados**: ex. "Empresa: Juliani · Status: todos · Prioridade: todas ·
   Responsável: todos · Período: 01–30/07/2026".
3. **Resumo textual (sem gráfico)**, em blocos/tabela compacta:
   - Total de chamados no período
   - Por status (aberto / andamento / aguardando / resolvido)
   - Por tipo (cliente / desenvolvimento)
   - Por prioridade (alta / média / baixa)
   - **Em aberto × Resolvidos** (aberto+andamento+aguardando vs resolvido)
4. **Tabela de chamados** (uma linha por chamado): nº (`#0001`) · abertura · empresa · assunto ·
   tipo · prioridade · status · responsável (destinatário) · resposta (quem + data, quando houver).
5. **Rodapé**: número da página + "Painel de Suporte — Neves Tecnologia".

## 6. Conteúdo do TXT (técnico)

Texto puro (UTF-8). Cabeçalho com filtros aplicados + contagem total. Depois **um bloco por
chamado**, separados por linha divisória (`----`), cada bloco com:

- Número (`#0001`) e assunto
- Datas: criado em / atualizado em
- Empresa · categoria · tipo de ocorrência (+ "outro" quando houver)
- Módulo · impacto · prioridade · status
- Solicitante · destinatário (responsável)
- Descrição
- Próxima ação
- Causa · solução aplicada
- Resposta (quem respondeu + quando + texto), quando houver
- Reincidente (sim/não) · possui anexo (sim/não)

## 7. Nome dos arquivos

`relatorio-chamados_<inicio>_a_<fim>.pdf` e `.txt`
(ex.: `relatorio-chamados_2026-07-01_a_2026-07-30.pdf`). Sem período informado:
`relatorio-chamados_completo_<data-emissao>.pdf`.

## 8. Estrutura de código

Nova pasta isolada `src/relatorios/`, sem alterar o formulário nem a lista existentes:

- `filtros.ts` — tipo `FiltrosRelatorio`; função `buscarChamados(filtros)` que monta a query
  Supabase e retorna `Interacao[]`; helpers de formatação (rótulo de filtros, datas).
- `metricas.ts` — função pura `calcularResumo(chamados)` → contagens por status/tipo/prioridade e
  aberto×resolvido (usada pelo PDF).
- `gerarPdf.ts` — `gerarPdf(chamados, filtros)`: monta `docDefinition`, faz `import()` dinâmico do
  pdfmake e dispara o download.
- `gerarTxt.ts` — `gerarTxt(chamados, filtros)`: monta a string e dispara o download via `Blob`.
- `RelatoriosCard.tsx` — o card com os filtros e os dois botões; recebe `empresas` e
  `contatosNotificacao` por props (já carregados no Dashboard).

Alteração mínima em `Dashboard.tsx`: renderizar `<RelatoriosCard ... />` na coluna direita,
passando `empresas` e `contatosNotificacao`.

`gerarTxt`, `calcularResumo` e o builder do `docDefinition` são funções puras (entrada: lista +
filtros; saída: arquivo/estrutura), fáceis de conferir isoladamente.

## 9. Dependência nova

- `pdfmake` (+ `@types/pdfmake` em devDependencies). Carregado por `import()` dinâmico dentro de
  `gerarPdf.ts`, para não pesar o bundle inicial. Único acréscimo de dependência.

## 10. Métricas — o que dá e o que não dá hoje

- **Confiável agora**: contagens por `status`, `tipo`, `prioridade`, `empresa`, `destinatario`; e
  "em aberto × resolvidos" via `status`.
- **Não confiável agora**: "tempo médio de resolução" — a coluna `resolvido_em` existe (migration
  002) mas o app **não a preenche** ao mudar o status para `resolvido`. O PDF usa `atualizado_em`
  como "última movimentação", não como data de resolução. Cálculo de tempo de resolução fica para
  um ajuste futuro separado (carimbar `resolvido_em`).

## 11. Erros e casos de borda

- Sem chamados no filtro → gera relatório mesmo assim, com "Nenhum chamado no período" e resumo
  zerado (útil como comprovante).
- Falha na query Supabase → mensagem de erro no card, não gera arquivo.
- Início > fim → validação impede a geração.
- Falha ao carregar pdfmake (import dinâmico) → mensagem de erro; TXT continua funcionando
  independentemente.

## 12. Verificação (manual)

1. `npm run dev`, logar, abrir o card de Relatórios.
2. Gerar **PDF** com um período que tenha chamados → conferir cabeçalho, filtros, resumo (bater as
   contagens com a lista da tela) e a tabela.
3. Gerar **TXT** do mesmo período → conferir blocos, acentuação (UTF-8) e campos por chamado.
4. Testar filtros combinados (ex.: empresa + status resolvido) e período vazio.
5. Testar período sem resultados → relatório "vazio" coerente.
6. `npm run build` → sem erros de TypeScript; conferir que o pdfmake não entrou no chunk inicial.
