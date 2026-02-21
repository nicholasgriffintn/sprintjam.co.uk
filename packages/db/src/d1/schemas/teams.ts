import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { organisations } from "./organisations";
import { users } from "./users";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organisationId: integer("organisation_id")
    .notNull()
    .references(() => organisations.id),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
