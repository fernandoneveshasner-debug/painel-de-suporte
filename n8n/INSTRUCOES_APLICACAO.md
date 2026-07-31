# Inclusão de Willian Bastos e cópia global

## 1. Aplicar a migration

1. Abra o projeto do Painel de Suporte no Supabase.
2. Acesse **SQL Editor**.
3. Abra `supabase/migrations/006_incluir_willian_bastos.sql`.
4. Copie todo o conteúdo, execute e confirme que não ocorreu erro.
5. Execute a consulta de conferência:

```sql
select
  nome,
  papel,
  email,
  ativo,
  recebe_solicitacoes,
  recebe_respostas,
  recebe_copia_todas
from public.contatos_notificacao
where lower(trim(email)) = 'willianbastos@grupojuliani.com.br';
```

O resultado deve conter exatamente uma linha, com todos os campos booleanos
iguais a `true`.

## 2. Atualizar o workflow do n8n

### Opção recomendada: importar o workflow completo

1. Faça uma cópia de segurança do workflow atualmente ativo.
2. Importe o arquivo
   `Painel de Suporte — Notificações Automáticas.json`.
3. Revise e selecione novamente as credenciais do Supabase, Gmail e Gemini,
   caso o n8n solicite.
4. Confirme que o webhook mantém o mesmo caminho utilizado em produção.
5. Publique/ative a nova versão somente depois dos testes manuais.

### Alteração manual

1. No nó **Buscar Contatos**, mantenha `Get Many/Get All` e `Return All`
   habilitados, mas remova o filtro por IDs.
2. No nó **Preparar Dados**, substitua integralmente o JavaScript pelo conteúdo
   de `n8n/Preparar Dados.js`.
3. Não altere conexões, credenciais ou os demais nós.

## 3. Testes mínimos antes da ativação

Execute uma ocorrência controlada para cada evento:

1. abertura;
2. atualização;
3. resposta;
4. encerramento.

Em cada execução, confira a saída do nó **Preparar Dados**:

- `toFinal` mantém o destinatário previsto pela regra original;
- `ccFinal` contém todos os contatos ativos com
  `recebe_copia_todas = true`;
- nenhum endereço aparece simultaneamente em `toFinal` e `ccFinal`;
- os endereços não estão duplicados, inclusive quando diferem apenas em
  maiúsculas/minúsculas ou espaços;
- `tipoNotificacao`, `occurrenceId`, `idempotencyKey` e `geminiJson`
  continuam preenchidos.

Somente depois dessas quatro verificações ative o workflow atualizado.
