# Painel de Suporte

Aplicação React + Supabase para registrar interações com clientes e com o setor de desenvolvimento.

## Persistência

Os dados são gravados no Supabase. Eles permanecem disponíveis após fechar o navegador e podem ser acessados em outros dispositivos por usuários autenticados. Não dependem de `localStorage`.

## Numeração

Cada registro recebe um número sequencial único gerado pelo PostgreSQL, como `#0001`, `#0002` e assim por diante. O número é exibido no histórico e durante a edição. Em um novo registro, o formulário informa que o número será gerado ao salvar.

## Configuração

1. Execute `supabase/migrations/001_criar_painel_suporte.sql` no SQL Editor do Supabase.
2. Copie `.env.example` para `.env`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Crie ao menos um usuário no Supabase Authentication.
5. Execute `npm install` e `npm run dev`.

## Build

```bash
npm run build
```

## Classificação de ocorrências

A versão atual utiliza as tabelas `empresas` e `tipos_ocorrencia`. No formulário, o usuário pode selecionar uma sugestão existente ou digitar um novo valor. Empresas novas são cadastradas automaticamente; tipos novos entram com status `pendente` e passam a aparecer nas sugestões seguintes.

A migration correspondente está em `supabase/migrations/002_classificacao_ocorrencias.sql`.
