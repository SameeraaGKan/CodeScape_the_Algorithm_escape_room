import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);
await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS game_track TEXT DEFAULT 'team'`;
console.log("✓ game_track column added");
await sql.end();
