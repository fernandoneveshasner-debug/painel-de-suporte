-- Estrutura principal do Painel de Suporte
create extension if not exists pgcrypto;

create sequence if not exists public.suporte_interacoes_numero_seq start 1;

create table if not exists public.suporte_interacoes (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null default nextval('public.suporte_interacoes_numero_seq'),
  tipo text not null check (tipo in ('cliente', 'desenvolvimento')),
  contato text not null,
  canal text not null,
  assunto text not null,
  descricao text,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  status text not null default 'aberto' check (status in ('aberto', 'andamento', 'aguardando', 'resolvido')),
  proxima_acao text,
  anexo_path text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid not null default auth.uid() references auth.users(id)
);

create unique index if not exists suporte_interacoes_numero_uidx
  on public.suporte_interacoes(numero);

create or replace function public.atualizar_timestamp_suporte()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_atualizar_timestamp_suporte on public.suporte_interacoes;
create trigger trg_atualizar_timestamp_suporte
before update on public.suporte_interacoes
for each row execute function public.atualizar_timestamp_suporte();

alter table public.suporte_interacoes enable row level security;

drop policy if exists "usuarios autenticados leem suporte" on public.suporte_interacoes;
create policy "usuarios autenticados leem suporte"
on public.suporte_interacoes for select
to authenticated
using (true);

drop policy if exists "usuarios autenticados criam suporte" on public.suporte_interacoes;
create policy "usuarios autenticados criam suporte"
on public.suporte_interacoes for insert
to authenticated
with check (criado_por = auth.uid());

drop policy if exists "usuarios autenticados atualizam suporte" on public.suporte_interacoes;
create policy "usuarios autenticados atualizam suporte"
on public.suporte_interacoes for update
to authenticated
using (true)
with check (true);

drop policy if exists "usuarios autenticados excluem suporte" on public.suporte_interacoes;
create policy "usuarios autenticados excluem suporte"
on public.suporte_interacoes for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('anexos-suporte', 'anexos-suporte', false)
on conflict (id) do nothing;

drop policy if exists "usuarios autenticados visualizam anexos suporte" on storage.objects;
create policy "usuarios autenticados visualizam anexos suporte"
on storage.objects for select
to authenticated
using (bucket_id = 'anexos-suporte');

drop policy if exists "usuarios autenticados enviam anexos suporte" on storage.objects;
create policy "usuarios autenticados enviam anexos suporte"
on storage.objects for insert
to authenticated
with check (bucket_id = 'anexos-suporte');

drop policy if exists "usuarios autenticados removem anexos suporte" on storage.objects;
create policy "usuarios autenticados removem anexos suporte"
on storage.objects for delete
to authenticated
using (bucket_id = 'anexos-suporte');

-- Ajusta a sequência caso já existam registros numerados.
select setval(
  'public.suporte_interacoes_numero_seq',
  greatest(coalesce((select max(numero) from public.suporte_interacoes), 0), 1),
  coalesce((select max(numero) from public.suporte_interacoes), 0) > 0
);
