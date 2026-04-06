import "dotenv/config";
import postgres from "postgres";
import fs from "fs";

const sqlText = fs.readFileSync("./drizzle/0005_fulfill_order_function.sql", "utf8");
const pg = postgres(process.env.DATABASE_URL!);

async function main() {
  await pg.unsafe(sqlText);
  console.log("✅ fulfill_order function created");
  await pg.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
