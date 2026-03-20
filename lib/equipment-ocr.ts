type ParsedEquipmentText = {
  rawText: string;
  tipoEquipamento: string;
  marca: string;
  modelo: string;
  codigoEquipamento: string;
  macAddress: string;
  serialNumber: string;
  usuarioAcesso: string;
  senhaAcesso: string;
};

const KNOWN_BRANDS = [
  'FIBERHOME',
  'HUAWEI',
  'ZTE',
  'INTELBRAS',
  'TP-LINK',
  'TPLINK',
  'MERCUSYS',
  'NOKIA',
  'CISCO',
  'DATACOM',
  'PARKS',
  'SUMEC',
  'ACTIONTEC',
];

const OCR_NOISE_PATTERNS = [
  /SCAN\s*FOR\s*QUICK\s*START/gi,
  /QUICK\s*START/gi,
  /HUAWEI\s+AI\s+LIFE/gi,
  /WIFI\s+CERTIFIED/gi,
];

function cleanValue(value: string | undefined) {
  return (value || '').replace(/[^\w:/().-]/g, '').trim();
}

function cleanHexLike(value: string | undefined) {
  return (value || '')
    .toUpperCase()
    .replace(/[OQ]/g, '0')
    .replace(/I/g, '1')
    .replace(/[^A-F0-9]/g, '')
    .trim();
}

function normalizeInlineText(text: string) {
  let normalized = text
    .replace(/\r/g, '\n')
    .replace(/[|]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  for (const pattern of OCR_NOISE_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }

  return normalized
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

function normalizeModel(value: string) {
  return value
    .split(/POT[ÊE]NCIA|POWER|ANATEL|HUAWEI AI LIFE|SSID|ENDERE[CÇ]O WEB|VER(?:SION)?\b|V(?:ER)?[:.]?\s*\d/i)[0]
    .replace(/\bNO\b[:.]?/gi, '')
    .replace(/\bMODEL(?:O)?\b[:.]?/gi, '')
    .replace(/\bGPON\s+ONU\b/gi, '')
    .replace(/\bGPON\s+TERMINAL\b/gi, '')
    .replace(/\bROTEADOR\s+WIRELESS\s+GIGABIT\s+DUAL\s+BAND\s+AC1200\b/gi, '')
    .replace(/\bROTEADOR\s+SEM\s+FIO\s+\d+MBPS\b/gi, '')
    .replace(/\bDUAL-BAND\s+EDGE\s+ONT\b/gi, '')
    .replace(/\bWIFI\s+AX\d+\S*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatMac(value: string) {
  const hex = cleanHexLike(value);

  if (hex.length < 12) {
    return value.trim().toUpperCase();
  }

  return hex.slice(0, 12).match(/.{1,2}/g)?.join(':') || value.trim().toUpperCase();
}

function inferEquipmentType(text: string) {
  const upper = text.toUpperCase();

  if (upper.includes('GPON ONU')) {
    return 'ONU';
  }

  if (upper.includes('EDGE ONT') || upper.includes('GPON TERMINAL') || /\bONT\b/.test(upper)) {
    return 'ONT';
  }

  if (upper.includes('HYBRID ONU') || /\bONU\b/.test(upper)) {
    return 'ONU';
  }

  if (
    upper.includes('ROTEADOR') ||
    upper.includes('ROUTER') ||
    upper.includes('WIRELESS GIGABIT DUAL BAND AC1200') ||
    upper.includes('WI-FI AX') ||
    upper.includes('WIFI AX')
  ) {
    return 'Roteador Wi-Fi';
  }

  if (upper.includes('MESH')) {
    return 'Mesh';
  }

  return 'ONT';
}

function findBestMatch(patterns: RegExp[], text: string) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }

  return '';
}

function findByLabeledLine(labelPatterns: RegExp[], text: string) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    for (const pattern of labelPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return cleanValue(match[1]);
      }
    }
  }

  return '';
}

function sanitizeSerial(value: string) {
  const compact = cleanValue(value)
    .replace(/SCANFORQUICKSTART/gi, '')
    .replace(/QUICKSTART/gi, '')
    .replace(/\s+/g, '');

  if (compact.length > 14 && compact.endsWith('40')) {
    return compact.slice(0, -2);
  }

  if (compact.length > 14 && compact.endsWith('42')) {
    return compact.slice(0, -2);
  }

  return compact;
}

export function parseEquipmentText(rawText: string): ParsedEquipmentText {
  const normalized = normalizeInlineText(rawText);
  const upper = normalized.toUpperCase();
  const explicitWsModel = upper.match(/\bWS\s?7000\s?V?\s?2\b|\bWS7001\b|\bWS7000\b/i);
  const explicitHuaweiModel = upper.match(/\bK562E-10\b|\bEG8041X6-10\b|\bPSDN-AX30\b|\bSDN8601GR1B\s?V2\b/i);
  const explicitTpLinkModel = upper.match(/\bEC220-G5(?:\(BR\))?\b/i);
  const explicitFiberhomeModel = upper.match(/\bAN5506-01-A\b|\bAN5506-01-B\b|\bAN5506-02-B\b/i);

  const labeledMac = findByLabeledLine(
    [/(?:MAC|MAC ADDRESS)\s*[:#-]?\s*([A-Z0-9 :.-]{10,24})/i],
    normalized,
  );
  const macPattern = upper.match(
    /(?:MAC|MAC ADDRESS)\s*[:#-]?\s*([A-F0-9OQI]{12,24})|(?:\b([A-F0-9OQI]{2}(?:[:-]?[A-F0-9OQI]{2}){5})\b)/i,
  );
  const serial = findBestMatch(
    [
      /(?:GPON\s+S\/?N|S\/?N|SERIAL(?: NUMBER)?|SN)\s*[:#-]?\s*([A-Z0-9-]{6,})/i,
      /\b(FHTT[A-Z0-9]{6,})\b/i,
      /\b([A-Z]{2,}\d[A-Z0-9]{6,})\b/,
    ],
    normalized,
  );
  const user = findBestMatch(
    [/(?:USER(?:NAME)?|USER NAME|LOGIN|USUARIO)\s*[:#/-]?\s*([A-Z0-9_.-]{3,})/i],
    normalized,
  );
  const password = findBestMatch(
    [/(?:PASS(?:WORD)?|PWD|SENHA(?:\s+WIRELESS)?\/?PIN)\s*[:#/-]?\s*([A-Z0-9!@#$%^&*_=+?.:-]{3,})/i],
    normalized,
  );

  const brand = KNOWN_BRANDS.find((item) => upper.includes(item)) || '';
  let model = findBestMatch(
    [
      /(?:MODEL(?:O)?(?:\s+NO\.?)?)\s*[:#-]?\s*([A-Z0-9() -]{4,})/i,
      /HUAWEI\s+OPTIXSTAR\s+([A-Z0-9- ]{4,})/i,
      /\b((?:WS|SDN|K|EG|PSDN|EC|AN)\d?[A-Z0-9() -]{4,})\b/i,
    ],
    normalized,
  );

  if (!model) {
    model = findByLabeledLine(
      [
        /(?:MODEL(?:O)?(?:\s+NO\.?)?)\s*[:#-]?\s*([A-Z0-9() -]{4,})/i,
        /HUAWEI\s+WIFI\s+([A-Z0-9 -]{3,})/i,
      ],
      normalized,
    );
  }

  model = normalizeModel(model);

  if (explicitWsModel) {
    model = explicitWsModel[0].replace(/\s+/g, ' ').toUpperCase();
  } else if (explicitHuaweiModel) {
    model = explicitHuaweiModel[0].replace(/\s+/g, ' ').toUpperCase();
  } else if (explicitTpLinkModel) {
    model = explicitTpLinkModel[0].replace(/\(BR\)/i, '').replace(/\s+/g, ' ').toUpperCase();
  } else if (explicitFiberhomeModel) {
    model = explicitFiberhomeModel[0].replace(/\s+/g, ' ').toUpperCase();
  }

  const productCode = findBestMatch(
    [
      /(?:PROD(?:UCT)?\s*ID)\s*[:#-]?\s*([A-Z0-9-]{8,})/i,
      /\b(SDN\d[A-Z0-9]{8,})\b/i,
      /\b(EG\d[A-Z0-9-]{6,})\b/i,
      /\b(PSDN-[A-Z0-9]{3,})\b/i,
      /\b(WS\d{4}[A-Z0-9 ]{0,3})\b/i,
      /\b(EC220-G5)\b/i,
      /\b(AN5506-01-A|AN5506-01-B|AN5506-02-B)\b/i,
    ],
    normalized,
  );

  if (brand && model === brand) {
    model = '';
  }

  const macValue = labeledMac || macPattern?.[1] || macPattern?.[2] || '';
  const formattedMac = macValue ? formatMac(macValue) : '';

  return {
    rawText: normalized,
    tipoEquipamento: inferEquipmentType(normalized),
    marca: brand,
    modelo: model,
    codigoEquipamento: productCode,
    macAddress: formattedMac,
    serialNumber: sanitizeSerial(serial),
    usuarioAcesso: user,
    senhaAcesso: password,
  };
}
