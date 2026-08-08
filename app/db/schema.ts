import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Better Auth tables */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** App tables */
export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const filaments = pgTable("filaments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type"),
  color: text("color"),
  pricePerKg: doublePrecision("price_per_kg").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  clientId: text("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  sourceName: text("source_name"),
  printMinutes: integer("print_minutes").notNull().default(0),
  materialCost: doublePrecision("material_cost").notNull(),
  machineCost: doublePrecision("machine_cost").notNull(),
  subtotal: doublePrecision("subtotal").notNull(),
  markupAmount: doublePrecision("markup_amount").notNull(),
  total: doublePrecision("total").notNull(),
  settingsSnapshot: jsonb("settings_snapshot").notNull(),
  metadataSnapshot: jsonb("metadata_snapshot").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quotePlates = pgTable("quote_plates", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  plateIndex: integer("plate_index").notNull(),
  imagePath: text("image_path"),
  printMinutes: integer("print_minutes"),
  sliced: boolean("sliced").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
});

export const quoteFilamentLines = pgTable("quote_filament_lines", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  plateId: text("plate_id").references(() => quotePlates.id, {
    onDelete: "set null",
  }),
  inventoryFilamentId: text("inventory_filament_id").references(
    () => filaments.id,
    { onDelete: "set null" },
  ),
  label: text("label").notNull(),
  grams: doublePrecision("grams").notNull(),
  pricePerKg: doublePrecision("price_per_kg").notNull(),
  slot: integer("slot"),
  type: text("type"),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(user, { fields: [clients.userId], references: [user.id] }),
  projects: many(projects),
  quotes: many(quotes),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  quotes: many(quotes),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  user: one(user, { fields: [quotes.userId], references: [user.id] }),
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
  plates: many(quotePlates),
  filamentLines: many(quoteFilamentLines),
}));

export const quotePlatesRelations = relations(quotePlates, ({ one, many }) => ({
  quote: one(quotes, {
    fields: [quotePlates.quoteId],
    references: [quotes.id],
  }),
  filamentLines: many(quoteFilamentLines),
}));

export const quoteFilamentLinesRelations = relations(
  quoteFilamentLines,
  ({ one }) => ({
    quote: one(quotes, {
      fields: [quoteFilamentLines.quoteId],
      references: [quotes.id],
    }),
    plate: one(quotePlates, {
      fields: [quoteFilamentLines.plateId],
      references: [quotePlates.id],
    }),
  }),
);

export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Filament = typeof filaments.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuotePlate = typeof quotePlates.$inferSelect;
export type QuoteFilamentLine = typeof quoteFilamentLines.$inferSelect;
