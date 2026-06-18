import dns from "dns";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase direct connections resolve to IPv6 on Windows which then times out.
// Force IPv4 so the TCP connection actually reaches the database.
dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, { prepare: false, ssl: "require" });

export const db = drizzle(client, { schema });
export * from "./schema";
