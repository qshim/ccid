// Live hiring data: fetched fresh from the Google Sheet "hiring" tab on every request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHEET_ID = "1ZpzuJgyIkteZuwL942ZlP7RZ-rFK3xzfZIFagthwMBg";

function csvParse(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      if (text[i + 1] === "\n") i += 2;
      else i += 1;
      pushField();
      pushRow();
      continue;
    }
    if (c === "\n") {
      i += 1;
      pushField();
      pushRow();
      continue;
    }
    field += c;
    i += 1;
  }

  pushField();
  if (!(row.length === 1 && row[0] === "" && rows.length > 0)) pushRow();
  while (rows.length > 0 && rows[rows.length - 1].every((x) => x === "")) {
    rows.pop();
  }
  return rows;
}

export async function GET() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=hiring`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const csv = await res.text();
    const rows = csvParse(csv).filter(
      (r) => Array.isArray(r) && (r[0] || "").trim()
    );
    return Response.json(
      { rows },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    // On failure, return empty so the client can fall back to static data.
    return Response.json(
      { rows: [], error: String(err) },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
