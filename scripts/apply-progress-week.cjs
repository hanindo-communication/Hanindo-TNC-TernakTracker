/**
 * Menambah kolom public.creator_targets.progress_week (smallint) + constraint + NOTIFY pgrst.
 * Koneksi (salah satu):
 *   - DATABASE_URL atau DIRECT_URL di .env.local, atau
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD (password DB, bukan anon/secret API).
 * Usage: npm run db:apply-progress-week
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function stripLineComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

/** @param {Record<string, string>} fromFile */
function resolveDatabaseUrl(fromFile) {
  const direct =
    process.env.DATABASE_URL ||
    fromFile.DATABASE_URL ||
    process.env.DIRECT_URL ||
    fromFile.DIRECT_URL;
  if (direct?.trim()) return direct.trim();

  const base = fromFile.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const pwd = fromFile.SUPABASE_DB_PASSWORD?.trim();
  if (!base || !pwd) return null;
  const ref = base.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  if (!ref) return null;
  return `postgresql://postgres.${ref}:${encodeURIComponent(pwd)}@db.${ref}.supabase.co:5432/postgres`;
}

async function main() {
  const fromFile = loadEnvLocal();
  const url = resolveDatabaseUrl(fromFile);
  if (!url) {
    console.error(
      "Koneksi Postgres tidak ditemukan. Tambahkan di .env.local salah satu:\n" +
        "  DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres\n" +
        "atau (lebih ringkas) password database saja:\n" +
        "  SUPABASE_DB_PASSWORD=...   # Supabase → Settings → Database → Database password\n" +
        "(NEXT_PUBLIC_SUPABASE_URL sudah dipakai untuk menyusun host.)",
    );
    process.exit(1);
  }

  const sqlPath = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "014_creator_targets_progress_week.sql",
  );
  let sql = fs.readFileSync(sqlPath, "utf8");
  sql = stripLineComments(sql);
  const parts = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const chunk of parts) {
      const q = chunk.endsWith(";") ? chunk : `${chunk};`;
      await client.query(q);
    }
  } finally {
    await client.end();
  }
  console.log(
    "Selesai: creator_targets.progress_week + NOTIFY pgrst (reload schema). Refresh dashboard.",
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
