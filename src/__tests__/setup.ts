import { config } from "dotenv";
config({ path: ".env.test" });
config({ path: ".env.local" }); // fallback for vars not in .env.test
