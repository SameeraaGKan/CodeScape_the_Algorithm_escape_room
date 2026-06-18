import { pgTable, text, real, timestamp, uuid, unique } from "drizzle-orm/pg-core";

// Item Response Theory (IRT) theta (skill) per player per puzzle category
export const playerSkills = pgTable(
  "player_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    category: text("category").notNull(), // "sorting" | "cipher" | "recursion" | "maze" | "data_structures"
    theta: real("theta").notNull().default(0.0), // IRT ability estimate, starts neutral
    totalAttempts: real("total_attempts").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("user_category_unique").on(table.userId, table.category)]
);
