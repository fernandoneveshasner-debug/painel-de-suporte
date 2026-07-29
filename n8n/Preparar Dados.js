const classify = $('Validar e Classificar').first().json;
const occurrence = $('Buscar Ocorrência').first().json;
const empresa = $('Buscar Empresa').first().json;
const tipo = $('Buscar Tipo Ocorrência').first().json;
const categoria = $('Buscar Categoria').first().json;
const allContacts = $input.all().map(function (item) {
  return item.json;
});

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Localizar contato por UUID.
function findContact(id) {
  if (!id) return null;
  for (var i = 0; i < allContacts.length; i++) {
    if (allContacts[i].id === id) return allContacts[i];
  }
  return null;
}

// Contatos globais são definidos no banco, sem endereço fixo no workflow.
const globalCcEmails = allContacts
  .filter(function (contact) {
    return (
      contact.ativo === true &&
      contact.recebe_copia_todas === true &&
      normalizeEmail(contact.email)
    );
  })
  .map(function (contact) {
    return contact.email;
  });

const solicitante = findContact(occurrence.solicitante_contato_id);
const destinatario = findContact(occurrence.destinatario_contato_id);
const respondente = findContact(occurrence.respondido_por_contato_id);
const tipoNotificacao = classify.tipoNotificacao;

var toEmails = [];
var ccEmails = [];

if (tipoNotificacao === 'abertura') {
  // TO: destinatário | CC: solicitante + contatos globais.
  toEmails = [destinatario && destinatario.email].filter(Boolean);
  ccEmails = [solicitante && solicitante.email]
    .concat(globalCcEmails)
    .filter(Boolean);
} else if (tipoNotificacao === 'atualizacao') {
  // TO: destinatário original | CC: solicitante + responsável + contatos globais.
  toEmails = [destinatario && destinatario.email].filter(Boolean);
  ccEmails = [
    solicitante && solicitante.email,
    respondente && respondente.email,
  ]
    .concat(globalCcEmails)
    .filter(Boolean);
} else if (tipoNotificacao === 'resposta') {
  // TO: solicitante original | CC: respondente + destinatário + contatos globais.
  toEmails = [solicitante && solicitante.email].filter(Boolean);
  ccEmails = [
    respondente && respondente.email,
    destinatario && destinatario.email,
  ]
    .concat(globalCcEmails)
    .filter(Boolean);
} else if (tipoNotificacao === 'encerramento') {
  // TO: solicitante original | CC: destinatário + encerrador + contatos globais.
  toEmails = [solicitante && solicitante.email].filter(Boolean);
  var encerrouEmail =
    (respondente && respondente.email) ||
    (destinatario && destinatario.email);
  ccEmails = [destinatario && destinatario.email, encerrouEmail]
    .concat(globalCcEmails)
    .filter(Boolean);
}

// Deduplicação sem diferenciar maiúsculas/minúsculas.
var toByNormalizedEmail = {};
for (var j = 0; j < toEmails.length; j++) {
  var toEmail = normalizeEmail(toEmails[j]);
  if (toEmail && !toByNormalizedEmail[toEmail]) {
    toByNormalizedEmail[toEmail] = toEmail;
  }
}

// Um endereço presente no TO nunca é repetido no CC.
var ccByNormalizedEmail = {};
for (var k = 0; k < ccEmails.length; k++) {
  var ccEmail = normalizeEmail(ccEmails[k]);
  if (
    ccEmail &&
    !toByNormalizedEmail[ccEmail] &&
    !ccByNormalizedEmail[ccEmail]
  ) {
    ccByNormalizedEmail[ccEmail] = ccEmail;
  }
}

var toFinal = Object.keys(toByNormalizedEmail).map(function (email) {
  return toByNormalizedEmail[email];
});
var ccFinal = Object.keys(ccByNormalizedEmail).map(function (email) {
  return ccByNormalizedEmail[email];
});

if (!occurrence || !occurrence.id) {
  throw new Error('Ocorrência não encontrada ou sem identificador.');
}

if (!tipoNotificacao) {
  throw new Error('Tipo de notificação não foi classificado.');
}

if (toFinal.length === 0) {
  throw new Error(
    'Nenhum destinatário válido foi encontrado para esta notificação.',
  );
}

// Número formatado com 4 dígitos.
var numero = String(occurrence.numero || '0');
while (numero.length < 4) {
  numero = '0' + numero;
}

// Nome do primeiro destinatário para saudação no e-mail.
var primeiroRecipiente = null;
for (var m = 0; m < allContacts.length; m++) {
  if (normalizeEmail(allContacts[m].email) === toFinal[0]) {
    primeiroRecipiente = allContacts[m];
    break;
  }
}
var nomeDestinatario = primeiroRecipiente
  ? primeiroRecipiente.nome
  : 'Prezado(a)';

// Montar JSON estruturado para o Gemini.
var geminiData = {
  evento: tipoNotificacao,
  numero: numero,
  empresa: (empresa && empresa.nome) || '',
  categoria: (categoria && categoria.nome) || '',
  tipo_ocorrencia: (tipo && tipo.nome) || '',
  tipo_ocorrencia_outro: occurrence.tipo_ocorrencia_outro || null,
  modulo: occurrence.modulo || null,
  impacto: occurrence.impacto || null,
  prioridade: occurrence.prioridade || null,
  status: occurrence.status || null,
  canal: occurrence.canal || null,
  solicitante: {
    nome: (solicitante && solicitante.nome) || '',
    papel: (solicitante && solicitante.papel) || '',
  },
  destinatario: {
    nome: nomeDestinatario,
    papel: (destinatario && destinatario.papel) || '',
  },
  assunto_original: occurrence.assunto || '',
  descricao: occurrence.descricao || null,
  resposta: occurrence.resposta || null,
  proxima_acao: occurrence.proxima_acao || null,
  reincidente: occurrence.reincidente || false,
  possui_anexo: !!occurrence.anexo_path,
  encaminhado_desenvolvimento:
    occurrence.encaminhado_desenvolvimento || false,
  criado_em: occurrence.created_at || occurrence.criado_em || null,
  respondido_em: occurrence.respondido_em || null,
};

return [
  {
    json: {
      tipoNotificacao: tipoNotificacao,
      occurrenceId: occurrence.id,
      idempotencyKey: classify.idempotencyKey,
      toFinal: toFinal,
      ccFinal: ccFinal,
      toString: toFinal.join(', '),
      ccString: ccFinal.join(', '),
      toJSON: JSON.stringify(toFinal),
      ccJSON: JSON.stringify(ccFinal),
      geminiJson: JSON.stringify(geminiData),
      numero: numero,
      assuntoOriginal: occurrence.assunto || '',
    },
  },
];
