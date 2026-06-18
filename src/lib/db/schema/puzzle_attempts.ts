import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { gameSessions } from "./game_sessions";

export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  puzzleId: text("puzzle_id").notNull(),
  submittedAnswer: jsonb("submitted_answer"),
  isCorrect: boolean("is_correct").notNull().default(false),
  hintsUsed: integer("hints_used").notNull().default(0),
  timeTakenSeconds: integer("time_taken_seconds"),
  attemptNumber: integer("attempt_number").notNull().default(1),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});
