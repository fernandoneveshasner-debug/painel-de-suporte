const assert = require('node:assert/strict');
const fs = require('node:fs');

const code = fs.readFileSync(
  require('node:path').join(__dirname, 'Preparar Dados.js'),
  'utf8',
);
const execute = new Function('$', '$input', code);

const contacts = [
  { id: 'sol', nome: 'Solicitante', papel: 'solicitante', email: 'sol@example.com', ativo: true },
  { id: 'dest', nome: 'Destinatário', papel: 'responsavel', email: 'DEST@example.com', ativo: true },
  { id: 'resp', nome: 'Respondente', papel: 'responsavel', email: 'resp@example.com', ativo: true },
  { id: 'global-1', nome: 'Willian', papel: 'gerente_geral', email: ' willian@example.com ', ativo: true, recebe_copia_todas: true },
  { id: 'global-2', nome: 'Duplicado', papel: 'gerente', email: 'WILLIAN@example.com', ativo: true, recebe_copia_todas: true },
  { id: 'global-to', nome: 'Também destinatário', papel: 'gerente', email: 'dest@example.com', ativo: true, recebe_copia_todas: true },
  { id: 'inactive', nome: 'Inativo', papel: 'gerente', email: 'inactive@example.com', ativo: false, recebe_copia_todas: true },
];

const baseOccurrence = {
  id: 'occurrence',
  numero: 1,
  solicitante_contato_id: 'sol',
  destinatario_contato_id: 'dest',
  respondido_por_contato_id: 'resp',
};

async function run(tipoNotificacao) {
  const nodes = {
    'Validar e Classificar': { tipoNotificacao, idempotencyKey: 'key' },
    'Buscar Ocorrência': baseOccurrence,
    'Buscar Empresa': { nome: 'Empresa' },
    'Buscar Tipo Ocorrência': { nome: 'Tipo' },
    'Buscar Categoria': { nome: 'Categoria' },
  };
  const $ = (name) => ({
    first: () => ({ json: nodes[name] }),
  });
  const $input = {
    all: () => contacts.map((json) => ({ json })),
  };
  return (await execute($, $input))[0].json;
}

(async () => {
  for (const event of ['abertura', 'atualizacao', 'resposta', 'encerramento']) {
    const result = await run(event);
    assert.equal(new Set(result.toFinal).size, result.toFinal.length);
    assert.equal(new Set(result.ccFinal).size, result.ccFinal.length);
    assert.equal(result.ccFinal.includes('willian@example.com'), true);
    assert.equal(result.ccFinal.includes('inactive@example.com'), false);
    assert.equal(
      result.ccFinal.some((email) => result.toFinal.includes(email)),
      false,
    );
  }
  console.log('Preparar Dados: 4 cenários aprovados');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
