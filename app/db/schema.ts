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
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const materials = pgTable("materials", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("filament"), // filament | resin
  type: text("type"),
  color: text("color"),
  /** Price per kg (filament) or per litre (resin) */
  pricePerUnit: doublePrecision("price_per_unit").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const prints = pgTable("prints", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  technology: text("technology").notNull().default("fdm"), // fdm | sla
  printerName: text("printer_name"),
  sourceName: text("source_name"),
  printMinutes: integer("print_minutes").notNull().default(0),
  laborMinutes: integer("labor_minutes").notNull().default(0),
  postProcessMinutes: integer("post_process_minutes").notNull().default(0),
  addonsCost: doublePrecision("addons_cost").notNull().default(0),
  materialCost: doublePrecision("material_cost").notNull().default(0),
  electricityCost: doublePrecision("electricity_cost").notNull().default(0),
  laborCost: doublePrecision("labor_cost").notNull().default(0),
  postProcessCost: doublePrecision("post_process_cost").notNull().default(0),
  machineCost: doublePrecision("machine_cost").notNull().default(0),
  consumablesCost: doublePrecision("consumables_cost").notNull().default(0),
  landed: doublePrecision("landed").notNull().default(0),
  failureUplift: doublePrecision("failure_uplift").notNull().default(0),
  markupAmount: doublePrecision("markup_amount").notNull().default(0),
  preVat: doublePrecision("pre_vat").notNull().default(0),
  vatAmount: doublePrecision("vat_amount").notNull().default(0),
  total: doublePrecision("total").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  metadataSnapshot: jsonb("metadata_snapshot").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const printAddons = pgTable("print_addons", {
  id: text("id").primaryKey(),
  printId: text("print_id")
    .notNull()
    .references(() => prints.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  quantity: doublePrecision("quantity").notNull().default(1),
  unitCost: doublePrecision("unit_cost").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const printMaterials = pgTable("print_materials", {
  id: text("id").primaryKey(),
  printId: text("print_id")
    .notNull()
    .references(() => prints.id, { onDelete: "cascade" }),
  inventoryMaterialId: text("inventory_material_id").references(
    () => materials.id,
    { onDelete: "set null" },
  ),
  label: text("label").notNull(),
  unit: text("unit").notNull().default("g"), // g | ml
  quantity: doublePrecision("quantity").notNull(),
  pricePerUnit: doublePrecision("price_per_unit").notNull(),
  slot: integer("slot"),
  type: text("type"),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const printPlates = pgTable("print_plates", {
  id: text("id").primaryKey(),
  printId: text("print_id")
    .notNull()
    .references(() => prints.id, { onDelete: "cascade" }),
  plateIndex: integer("plate_index").notNull(),
  imagePath: text("image_path"),
  printMinutes: integer("print_minutes"),
  sliced: boolean("sliced").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
});

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  materialCost: doublePrecision("material_cost").notNull().default(0),
  electricityCost: doublePrecision("electricity_cost").notNull().default(0),
  laborCost: doublePrecision("labor_cost").notNull().default(0),
  machineCost: doublePrecision("machine_cost").notNull().default(0),
  addonsCost: doublePrecision("addons_cost").notNull().default(0),
  consumablesCost: doublePrecision("consumables_cost").notNull().default(0),
  landed: doublePrecision("landed").notNull().default(0),
  failureUplift: doublePrecision("failure_uplift").notNull().default(0),
  markupAmount: doublePrecision("markup_amount").notNull().default(0),
  preVat: doublePrecision("pre_vat").notNull().default(0),
  vatAmount: doublePrecision("vat_amount").notNull().default(0),
  vatRate: doublePrecision("vat_rate").notNull().default(0),
  total: doublePrecision("total").notNull().default(0),
  printMinutes: integer("print_minutes").notNull().default(0),
  settingsSnapshot: jsonb("settings_snapshot").notNull().default({}),
  printsSnapshot: jsonb("prints_snapshot").notNull().default([]),
  customerSnapshot: jsonb("customer_snapshot").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(user, { fields: [customers.userId], references: [user.id] }),
  projects: many(projects),
  quotes: many(quotes),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
  user: one(user, { fields: [projects.userId], references: [user.id] }),
  prints: many(prints),
  quotes: many(quotes),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  user: one(user, { fields: [materials.userId], references: [user.id] }),
}));

export const printsRelations = relations(prints, ({ one, many }) => ({
  project: one(projects, {
    fields: [prints.projectId],
    references: [projects.id],
  }),
  materials: many(printMaterials),
  addons: many(printAddons),
  plates: many(printPlates),
}));

export const printMaterialsRelations = relations(printMaterials, ({ one }) => ({
  print: one(prints, {
    fields: [printMaterials.printId],
    references: [prints.id],
  }),
  inventory: one(materials, {
    fields: [printMaterials.inventoryMaterialId],
    references: [materials.id],
  }),
}));

export const printAddonsRelations = relations(printAddons, ({ one }) => ({
  print: one(prints, {
    fields: [printAddons.printId],
    references: [prints.id],
  }),
}));

export const printPlatesRelations = relations(printPlates, ({ one }) => ({
  print: one(prints, {
    fields: [printPlates.printId],
    references: [prints.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  user: one(user, { fields: [quotes.userId], references: [user.id] }),
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
}));

/** Public shareable calculation snapshots (guest-friendly). */
export const shares = pgTable("shares", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export type Customer = typeof customers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Print = typeof prints.$inferSelect;
export type PrintMaterial = typeof printMaterials.$inferSelect;
export type PrintAddon = typeof printAddons.$inferSelect;
export type PrintPlate = typeof printPlates.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Share = typeof shares.$inferSelect;

/** Legacy aliases during migration of call sites */
export type Client = Customer;
export type Filament = Material;
