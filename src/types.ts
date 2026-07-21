export type Tipo = 'cliente' | 'desenvolvimento'
export type Prioridade = 'baixa' | 'media' | 'alta'
export type Status = 'aberto' | 'andamento' | 'aguardando' | 'resolvido'

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
}
