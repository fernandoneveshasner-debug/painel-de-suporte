begin;

alter table public.contatos_notificacao enable row level security;

drop policy if exists "contatos_notificacao_select_authenticated" on public.contatos_notificacao;
create policy "contatos_notificacao_select_authenticated"
  on public.contatos_notificacao
  for select
  to authenticated
  using (ativo = true);

commit;
