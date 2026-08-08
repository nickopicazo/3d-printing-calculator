import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/api.customers";
import { db } from "~/db/index.server";
import { customers } from "~/db/schema";
import { newId, requireUser } from "~/lib/session.server";

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  if (request.method !== "POST" && request.method !== "PUT") {
    throw data({ error: "Method not allowed" }, { status: 405 });
  }

  const body = (await request.json()) as {
    id?: string | null;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };

  const name = (body.name ?? "").trim();
  if (!name) throw data({ error: "Customer name is required." }, { status: 400 });

  const email = (body.email ?? "").trim() || null;
  const phone = (body.phone ?? "").trim() || null;
  const address = (body.address ?? "").trim() || null;

  if (body.id) {
    const [owned] = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, body.id), eq(customers.userId, session.user.id)),
      )
      .limit(1);
    if (!owned) throw data({ error: "Customer not found." }, { status: 404 });

    await db
      .update(customers)
      .set({ name, email, phone, address, updatedAt: new Date() })
      .where(eq(customers.id, body.id));

    return data({
      id: body.id,
      name,
      email,
      phone,
      address,
    });
  }

  const id = newId();
  await db.insert(customers).values({
    id,
    userId: session.user.id,
    name,
    email,
    phone,
    address,
  });

  return data({ id, name, email, phone, address });
}
