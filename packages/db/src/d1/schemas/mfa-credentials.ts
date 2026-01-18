import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const mfaCredentials = sqliteTable(
  "mfa_credentials",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    secretEncrypted: text("secret_encrypted"),
    credentialId: text("credential_id"),
    publicKey: text("public_key"),
    counter: integer("counter").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("mfa_credentials_user_type_idx").on(table.userId, table.type),
    index("mfa_credentials_credential_id_idx").on(table.credentialId),
  ],
);
