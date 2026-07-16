import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [table, sourcePath, targetPath] = process.argv.slice(2);

if (!table || !sourcePath || !targetPath) {
  throw new Error("Expected a table name and two CSV paths.");
}

const booleanColumns = {
  player_details: new Set(["motherClubBonus", "isAbroad", "transferListed"]),
  player_tracking: new Set(["isTracking"]),
};

const dateColumns = {
  player_details: new Set(["fetchedAt"]),
  player_tracking: new Set(["lastUpdatedAt"]),
  player_training_week: new Set(["weekStart", "updatedAt"]),
  team_settings: new Set(["updatedAt"]),
  player_change: new Set(["detectedAt"]),
  market_study: new Set(["createdAt", "updatedAt"]),
  custom_chart: new Set(["createdAt"]),
  transfer_player: new Set(["createdAt", "updatedAt"]),
  price_model: new Set(["trainedAt", "createdAt"]),
};

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let fieldWasQuoted = false;

  const pushField = () => {
    row.push({ value: field, quoted: fieldWasQuoted });
    field = "";
    fieldWasQuoted = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
      fieldWasQuoted = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (quoted) {
    throw new Error("Malformed CSV: unclosed quoted field.");
  }
  if (field.length > 0 || fieldWasQuoted || row.length > 0) {
    pushRow();
  }
  return rows;
}

function normalizeDate(value) {
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/,
  );
  if (!match) return value;
  return match[1] + "T" + match[2] + "." + (match[3] ?? "").padEnd(3, "0").slice(0, 3);
}

function normalize(rows) {
  const [header, ...body] = rows;
  if (!header) throw new Error("CSV has no header.");
  const columns = header.map((field) => field.value);
  const booleans = booleanColumns[table] ?? new Set();
  const dates = dateColumns[table] ?? new Set();

  return body.map((row) =>
    row.map((field, index) => {
      const column = columns[index];
      if (!field.quoted && field.value === "") return null;
      if (booleans.has(column)) return ["1", "t", "true"].includes(field.value.toLowerCase());
      if (dates.has(column)) return normalizeDate(field.value);
      return field.value;
    }),
  );
}

const [sourceInput, targetInput] = await Promise.all([
  readFile(sourcePath, "utf8"),
  readFile(targetPath, "utf8"),
]);
const sourceParsed = parseCsv(sourceInput);
const targetParsed = parseCsv(targetInput);
const sourceHeader = sourceParsed[0]?.map((field) => field.value);
const targetHeader = targetParsed[0]?.map((field) => field.value);

if (JSON.stringify(sourceHeader) !== JSON.stringify(targetHeader)) {
  throw new Error(table + ": source and target column headers differ.");
}

const sourceRows = normalize(sourceParsed);
const targetRows = normalize(targetParsed);

const sourceChecksum = createHash("sha256").update(JSON.stringify(sourceRows)).digest("hex");
const targetChecksum = createHash("sha256").update(JSON.stringify(targetRows)).digest("hex");

if (sourceRows.length !== targetRows.length || sourceChecksum !== targetChecksum) {
  throw new Error(table + ": canonical checksum mismatch after import.");
}

console.log(table + ": " + sourceRows.length + " rows verified.");
