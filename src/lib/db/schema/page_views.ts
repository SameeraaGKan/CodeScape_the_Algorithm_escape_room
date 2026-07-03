import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const pageViews = pgTable("page_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  path: text("path").notNull(),
  visitorId: text("visitor_id").notNull(), // anonymous cookie id — lets us count unique visitors, not just views
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
