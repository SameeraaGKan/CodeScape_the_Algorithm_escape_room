import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { teams } from "./teams";

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id"), // Supabase auth user ID of the session creator
  roomCode: text("room_code").notNull().unique(),
  puzzleSetId: text("puzzle_set_id").notNull().default("default_set"),
  currentPuzzleIndex: integer("current_puzzle_index").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
