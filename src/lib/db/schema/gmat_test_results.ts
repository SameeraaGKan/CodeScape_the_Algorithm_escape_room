import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { gameSessions } from "./game_sessions";

export const gmatTestResults = pgTable("gmat_test_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: uuid("session_id").references(() => gameSessions.id, { onDelete: "set null" }),
  pathId: text("path_id").notNull(),
  testNum: integer("test_num"),
  totalScore: integer("total_score").notNull(),
  sectionScores: jsonb("section_scores").notNull(),
  wrongAnswers: jsonb("wrong_answers").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});
