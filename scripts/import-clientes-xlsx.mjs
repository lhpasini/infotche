import fs from 'node:fs/promises';
import path from 'node:path';

import JSZip from 'jszip';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INPUT_FILE = path.resolve('app/dados exportados/cadastro clientes 2026 .xlsx');
const OUTPUT_JSON = path.resolve('app/dados exportados/cadastro-clientes-2026-unificado.json');
const OUTPUT_REPORT = path.resolve('app/dados exportados/cadastro-clientes-2026-relatorio-importacao.json');
const OUTPUT_JSON_EXISTING_FILTERED = path.resolve('app/dados exportados/cadastro-clientes-2026-unificado-sem-clientes-do-sistema.json');
const OUTPUT_REPORT_EXISTING_FILTERED = path.resolve('app/dados exportados/cadastro-clientes-2026-relatorio-clientes-do-sistema.json');
const PREIMPORT_CUTOFF = new Date('2026-03-24T19:59:00.000Z');

const MONTH_PLACEHOLDERS = new Set([
  'JANEIRO',
  'FEVEREIRO',
  'MARCO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]);

const CITY_ALIASES = new Map([
  ['SBS', 'Santa Barbara do Sul'],
  ['STA BARBARA DO SUL', 'Santa Barbara do Sul'],
  ['STA BARBRA DO SUL', 'Santa Barbara do Sul'],
  ['SANTA BARBARA DO SUL', 'Santa Barbara do Sul'],
  ['SANTA BARBRA DO SUL', 'Santa Barbara do Sul'],
  ['STA BARBARA', 'Santa Barbara do Sul'],
  ['SALDANHA MARINHO', 'Saldanha Marinho'],
  ['PANAMBI', 'Panambi'],
]);

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    dedupeOnly: argv.includes('--dedupe-only'),
    excludePreimportExisting: argv.includes('--exclude-preimport-existing'),
  };
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return decodeXmlEntities(value.replace(/<[^>]+>/g, ''));
}

function stripAccents(value) {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeWhitespace(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeNameKey(value) {
  return normalizeWhitespace(stripAccents(value).toUpperCase());
}

function cleanCustomerName(value) {
  const cleaned = normalizeWhitespace(value)
    .replace(/^[\d\W_]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

function titleCase(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();

  if (!normalized) {
    return '';
  }

  return normalized.replace(/\b([a-z\u00c0-\u017f])([a-z\u00c0-\u017f']*)/gi, (_, first, rest) => {
    return `${first.toUpperCase()}${rest}`;
  });
}

function normalizeScientific(value) {
  const text = normalizeWhitespace(value);

  if (!text) {
    return '';
  }

  if (/^[+-]?\d+(?:\.\d+)?E[+-]?\d+$/i.test(text)) {
    const number = Number(text);

    if (Number.isFinite(number)) {
      return number.toLocaleString('fullwide', {
        useGrouping: false,
        maximumFractionDigits: 0,
      });
    }
  }

  return text;
}

function digitsOnly(value) {
  return normalizeScientific(value).replace(/\D/g, '');
}

function isFakeRepeatedDigits(value) {
  return value.length >= 8 && new Set(value).size === 1;
}

function normalizeDocument(value) {
  let digits = digitsOnly(value);

  if (!digits || isFakeRepeatedDigits(digits)) {
    return '';
  }

  if (digits.length === 10) {
    digits = digits.padStart(11, '0');
  } else if (digits.length === 13) {
    digits = digits.padStart(14, '0');
  }

  if (digits.length !== 11 && digits.length !== 14) {
    return '';
  }

  return digits;
}

function normalizePhone(value) {
  const digits = digitsOnly(value);

  if (!digits || isFakeRepeatedDigits(digits) || digits.length < 8) {
    return '';
  }

  return digits;
}

function normalizeAddress(value) {
  return titleCase(
    value
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\/\s*/g, ' / ')
      .replace(/\s*-\s*/g, ' - '),
  );
}

function normalizeNeighborhood(value) {
  return titleCase(value);
}

function normalizeCity(value) {
  const key = normalizeNameKey(value);

  if (!key) {
    return '';
  }

  return CITY_ALIASES.get(key) || titleCase(value);
}

function parseSharedStrings(xml) {
  const strings = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;

  for (const match of xml.matchAll(siRegex)) {
    const raw = match[1] || '';
    const text = [...raw.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((item) => stripTags(item[1] || ''))
      .join('');

    strings.push(text);
  }

  return strings;
}

function parseSheetRows(xml, sharedStrings) {
  const rows = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;

  for (const rowMatch of xml.matchAll(rowRegex)) {
    const rowXml = rowMatch[1] || '';
    const row = {};

    for (const cellMatch of rowXml.matchAll(cellRegex)) {
      const attrs = cellMatch[1] || '';
      const body = cellMatch[2] || '';
      const refMatch = attrs.match(/\br="([A-Z]+)\d+"/);

      if (!refMatch) {
        continue;
      }

      const column = refMatch[1];
      const typeMatch = attrs.match(/\bt="([^"]+)"/);
      const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/);
      const inlineMatch = body.match(/<is>([\s\S]*?)<\/is>/);

      let value = '';

      if (typeMatch?.[1] === 's' && valueMatch?.[1]) {
        value = sharedStrings[Number(valueMatch[1])] || '';
      } else if (inlineMatch?.[1]) {
        value = stripTags(inlineMatch[1]);
      } else if (valueMatch?.[1]) {
        value = decodeXmlEntities(valueMatch[1]);
      }

      row[column] = normalizeWhitespace(value);
    }

    rows.push(row);
  }

  return rows;
}

async function readWorkbookRows(filePath) {
  const buffer = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const sharedXml = await zip.file('xl/sharedStrings.xml').async('string');
  const sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const sharedStrings = parseSharedStrings(sharedXml);
  const rows = parseSheetRows(sheetXml, sharedStrings);

  return rows.slice(1);
}

function chooseBestPhone(rows) {
  for (const row of rows) {
    const candidates = [row.telefone2, row.telefone1];

    for (const candidate of candidates) {
      const phone = normalizePhone(candidate);

      if (phone) {
        return phone;
      }
    }
  }

  return '';
}

function buildUnifiedCustomers(rawRows, options = {}) {
  const grouped = new Map();
  let ignoredRows = 0;
  let excludedByExisting = 0;
  const excludedKeys = options.excludedNameKeys || new Set();

  for (const raw of rawRows) {
    const id = Number(raw.A || 0);
    const nomeOriginal = cleanCustomerName(raw.B || '');
    const nomeKey = normalizeNameKey(nomeOriginal);
    const hasUsefulData = ['C', 'E', 'F', 'G', 'H', 'I'].some((key) => normalizeWhitespace(raw[key] || ''));
    const hasLetters = /[A-Z]/.test(nomeKey);

    if (!id || !nomeKey || !hasLetters || MONTH_PLACEHOLDERS.has(nomeKey) || !hasUsefulData) {
      ignoredRows += 1;
      continue;
    }

    if (excludedKeys.has(nomeKey)) {
      excludedByExisting += 1;
      continue;
    }

    const row = {
      origemId: id,
      nomeOriginal,
      nomeKey,
      cpfCnpj: normalizeWhitespace(raw.C || ''),
      telefone1: normalizeWhitespace(raw.E || ''),
      telefone2: normalizeWhitespace(raw.F || ''),
      endereco: normalizeWhitespace(raw.G || ''),
      bairro: normalizeWhitespace(raw.H || ''),
      cidade: normalizeWhitespace(raw.I || ''),
    };

    const current = grouped.get(nomeKey) || [];
    current.push(row);
    grouped.set(nomeKey, current);
  }

  const unified = [...grouped.values()]
    .map((rows) => {
      const sorted = [...rows].sort((left, right) => right.origemId - left.origemId);
      const latest = sorted[0];
      const latestAddressRow = sorted.find((row) => row.endereco) || latest;
      const latestDocument = sorted.map((row) => normalizeDocument(row.cpfCnpj)).find(Boolean) || '';
      const latestCity = sorted.map((row) => normalizeCity(row.cidade)).find(Boolean) || '';

      return {
        nomeKey: latest.nomeKey,
        nome: titleCase(latest.nomeOriginal),
        origemMaisNova: latest.origemId,
        totalDuplicados: sorted.length,
        cpfCnpj: latestDocument,
        whatsapp: chooseBestPhone(sorted),
        cidade: normalizeCity(latestAddressRow.cidade) || latestCity,
        endereco: normalizeAddress(latestAddressRow.endereco),
        bairro: normalizeNeighborhood(latestAddressRow.bairro),
        amostrasOrigem: sorted.slice(0, 5).map((row) => ({
          origemId: row.origemId,
          nome: row.nomeOriginal,
          cpfCnpj: row.cpfCnpj,
          telefone1: row.telefone1,
          telefone2: row.telefone2,
          endereco: row.endereco,
          bairro: row.bairro,
          cidade: row.cidade,
        })),
      };
    })
    .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));

  return {
    unified,
    stats: {
      linhasLidas: rawRows.length,
      linhasIgnoradas: ignoredRows,
      linhasIgnoradasPorClienteExistente: excludedByExisting,
      clientesUnificados: unified.length,
      gruposComDuplicidade: unified.filter((item) => item.totalDuplicados > 1).length,
      duplicidadesAbsorvidas: unified.reduce((total, item) => total + Math.max(0, item.totalDuplicados - 1), 0),
    },
  };
}

async function writeOutputs(unifiedPayload) {
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(unifiedPayload.unified, null, 2));

  const report = {
    ...unifiedPayload.stats,
    geradoEm: new Date().toISOString(),
    arquivoOrigem: INPUT_FILE,
    exemplosDuplicados: unifiedPayload.unified
      .filter((item) => item.totalDuplicados > 1)
      .sort((left, right) => right.totalDuplicados - left.totalDuplicados)
      .slice(0, 25)
      .map((item) => ({
        nome: item.nome,
        totalDuplicados: item.totalDuplicados,
        origemMaisNova: item.origemMaisNova,
        enderecoEscolhido: item.endereco,
        bairroEscolhido: item.bairro,
        cidadeEscolhida: item.cidade,
      })),
  };

  await fs.writeFile(OUTPUT_REPORT, JSON.stringify(report, null, 2));
}

async function writeExistingFilteredOutputs(unifiedPayload, existingMatches) {
  await fs.writeFile(OUTPUT_JSON_EXISTING_FILTERED, JSON.stringify(unifiedPayload.unified, null, 2));

  const report = {
    ...unifiedPayload.stats,
    geradoEm: new Date().toISOString(),
    arquivoOrigem: INPUT_FILE,
    clientesDoSistemaPreservados: existingMatches.length,
    clientesEncontradosNaPlanilha: existingMatches.filter((item) => item.encontradoNaPlanilha).length,
    clientesNaoEncontradosNaPlanilha: existingMatches.filter((item) => !item.encontradoNaPlanilha).length,
    matches: existingMatches,
  };

  await fs.writeFile(OUTPUT_REPORT_EXISTING_FILTERED, JSON.stringify(report, null, 2));
}

async function syncCustomersToDatabase(unified) {
  const existingCustomers = await prisma.cliente.findMany({
    include: {
      conexoes: {
        orderBy: { id: 'asc' },
      },
    },
  });

  const existingByName = new Map(
    existingCustomers.map((customer) => [normalizeNameKey(customer.nome), customer]),
  );

  let created = 0;
  let updated = 0;

  for (const customer of unified) {
    const existing = existingByName.get(customer.nomeKey);

    if (!existing) {
      await prisma.cliente.create({
        data: {
          nome: customer.nome,
          cpfCnpj: customer.cpfCnpj || null,
          whatsapp: customer.whatsapp || null,
          cidade: customer.cidade || null,
          conexoes: customer.endereco
            ? {
                create: {
                  endereco: customer.endereco,
                  bairro: customer.bairro || null,
                },
              }
            : undefined,
        },
      });
      created += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.cliente.update({
        where: { id: existing.id },
        data: {
          nome: customer.nome || existing.nome,
          cpfCnpj: customer.cpfCnpj || existing.cpfCnpj || null,
          whatsapp: customer.whatsapp || existing.whatsapp || null,
          cidade: customer.cidade || existing.cidade || null,
        },
      });

      if (customer.endereco) {
        const firstConnection = existing.conexoes[0];

        if (firstConnection) {
          await tx.conexao.update({
            where: { id: firstConnection.id },
            data: {
              endereco: customer.endereco,
              bairro: customer.bairro || firstConnection.bairro || null,
            },
          });
        } else {
          await tx.conexao.create({
            data: {
              clienteId: existing.id,
              endereco: customer.endereco,
              bairro: customer.bairro || null,
            },
          });
        }
      }
    });

    updated += 1;
  }

  return { created, updated };
}

function scoreCustomerRecord(customer) {
  return [
    customer.cpfCnpj ? 3 : 0,
    customer.whatsapp ? 3 : 0,
    customer.cidade ? 2 : 0,
    customer.conexoes?.[0]?.endereco ? 4 : 0,
    customer.conexoes?.[0]?.bairro ? 1 : 0,
    customer.chamados?.length ? 10 : 0,
    customer.atendimentosMassivos?.length ? 10 : 0,
  ].reduce((total, value) => total + value, 0);
}

function chooseBestConnection(customers) {
  const connections = customers.flatMap((customer) =>
    customer.conexoes.map((connection) => ({
      ...connection,
      createdAt: customer.criadoEm,
    })),
  );

  return connections
    .filter((connection) => connection.endereco)
    .sort((left, right) => {
      const leftScore = (left.endereco ? 2 : 0) + (left.bairro ? 1 : 0);
      const rightScore = (right.endereco ? 2 : 0) + (right.bairro ? 1 : 0);

      return rightScore - leftScore || new Date(right.createdAt) - new Date(left.createdAt);
    })[0] || null;
}

async function deduplicateCustomersInDatabase() {
  const customers = await prisma.cliente.findMany({
    include: {
      conexoes: {
        orderBy: { id: 'asc' },
      },
      chamados: {
        select: { id: true },
      },
      atendimentosMassivos: {
        select: { id: true },
      },
    },
  });

  const grouped = new Map();

  for (const customer of customers) {
    const key = normalizeNameKey(customer.nome);
    const current = grouped.get(key) || [];
    current.push(customer);
    grouped.set(key, current);
  }

  const duplicateGroups = [...grouped.values()].filter((items) => items.length > 1);
  let mergedGroups = 0;
  let removedCustomers = 0;

  for (const group of duplicateGroups) {
    const ranked = [...group].sort((left, right) => {
      return (
        scoreCustomerRecord(right) - scoreCustomerRecord(left) ||
        new Date(left.criadoEm) - new Date(right.criadoEm)
      );
    });

    const keeper = ranked[0];
    const duplicates = ranked.slice(1);
    const duplicateIds = duplicates.map((item) => item.id);
    const duplicateConnectionIds = duplicates.flatMap((item) => item.conexoes.map((connection) => connection.id));
    const bestConnection = chooseBestConnection(group);
    const mergedCpf = ranked.map((item) => item.cpfCnpj || '').find(Boolean) || null;
    const mergedWhatsapp = ranked.map((item) => item.whatsapp || '').find(Boolean) || null;
    const mergedCidade = ranked.map((item) => item.cidade || '').find(Boolean) || null;

    await prisma.$transaction(async (tx) => {
      await tx.cliente.update({
        where: { id: keeper.id },
        data: {
          nome: keeper.nome,
          cpfCnpj: mergedCpf,
          whatsapp: mergedWhatsapp,
          cidade: mergedCidade,
        },
      });

      let keeperConnectionId = keeper.conexoes[0]?.id || null;

      if (bestConnection) {
        if (keeperConnectionId) {
          await tx.conexao.update({
            where: { id: keeperConnectionId },
            data: {
              endereco: bestConnection.endereco,
              bairro: bestConnection.bairro || null,
            },
          });
        } else {
          const createdConnection = await tx.conexao.create({
            data: {
              clienteId: keeper.id,
              endereco: bestConnection.endereco,
              bairro: bestConnection.bairro || null,
            },
          });

          keeperConnectionId = createdConnection.id;
        }
      }

      if (duplicateIds.length > 0) {
        await tx.chamado.updateMany({
          where: { clienteId: { in: duplicateIds } },
          data: { clienteId: keeper.id },
        });

        await tx.atendimentoMassivoCliente.updateMany({
          where: { clienteId: { in: duplicateIds } },
          data: { clienteId: keeper.id },
        });
      }

      if (duplicateConnectionIds.length > 0) {
        await tx.chamado.updateMany({
          where: { conexaoId: { in: duplicateConnectionIds } },
          data: { conexaoId: keeperConnectionId },
        });

        await tx.atendimentoMassivoCliente.updateMany({
          where: { conexaoId: { in: duplicateConnectionIds } },
          data: { conexaoId: keeperConnectionId },
        });

        await tx.conexao.deleteMany({
          where: { id: { in: duplicateConnectionIds } },
        });
      }

      const keeperExtraConnections = keeper.conexoes
        .map((connection) => connection.id)
        .filter((id) => id !== keeperConnectionId);

      if (keeperExtraConnections.length > 0) {
        await tx.chamado.updateMany({
          where: { conexaoId: { in: keeperExtraConnections } },
          data: { conexaoId: keeperConnectionId },
        });

        await tx.atendimentoMassivoCliente.updateMany({
          where: { conexaoId: { in: keeperExtraConnections } },
          data: { conexaoId: keeperConnectionId },
        });

        await tx.conexao.deleteMany({
          where: { id: { in: keeperExtraConnections } },
        });
      }

      await tx.cliente.deleteMany({
        where: { id: { in: duplicateIds } },
      });
    });

    mergedGroups += 1;
    removedCustomers += duplicateIds.length;
  }

  return { mergedGroups, removedCustomers };
}

async function getPreimportExistingCustomers() {
  const customers = await prisma.cliente.findMany({
    where: { criadoEm: { lt: PREIMPORT_CUTOFF } },
    include: {
      conexoes: {
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { criadoEm: 'asc' },
  });

  return customers.map((customer) => ({
    id: customer.id,
    nome: customer.nome,
    nomeKey: normalizeNameKey(customer.nome),
    cidade: customer.cidade || '',
    cpfCnpj: customer.cpfCnpj || '',
    whatsapp: customer.whatsapp || '',
    endereco: customer.conexoes[0]?.endereco || '',
    bairro: customer.conexoes[0]?.bairro || '',
    criadoEm: customer.criadoEm,
  }));
}

function compareExistingCustomersToRows(existingCustomers, rawRows) {
  return existingCustomers.map((customer) => {
    const matchedRows = rawRows
      .map((raw) => ({
        origemId: Number(raw.A || 0),
        nome: cleanCustomerName(raw.B || ''),
        nomeKey: normalizeNameKey(cleanCustomerName(raw.B || '')),
        cpfCnpj: normalizeWhitespace(raw.C || ''),
        telefone1: normalizeWhitespace(raw.E || ''),
        telefone2: normalizeWhitespace(raw.F || ''),
        endereco: normalizeWhitespace(raw.G || ''),
        bairro: normalizeWhitespace(raw.H || ''),
        cidade: normalizeWhitespace(raw.I || ''),
      }))
      .filter((row) => row.nomeKey === customer.nomeKey)
      .sort((left, right) => right.origemId - left.origemId);

    return {
      nome: customer.nome,
      nomeKey: customer.nomeKey,
      encontradoNaPlanilha: matchedRows.length > 0,
      totalOcorrenciasNaPlanilha: matchedRows.length,
      dadosSistema: {
        cpfCnpj: customer.cpfCnpj,
        whatsapp: customer.whatsapp,
        endereco: customer.endereco,
        bairro: customer.bairro,
        cidade: customer.cidade,
      },
      ocorrenciasPlanilha: matchedRows.slice(0, 10),
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.dedupeOnly) {
    const dedupeResult = await deduplicateCustomersInDatabase();
    console.log(JSON.stringify({ bancoDeduplicado: true, ...dedupeResult }, null, 2));
    return;
  }

  const rows = await readWorkbookRows(INPUT_FILE);
  const existingCustomers = args.excludePreimportExisting ? await getPreimportExistingCustomers() : [];
  const existingNameKeys = new Set(existingCustomers.map((customer) => customer.nomeKey));
  const unifiedPayload = buildUnifiedCustomers(rows, {
    excludedNameKeys: args.excludePreimportExisting ? existingNameKeys : new Set(),
  });
  const existingMatches = args.excludePreimportExisting
    ? compareExistingCustomersToRows(existingCustomers, rows)
    : [];

  if (args.excludePreimportExisting) {
    await writeExistingFilteredOutputs(unifiedPayload, existingMatches);
  } else {
    await writeOutputs(unifiedPayload);
  }

  console.log(JSON.stringify({
    ...unifiedPayload.stats,
    arquivoBaseGerado: args.excludePreimportExisting ? OUTPUT_JSON_EXISTING_FILTERED : OUTPUT_JSON,
    relatorioGerado: args.excludePreimportExisting ? OUTPUT_REPORT_EXISTING_FILTERED : OUTPUT_REPORT,
  }, null, 2));

  if (!args.apply) {
    console.log('Dry run concluido. Use --apply para sincronizar com o banco.');
    return;
  }

  const syncResult = await syncCustomersToDatabase(unifiedPayload.unified);
  const dedupeResult = await deduplicateCustomersInDatabase();
  console.log(JSON.stringify({
    bancoAtualizado: true,
    clientesCriados: syncResult.created,
    clientesAtualizados: syncResult.updated,
    gruposMesclados: dedupeResult.mergedGroups,
    clientesRemovidosNaDeduplicacao: dedupeResult.removedCustomers,
  }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
