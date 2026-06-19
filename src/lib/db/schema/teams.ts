import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

export const agentPersonalityEnum = pgEnum("agent_personality", [
  "supportive",
  "spoon_feeder",
  "supervisor",
  "friendly",
]);

export const slotTypeEnum = pgEnum("slot_type", ["human", "agent"]);

export const teamStatusEnum = pgEnum("team_status", [
  "forming",
  "ready",
  "in_game",
  "completed",
]);

export type TeamSlot = {
  slotIndex: number;
  type: "human" | "agent";
  userId?: string;
  agentPersonality?: "supportive" | "spoon_feeder" | "supervisor" | "friendly";
  displayName: string;
  joinedAt?: string;
};

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamName: text("team_name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  maxSize: integer("max_size").notNull().default(4),
  slots: jsonb("slots").$type<TeamSlot[]>().notNull().default([]),
  createdBy: text("created_by").notNull(),
  selectedPath: text("selected_path").default("cs_algorithms"),
  status: text("status").notNull().default("forming"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
