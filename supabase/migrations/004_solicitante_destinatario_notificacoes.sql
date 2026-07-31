begin;

alter table public.suporte_interacoes
  add column if not exists solicitante_contato_id uuid references public.contatos_notificacao(id),
  add column if not exists destinatario_contato_id uuid references public.contatos_notificacao(id),
  add column if not exists resposta text,
  add column if not exists respondido_por_contato_id uuid references public.contatos_notificacao(id),
  add column if not exists respondido_em timestamptz;

create index if not exists suporte_interacoes_solicitante_contato_id_idx
  on public.suporte_interacoes(solicitante_contato_id);

create index if not exists suporte_interacoes_destinatario_contato_id_idx
  on public.suporte_interacoes(destinatario_contato_id);

create index if not exists suporte_interacoes_respondido_por_contato_id_idx
  on public.suporte_interacoes(respondido_por_contato_id);

create table if not exists public.notificacoes_ocorrencia (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.suporte_interacoes(id) on delete cascade,
  tipo_notificacao text not null check (tipo_notificacao in ('abertura','atualizacao','resposta','encerramento')),
  destinatarios text[] not null default '{}',
  copia text[] not null default '{}',
  assunto text,
  mensagem text,
  status_envio text not null default 'pendente' check (status_envio in ('pendente','enviado','falha')),
  tentativas integer not null default 0,
  erro text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists notificacoes_ocorrencia_ocorrencia_id_idx
  on public.notificacoes_ocorrencia(ocorrencia_id);

alter table public.notificacoes_ocorrencia enable row level security;

-- A automação usa service_role. Usuários autenticados podem apenas consultar o histórico.
drop policy if exists "notificacoes_ocorrencia_select_authenticated" on public.notificacoes_ocorrencia;
create policy "notificacoes_ocorrencia_select_authenticated"
  on public.notificacoes_ocorrencia
  for select
  to authenticated
  using (true);

comment on column public.suporte_interacoes.solicitante_contato_id is 'Contato que originou a solicitação.';
comment on column public.suporte_interacoes.destinatario_contato_id is 'Contato responsável por receber a solicitação.';
comment on table public.notificacoes_ocorrencia is 'Auditoria dos e-mails automáticos gerados para cada ocorrência.';

commit;
