export type Tipo = 'cliente' | 'desenvolvimento'
export type Prioridade = 'baixa' | 'media' | 'alta'
export type Status = 'aberto' | 'andamento' | 'aguardando' | 'resolvido'

export interface Empresa {
  id: string
  nome: string
  nome_normalizado: string
  ativo: boolean
}

export interface CategoriaOcorrencia {
  id: string
  nome: string
  slug: string
  ativo: boolean
  ordem: number
}

export interface TipoOcorrencia {
  id: string
  nome: string
  nome_normalizado: string
  status: 'aprovado' | 'pendente' | 'mesclado' | 'inativo'
  categoria_id: string | null
}

export interface Interacao {
  id: string
  numero: number
  tipo: Tipo
  contato: string
  canal: string
  assunto: string
  descricao: string | null
  prioridade: Prioridade
  status: Status
  proxima_acao: string | null
  anexo_path: string | null
  criado_em: string
  empresa_id: string | null
  tipo_ocorrencia_id: string | null
  modulo: string | null
  impacto: string | null
  causa: string | null
  solucao_aplicada: string | null
  reincidente: boolean
  encaminhado_desenvolvimento: boolean
  empresas?: { nome: string } | null
  tipos_ocorrencia?: { nome: string; categorias_ocorrencia?: { nome: string } | null } | null
  tipo_ocorrencia_outro: string | null
}
