-- Inclui Willian Bastos como gerente geral e destinatário de cópia global.
-- A migration é idempotente e consolida eventuais cadastros duplicados pelo e-mail.

begin;

do $$
declare
  v_email constant text := 'willianbastos@grupojuliani.com.br';
  v_contato_id uuid;
begin
  select id
    into v_contato_id
  from public.contatos_notificacao
  where lower(trim(email)) = v_email
  order by id::text
  limit 1;

  if v_contato_id is null then
    insert into public.contatos_notificacao (
      nome,
      papel,
      email,
      ativo,
      recebe_solicitacoes,
      recebe_respostas,
      recebe_copia_todas
    )
    values (
      'Willian Bastos',
      'gerente_geral',
      v_email,
      true,
      true,
      true,
      true
    )
    returning id into v_contato_id;
  else
    -- Preserva as relações existentes antes de remover duplicatas do mesmo e-mail.
    update public.suporte_interacoes
    set solicitante_contato_id = v_contato_id
    where solicitante_contato_id in (
      select id
      from public.contatos_notificacao
      where lower(trim(email)) = v_email
        and id <> v_contato_id
    );

    update public.suporte_interacoes
    set destinatario_contato_id = v_contato_id
    where destinatario_contato_id in (
      select id
      from public.contatos_notificacao
      where lower(trim(email)) = v_email
        and id <> v_contato_id
    );

    update public.suporte_interacoes
    set respondido_por_contato_id = v_contato_id
    where respondido_por_contato_id in (
      select id
      from public.contatos_notificacao
      where lower(trim(email)) = v_email
        and id <> v_contato_id
    );

    delete from public.contatos_notificacao
    where lower(trim(email)) = v_email
      and id <> v_contato_id;
  end if;

  update public.contatos_notificacao
  set
    nome = 'Willian Bastos',
    papel = 'gerente_geral',
    email = v_email,
    ativo = true,
    recebe_solicitacoes = true,
    recebe_respostas = true,
    recebe_copia_todas = true
  where id = v_contato_id;
end
$$;

commit;

notify pgrst, 'reload schema';
