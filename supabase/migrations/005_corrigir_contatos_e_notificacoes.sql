begin;

create extension if not exists pgcrypto;

-- A tabela existente de contatos foi criada sem identificador técnico.
alter table public.contatos_notificacao
  add column if not exists id uuid default gen_random_uuid();

update public.contatos_notificacao
set id = gen_random_uuid()
where id is null;

alter table public.contatos_notificacao
  alter column id set default gen_random_uuid(),
  alter column id set not null;

create unique index if not exists contatos_notificacao_id_uidx
  on public.contatos_notificacao(id);

-- Garante as configurações utilizadas pelo painel e pela automação.
alter table public.contatos_notificacao
  add column if not exists ativo boolean not null default true,
  add column if not exists recebe_solicitacoes boolean not null default true,
  add column if not exists recebe_respostas boolean not null default true,
  add column if not exists recebe_copia_todas boolean not null default false;

update public.contatos_notificacao
set recebe_copia_todas = true
where lower(email) = 'maia@grupojuliani.com.br';

-- Campos de encaminhamento e resposta da ocorrência.
alter table public.suporte_interacoes
  add column if not exists solicitante_contato_id uuid,
  add column if not exists destinatario_contato_id uuid,
  add column if not exists resposta text,
  add column if not exists respondido_por_contato_id uuid,
  add column if not exists respondido_em timestamptz;

-- Cria as chaves estrangeiras somente quando ainda não existirem.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_interacoes_solicitante_contato_id_fkey'
      and conrelid = 'public.suporte_interacoes'::regclass
  ) then
    alter table public.suporte_interacoes
      add constraint suporte_interacoes_solicitante_contato_id_fkey
      foreign key (solicitante_contato_id)
      references public.contatos_notificacao(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_interacoes_destinatario_contato_id_fkey'
      and conrelid = 'public.suporte_interacoes'::regclass
  ) then
    alter table public.suporte_interacoes
      add constraint suporte_interacoes_destinatario_contato_id_fkey
      foreign key (destinatario_contato_id)
      references public.contatos_notificacao(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_interacoes_respondido_por_contato_id_fkey'
      and conrelid = 'public.suporte_interacoes'::regclass
  ) then
    alter table public.suporte_interacoes
      add constraint suporte_interacoes_respondido_por_contato_id_fkey
      foreign key (respondido_por_contato_id)
      references public.contatos_notificacao(id);
  end if;
end
$$;

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

-- Permissões do painel autenticado.
grant usage on schema public to authenticated;
grant select on table public.contatos_notificacao to authenticated;

alter table public.contatos_notificacao enable row level security;
drop policy if exists "contatos_notificacao_select_authenticated" on public.contatos_notificacao;
create policy "contatos_notificacao_select_authenticated"
  on public.contatos_notificacao
  for select
  to authenticated
  using (ativo = true);

alter table public.notificacoes_ocorrencia enable row level security;
drop policy if exists "notificacoes_ocorrencia_select_authenticated" on public.notificacoes_ocorrencia;
create policy "notificacoes_ocorrencia_select_authenticated"
  on public.notificacoes_ocorrencia
  for select
  to authenticated
  using (true);

commit;

notify pgrst, 'reload schema';
