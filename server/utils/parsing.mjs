export function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'ja';
}

export function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const number = Number(normalized.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

export function parseInteger(value) {
  const parsed = parseNumber(value);
  if (parsed === null) {
    return null;
  }

  return Math.trunc(parsed);
}

export function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (insideQuotes) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      insideQuotes = true;
      continue;
    }

    if (character === ';') {
      cells.push(cell);
      cell = '';
      continue;
    }

    cell += character;
  }

  cells.push(cell);
  return cells;
}

export function parseCsvText(text) {
  const cleaned = String(text ?? '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!cleaned) {
    return { headers: [], rows: [] };
  }

  const lines = cleaned.split('\n').filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = cells[index] ?? '';
    });

    return record;
  });

  return { headers, rows };
}

export function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[;\n\r"]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
