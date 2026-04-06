import "dotenv/config";
import postgres from "postgres";
import fs from "fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx scripts/apply-function.ts <sql-file>");
  process.exit(1);
}

const sqlText = fs.readFileSync(file, "utf8");
const pg = postgres(process.env.DATABASE_URL!);

async function main() {
  await pg.unsafe(sqlText);
  console.log(`✅ Applied ${file}`);
  await pg.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
