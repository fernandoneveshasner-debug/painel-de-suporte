-- Estrutura aplicada no Supabase para classificar ocorrências e gerar métricas.
-- Mantida no repositório para rastreabilidade. O script é idempotente.

begin;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_normalizado text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists empresas_nome_normalizado_unique
on public.empresas (nome_normalizado);

create table if not exists public.tipos_ocorrencia (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_normalizado text not null,
  descricao text,
  status text not null default 'pendente'
    check (status in ('aprovado','pendente','mesclado','inativo')),
  criado_por uuid references auth.users(id),
  tipo_principal_id uuid references public.tipos_ocorrencia(id),
  quantidade_utilizacoes bigint not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists tipos_ocorrencia_nome_normalizado_unique
on public.tipos_ocorrencia (nome_normalizado)
where status <> 'mesclado';

alter table public.suporte_interacoes
  add column if not exists empresa_id uuid references public.empresas(id),
  add column if not exists tipo_ocorrencia_id uuid references public.tipos_ocorrencia(id),
  add column if not exists modulo text,
  add column if not exists impacto text check (impacto is null or impacto in ('baixo','medio','alto','critico')),
  add column if not exists causa text,
  add column if not exists solucao_aplicada text,
  add column if not exists reincidente boolean not null default false,
  add column if not exists encaminhado_desenvolvimento boolean not null default false,
  add column if not exists resolvido_em timestamptz,
  add column if not exists encerrado_em timestamptz;

commit;
