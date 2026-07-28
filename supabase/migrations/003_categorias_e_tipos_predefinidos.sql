-- Classificação hierárquica das ocorrências: categoria -> tipo.
-- Execute uma única vez no SQL Editor do Supabase. O script é idempotente.

begin;

create table if not exists public.categorias_ocorrencia (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.tipos_ocorrencia
  add column if not exists categoria_id uuid references public.categorias_ocorrencia(id);

alter table public.suporte_interacoes
  add column if not exists tipo_ocorrencia_outro text;

with dados(slug,nome,ordem) as (
  values
  ('registro-ponto','Registro de ponto',1),
  ('escala-jornada','Escala e jornada',2),
  ('acesso-usuarios','Acesso e usuários',3),
  ('cadastro','Cadastro',4),
  ('localizacao-cerca','Localização e cerca',5),
  ('aplicativo-dispositivo','Aplicativo e dispositivo',6),
  ('plataforma-web','Plataforma web',7),
  ('relatorios-documentos','Relatórios e documentos',8),
  ('notificacoes-comunicacao','Notificações e comunicação',9),
  ('integracoes-sincronizacao','Integrações e sincronização',10),
  ('duvidas-solicitacoes','Dúvidas e solicitações',11),
  ('seguranca-auditoria','Segurança e auditoria',12)
)
insert into public.categorias_ocorrencia (slug,nome,ordem,ativo)
select d.slug,d.nome,d.ordem,true
from dados d
where not exists (
  select 1 from public.categorias_ocorrencia c where c.slug=d.slug
);

with dados(slug,nome,ordem) as (
  values
  ('registro-ponto','Registro de ponto',1),
  ('escala-jornada','Escala e jornada',2),
  ('acesso-usuarios','Acesso e usuários',3),
  ('cadastro','Cadastro',4),
  ('localizacao-cerca','Localização e cerca',5),
  ('aplicativo-dispositivo','Aplicativo e dispositivo',6),
  ('plataforma-web','Plataforma web',7),
  ('relatorios-documentos','Relatórios e documentos',8),
  ('notificacoes-comunicacao','Notificações e comunicação',9),
  ('integracoes-sincronizacao','Integrações e sincronização',10),
  ('duvidas-solicitacoes','Dúvidas e solicitações',11),
  ('seguranca-auditoria','Segurança e auditoria',12)
)
update public.categorias_ocorrencia c
set nome=d.nome, ordem=d.ordem, ativo=true, atualizado_em=now()
from dados d
where c.slug=d.slug;

with dados(categoria_slug,nome,nome_normalizado) as (
  values
  ('registro-ponto','Ausência de registro','ausencia de registro'),
  ('registro-ponto','Registro em duplicidade','registro em duplicidade'),
  ('registro-ponto','Registro incorreto','registro incorreto'),
  ('registro-ponto','Registro fora do horário','registro fora do horario'),
  ('registro-ponto','Registro fora da cerca','registro fora da cerca'),
  ('registro-ponto','Registro em local incorreto','registro em local incorreto'),
  ('registro-ponto','Registro não sincronizado','registro nao sincronizado'),
  ('registro-ponto','Jornada aberta','jornada aberta'),
  ('registro-ponto','Jornada encerrada incorretamente','jornada encerrada incorretamente'),
  ('registro-ponto','Intervalo não registrado','intervalo nao registrado'),
  ('registro-ponto','Registro realizado por engano','registro realizado por engano'),
  ('registro-ponto','Outro problema de registro','outro problema de registro'),
  ('escala-jornada','Colaborador sem escala','colaborador sem escala'),
  ('escala-jornada','Escala incorreta','escala incorreta'),
  ('escala-jornada','Horário incorreto','horario incorreto'),
  ('escala-jornada','Posto incorreto','posto incorreto'),
  ('escala-jornada','Turno incorreto','turno incorreto'),
  ('escala-jornada','Folga incorreta','folga incorreta'),
  ('escala-jornada','Troca de escala não atualizada','troca de escala nao atualizada'),
  ('escala-jornada','Divergência de jornada','divergencia de jornada'),
  ('escala-jornada','Excesso de jornada','excesso de jornada'),
  ('escala-jornada','Intervalo irregular','intervalo irregular'),
  ('escala-jornada','Banco de horas divergente','banco de horas divergente'),
  ('escala-jornada','Adicional noturno divergente','adicional noturno divergente'),
  ('escala-jornada','Hora extra divergente','hora extra divergente'),
  ('escala-jornada','Outro problema de escala ou jornada','outro problema de escala ou jornada'),
  ('acesso-usuarios','Falha de acesso ao sistema','falha de acesso ao sistema'),
  ('acesso-usuarios','Senha inválida','senha invalida'),
  ('acesso-usuarios','Usuário bloqueado','usuario bloqueado'),
  ('acesso-usuarios','Usuário não localizado','usuario nao localizado'),
  ('acesso-usuarios','Usuário duplicado','usuario duplicado'),
  ('acesso-usuarios','Perfil de acesso incorreto','perfil de acesso incorreto'),
  ('acesso-usuarios','Permissão insuficiente','permissao insuficiente'),
  ('acesso-usuarios','Acesso indevido','acesso indevido'),
  ('acesso-usuarios','Usuário vinculado à empresa incorreta','usuario vinculado a empresa incorreta'),
  ('acesso-usuarios','Usuário vinculado ao posto incorreto','usuario vinculado ao posto incorreto'),
  ('acesso-usuarios','Outro problema de acesso','outro problema de acesso'),
  ('cadastro','Colaborador não cadastrado','colaborador nao cadastrado'),
  ('cadastro','Cadastro incompleto','cadastro incompleto'),
  ('cadastro','Cadastro incorreto','cadastro incorreto'),
  ('cadastro','Dados pessoais incorretos','dados pessoais incorretos'),
  ('cadastro','Empresa incorreta','empresa incorreta'),
  ('cadastro','Posto incorreto no cadastro','posto incorreto no cadastro'),
  ('cadastro','Função incorreta','funcao incorreta'),
  ('cadastro','Supervisor incorreto','supervisor incorreto'),
  ('cadastro','Vínculo não localizado','vinculo nao localizado'),
  ('cadastro','Vínculo duplicado','vinculo duplicado'),
  ('cadastro','Cadastro inativo indevidamente','cadastro inativo indevidamente'),
  ('cadastro','Outro problema de cadastro','outro problema de cadastro'),
  ('localizacao-cerca','Localização não identificada','localizacao nao identificada'),
  ('localizacao-cerca','GPS indisponível','gps indisponivel'),
  ('localizacao-cerca','Localização incorreta','localizacao incorreta'),
  ('localizacao-cerca','Cerca geográfica incorreta','cerca geografica incorreta'),
  ('localizacao-cerca','Posto sem cerca cadastrada','posto sem cerca cadastrada'),
  ('localizacao-cerca','Distância da cerca divergente','distancia da cerca divergente'),
  ('localizacao-cerca','Permissão de localização desativada','permissao de localizacao desativada'),
  ('localizacao-cerca','Outro problema de localização','outro problema de localizacao'),
  ('aplicativo-dispositivo','Aplicativo não abre','aplicativo nao abre'),
  ('aplicativo-dispositivo','Aplicativo fecha sozinho','aplicativo fecha sozinho'),
  ('aplicativo-dispositivo','Aplicativo travando','aplicativo travando'),
  ('aplicativo-dispositivo','Tela do aplicativo não carrega','tela do aplicativo nao carrega'),
  ('aplicativo-dispositivo','Lentidão no aplicativo','lentidao no aplicativo'),
  ('aplicativo-dispositivo','Aplicativo desatualizado','aplicativo desatualizado'),
  ('aplicativo-dispositivo','Falha de instalação','falha de instalacao'),
  ('aplicativo-dispositivo','Falha de atualização','falha de atualizacao'),
  ('aplicativo-dispositivo','Câmera indisponível','camera indisponivel'),
  ('aplicativo-dispositivo','Selfie não registrada','selfie nao registrada'),
  ('aplicativo-dispositivo','Dispositivo incompatível','dispositivo incompativel'),
  ('aplicativo-dispositivo','Falha de conexão','falha de conexao'),
  ('aplicativo-dispositivo','Outro problema no aplicativo','outro problema no aplicativo'),
  ('plataforma-web','Página não abre','pagina nao abre'),
  ('plataforma-web','Tela da plataforma não carrega','tela da plataforma nao carrega'),
  ('plataforma-web','Lentidão no sistema','lentidao no sistema'),
  ('plataforma-web','Sistema indisponível','sistema indisponivel'),
  ('plataforma-web','Informação não exibida','informacao nao exibida'),
  ('plataforma-web','Filtro não funciona','filtro nao funciona'),
  ('plataforma-web','Pesquisa não funciona','pesquisa nao funciona'),
  ('plataforma-web','Botão não funciona','botao nao funciona'),
  ('plataforma-web','Erro ao salvar','erro ao salvar'),
  ('plataforma-web','Erro ao editar','erro ao editar'),
  ('plataforma-web','Erro ao excluir','erro ao excluir'),
  ('plataforma-web','Outro problema na plataforma','outro problema na plataforma'),
  ('relatorios-documentos','Relatório incorreto','relatorio incorreto'),
  ('relatorios-documentos','Relatório incompleto','relatorio incompleto'),
  ('relatorios-documentos','Relatório não gerado','relatorio nao gerado'),
  ('relatorios-documentos','Dados divergentes no relatório','dados divergentes no relatorio'),
  ('relatorios-documentos','Período incorreto','periodo incorreto'),
  ('relatorios-documentos','Colaborador ausente no relatório','colaborador ausente no relatorio'),
  ('relatorios-documentos','Documento não disponível','documento nao disponivel'),
  ('relatorios-documentos','Falha ao baixar documento','falha ao baixar documento'),
  ('relatorios-documentos','Falha ao imprimir','falha ao imprimir'),
  ('relatorios-documentos','Outro problema em relatório ou documento','outro problema em relatorio ou documento'),
  ('notificacoes-comunicacao','Notificação não recebida','notificacao nao recebida'),
  ('notificacoes-comunicacao','Notificação enviada incorretamente','notificacao enviada incorretamente'),
  ('notificacoes-comunicacao','E-mail não recebido','e-mail nao recebido'),
  ('notificacoes-comunicacao','Mensagem duplicada','mensagem duplicada'),
  ('notificacoes-comunicacao','Destinatário incorreto','destinatario incorreto'),
  ('notificacoes-comunicacao','Alerta não gerado','alerta nao gerado'),
  ('notificacoes-comunicacao','Alerta gerado indevidamente','alerta gerado indevidamente'),
  ('notificacoes-comunicacao','Outro problema de comunicação','outro problema de comunicacao'),
  ('integracoes-sincronizacao','Falha de sincronização','falha de sincronizacao'),
  ('integracoes-sincronizacao','Dados não enviados','dados nao enviados'),
  ('integracoes-sincronizacao','Dados não recebidos','dados nao recebidos'),
  ('integracoes-sincronizacao','Integração indisponível','integracao indisponivel'),
  ('integracoes-sincronizacao','Dados duplicados','dados duplicados'),
  ('integracoes-sincronizacao','Dados desatualizados','dados desatualizados'),
  ('integracoes-sincronizacao','Divergência entre sistemas','divergencia entre sistemas'),
  ('integracoes-sincronizacao','Importação com erro','importacao com erro'),
  ('integracoes-sincronizacao','Exportação com erro','exportacao com erro'),
  ('integracoes-sincronizacao','Outro problema de integração','outro problema de integracao'),
  ('duvidas-solicitacoes','Dúvida de utilização','duvida de utilizacao'),
  ('duvidas-solicitacoes','Solicitação de orientação','solicitacao de orientacao'),
  ('duvidas-solicitacoes','Solicitação de treinamento','solicitacao de treinamento'),
  ('duvidas-solicitacoes','Solicitação de ajuste','solicitacao de ajuste'),
  ('duvidas-solicitacoes','Solicitação de melhoria','solicitacao de melhoria'),
  ('duvidas-solicitacoes','Solicitação de novo relatório','solicitacao de novo relatorio'),
  ('duvidas-solicitacoes','Solicitação de nova funcionalidade','solicitacao de nova funcionalidade'),
  ('duvidas-solicitacoes','Solicitação de alteração de regra','solicitacao de alteracao de regra'),
  ('duvidas-solicitacoes','Outro tipo de solicitação','outro tipo de solicitacao'),
  ('seguranca-auditoria','Acesso não autorizado','acesso nao autorizado'),
  ('seguranca-auditoria','Alteração não reconhecida','alteracao nao reconhecida'),
  ('seguranca-auditoria','Registro suspeito','registro suspeito'),
  ('seguranca-auditoria','Falha de auditoria','falha de auditoria'),
  ('seguranca-auditoria','Histórico incompleto','historico incompleto'),
  ('seguranca-auditoria','Informação sensível exposta','informacao sensivel exposta'),
  ('seguranca-auditoria','Tentativa de acesso indevido','tentativa de acesso indevido'),
  ('seguranca-auditoria','Outro problema de segurança','outro problema de seguranca')
)
update public.tipos_ocorrencia t
set categoria_id=c.id, nome=d.nome, status='aprovado', atualizado_em=now()
from dados d
join public.categorias_ocorrencia c on c.slug=d.categoria_slug
where t.nome_normalizado=d.nome_normalizado
  and t.status <> 'mesclado';

with dados(categoria_slug,nome,nome_normalizado) as (
  values
  ('registro-ponto','Ausência de registro','ausencia de registro'),
  ('registro-ponto','Registro em duplicidade','registro em duplicidade'),
  ('registro-ponto','Registro incorreto','registro incorreto'),
  ('registro-ponto','Registro fora do horário','registro fora do horario'),
  ('registro-ponto','Registro fora da cerca','registro fora da cerca'),
  ('registro-ponto','Registro em local incorreto','registro em local incorreto'),
  ('registro-ponto','Registro não sincronizado','registro nao sincronizado'),
  ('registro-ponto','Jornada aberta','jornada aberta'),
  ('registro-ponto','Jornada encerrada incorretamente','jornada encerrada incorretamente'),
  ('registro-ponto','Intervalo não registrado','intervalo nao registrado'),
  ('registro-ponto','Registro realizado por engano','registro realizado por engano'),
  ('registro-ponto','Outro problema de registro','outro problema de registro'),
  ('escala-jornada','Colaborador sem escala','colaborador sem escala'),
  ('escala-jornada','Escala incorreta','escala incorreta'),
  ('escala-jornada','Horário incorreto','horario incorreto'),
  ('escala-jornada','Posto incorreto','posto incorreto'),
  ('escala-jornada','Turno incorreto','turno incorreto'),
  ('escala-jornada','Folga incorreta','folga incorreta'),
  ('escala-jornada','Troca de escala não atualizada','troca de escala nao atualizada'),
  ('escala-jornada','Divergência de jornada','divergencia de jornada'),
  ('escala-jornada','Excesso de jornada','excesso de jornada'),
  ('escala-jornada','Intervalo irregular','intervalo irregular'),
  ('escala-jornada','Banco de horas divergente','banco de horas divergente'),
  ('escala-jornada','Adicional noturno divergente','adicional noturno divergente'),
  ('escala-jornada','Hora extra divergente','hora extra divergente'),
  ('escala-jornada','Outro problema de escala ou jornada','outro problema de escala ou jornada'),
  ('acesso-usuarios','Falha de acesso ao sistema','falha de acesso ao sistema'),
  ('acesso-usuarios','Senha inválida','senha invalida'),
  ('acesso-usuarios','Usuário bloqueado','usuario bloqueado'),
  ('acesso-usuarios','Usuário não localizado','usuario nao localizado'),
  ('acesso-usuarios','Usuário duplicado','usuario duplicado'),
  ('acesso-usuarios','Perfil de acesso incorreto','perfil de acesso incorreto'),
  ('acesso-usuarios','Permissão insuficiente','permissao insuficiente'),
  ('acesso-usuarios','Acesso indevido','acesso indevido'),
  ('acesso-usuarios','Usuário vinculado à empresa incorreta','usuario vinculado a empresa incorreta'),
  ('acesso-usuarios','Usuário vinculado ao posto incorreto','usuario vinculado ao posto incorreto'),
  ('acesso-usuarios','Outro problema de acesso','outro problema de acesso'),
  ('cadastro','Colaborador não cadastrado','colaborador nao cadastrado'),
  ('cadastro','Cadastro incompleto','cadastro incompleto'),
  ('cadastro','Cadastro incorreto','cadastro incorreto'),
  ('cadastro','Dados pessoais incorretos','dados pessoais incorretos'),
  ('cadastro','Empresa incorreta','empresa incorreta'),
  ('cadastro','Posto incorreto no cadastro','posto incorreto no cadastro'),
  ('cadastro','Função incorreta','funcao incorreta'),
  ('cadastro','Supervisor incorreto','supervisor incorreto'),
  ('cadastro','Vínculo não localizado','vinculo nao localizado'),
  ('cadastro','Vínculo duplicado','vinculo duplicado'),
  ('cadastro','Cadastro inativo indevidamente','cadastro inativo indevidamente'),
  ('cadastro','Outro problema de cadastro','outro problema de cadastro'),
  ('localizacao-cerca','Localização não identificada','localizacao nao identificada'),
  ('localizacao-cerca','GPS indisponível','gps indisponivel'),
  ('localizacao-cerca','Localização incorreta','localizacao incorreta'),
  ('localizacao-cerca','Cerca geográfica incorreta','cerca geografica incorreta'),
  ('localizacao-cerca','Posto sem cerca cadastrada','posto sem cerca cadastrada'),
  ('localizacao-cerca','Distância da cerca divergente','distancia da cerca divergente'),
  ('localizacao-cerca','Permissão de localização desativada','permissao de localizacao desativada'),
  ('localizacao-cerca','Outro problema de localização','outro problema de localizacao'),
  ('aplicativo-dispositivo','Aplicativo não abre','aplicativo nao abre'),
  ('aplicativo-dispositivo','Aplicativo fecha sozinho','aplicativo fecha sozinho'),
  ('aplicativo-dispositivo','Aplicativo travando','aplicativo travando'),
  ('aplicativo-dispositivo','Tela do aplicativo não carrega','tela do aplicativo nao carrega'),
  ('aplicativo-dispositivo','Lentidão no aplicativo','lentidao no aplicativo'),
  ('aplicativo-dispositivo','Aplicativo desatualizado','aplicativo desatualizado'),
  ('aplicativo-dispositivo','Falha de instalação','falha de instalacao'),
  ('aplicativo-dispositivo','Falha de atualização','falha de atualizacao'),
  ('aplicativo-dispositivo','Câmera indisponível','camera indisponivel'),
  ('aplicativo-dispositivo','Selfie não registrada','selfie nao registrada'),
  ('aplicativo-dispositivo','Dispositivo incompatível','dispositivo incompativel'),
  ('aplicativo-dispositivo','Falha de conexão','falha de conexao'),
  ('aplicativo-dispositivo','Outro problema no aplicativo','outro problema no aplicativo'),
  ('plataforma-web','Página não abre','pagina nao abre'),
  ('plataforma-web','Tela da plataforma não carrega','tela da plataforma nao carrega'),
  ('plataforma-web','Lentidão no sistema','lentidao no sistema'),
  ('plataforma-web','Sistema indisponível','sistema indisponivel'),
  ('plataforma-web','Informação não exibida','informacao nao exibida'),
  ('plataforma-web','Filtro não funciona','filtro nao funciona'),
  ('plataforma-web','Pesquisa não funciona','pesquisa nao funciona'),
  ('plataforma-web','Botão não funciona','botao nao funciona'),
  ('plataforma-web','Erro ao salvar','erro ao salvar'),
  ('plataforma-web','Erro ao editar','erro ao editar'),
  ('plataforma-web','Erro ao excluir','erro ao excluir'),
  ('plataforma-web','Outro problema na plataforma','outro problema na plataforma'),
  ('relatorios-documentos','Relatório incorreto','relatorio incorreto'),
  ('relatorios-documentos','Relatório incompleto','relatorio incompleto'),
  ('relatorios-documentos','Relatório não gerado','relatorio nao gerado'),
  ('relatorios-documentos','Dados divergentes no relatório','dados divergentes no relatorio'),
  ('relatorios-documentos','Período incorreto','periodo incorreto'),
  ('relatorios-documentos','Colaborador ausente no relatório','colaborador ausente no relatorio'),
  ('relatorios-documentos','Documento não disponível','documento nao disponivel'),
  ('relatorios-documentos','Falha ao baixar documento','falha ao baixar documento'),
  ('relatorios-documentos','Falha ao imprimir','falha ao imprimir'),
  ('relatorios-documentos','Outro problema em relatório ou documento','outro problema em relatorio ou documento'),
  ('notificacoes-comunicacao','Notificação não recebida','notificacao nao recebida'),
  ('notificacoes-comunicacao','Notificação enviada incorretamente','notificacao enviada incorretamente'),
  ('notificacoes-comunicacao','E-mail não recebido','e-mail nao recebido'),
  ('notificacoes-comunicacao','Mensagem duplicada','mensagem duplicada'),
  ('notificacoes-comunicacao','Destinatário incorreto','destinatario incorreto'),
  ('notificacoes-comunicacao','Alerta não gerado','alerta nao gerado'),
  ('notificacoes-comunicacao','Alerta gerado indevidamente','alerta gerado indevidamente'),
  ('notificacoes-comunicacao','Outro problema de comunicação','outro problema de comunicacao'),
  ('integracoes-sincronizacao','Falha de sincronização','falha de sincronizacao'),
  ('integracoes-sincronizacao','Dados não enviados','dados nao enviados'),
  ('integracoes-sincronizacao','Dados não recebidos','dados nao recebidos'),
  ('integracoes-sincronizacao','Integração indisponível','integracao indisponivel'),
  ('integracoes-sincronizacao','Dados duplicados','dados duplicados'),
  ('integracoes-sincronizacao','Dados desatualizados','dados desatualizados'),
  ('integracoes-sincronizacao','Divergência entre sistemas','divergencia entre sistemas'),
  ('integracoes-sincronizacao','Importação com erro','importacao com erro'),
  ('integracoes-sincronizacao','Exportação com erro','exportacao com erro'),
  ('integracoes-sincronizacao','Outro problema de integração','outro problema de integracao'),
  ('duvidas-solicitacoes','Dúvida de utilização','duvida de utilizacao'),
  ('duvidas-solicitacoes','Solicitação de orientação','solicitacao de orientacao'),
  ('duvidas-solicitacoes','Solicitação de treinamento','solicitacao de treinamento'),
  ('duvidas-solicitacoes','Solicitação de ajuste','solicitacao de ajuste'),
  ('duvidas-solicitacoes','Solicitação de melhoria','solicitacao de melhoria'),
  ('duvidas-solicitacoes','Solicitação de novo relatório','solicitacao de novo relatorio'),
  ('duvidas-solicitacoes','Solicitação de nova funcionalidade','solicitacao de nova funcionalidade'),
  ('duvidas-solicitacoes','Solicitação de alteração de regra','solicitacao de alteracao de regra'),
  ('duvidas-solicitacoes','Outro tipo de solicitação','outro tipo de solicitacao'),
  ('seguranca-auditoria','Acesso não autorizado','acesso nao autorizado'),
  ('seguranca-auditoria','Alteração não reconhecida','alteracao nao reconhecida'),
  ('seguranca-auditoria','Registro suspeito','registro suspeito'),
  ('seguranca-auditoria','Falha de auditoria','falha de auditoria'),
  ('seguranca-auditoria','Histórico incompleto','historico incompleto'),
  ('seguranca-auditoria','Informação sensível exposta','informacao sensivel exposta'),
  ('seguranca-auditoria','Tentativa de acesso indevido','tentativa de acesso indevido'),
  ('seguranca-auditoria','Outro problema de segurança','outro problema de seguranca')
)
insert into public.tipos_ocorrencia (nome,nome_normalizado,status,categoria_id)
select d.nome,d.nome_normalizado,'aprovado',c.id
from dados d
join public.categorias_ocorrencia c on c.slug=d.categoria_slug
where not exists (
  select 1
  from public.tipos_ocorrencia t
  where t.nome_normalizado=d.nome_normalizado
    and t.status <> 'mesclado'
);

create index if not exists tipos_ocorrencia_categoria_idx
  on public.tipos_ocorrencia(categoria_id);

alter table public.categorias_ocorrencia enable row level security;

drop policy if exists "Usuarios autenticados podem visualizar categorias" on public.categorias_ocorrencia;
create policy "Usuarios autenticados podem visualizar categorias"
on public.categorias_ocorrencia for select to authenticated using (true);

drop policy if exists "Usuarios autenticados podem administrar categorias" on public.categorias_ocorrencia;
create policy "Usuarios autenticados podem administrar categorias"
on public.categorias_ocorrencia for all to authenticated using (true) with check (true);

commit;
