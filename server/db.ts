import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertPilotReadinessRecord, InsertUser, pilotReadinessRecords, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
const inMemoryUsers = new Map<string, User>();
let nextUserId = 1;
const inMemoryPilotRecords = new Map<number, PilotReadinessRecord>();
let nextRecordId = 1;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    const existing = inMemoryUsers.get(user.openId);
    const updated: User = {
      id: existing ? existing.id : nextUserId++,
      openId: user.openId,
      name: user.name ?? existing?.name ?? null,
      email: user.email ?? existing?.email ?? null,
      loginMethod: user.loginMethod ?? existing?.loginMethod ?? null,
      role: (user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : existing?.role ?? "admin")) as "user" | "admin",
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date(),
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };
    inMemoryUsers.set(user.openId, updated);
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return inMemoryUsers.get(openId);
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listPilotReadinessRecords(ownerId: number) {
  const db = await getDb();
  if (!db) {
    return Array.from(inMemoryPilotRecords.values())
      .filter(r => r.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  return db.select().from(pilotReadinessRecords).where(eq(pilotReadinessRecords.ownerId, ownerId)).orderBy(desc(pilotReadinessRecords.updatedAt));
}

export async function createPilotReadinessRecord(record: InsertPilotReadinessRecord) {
  const db = await getDb();
  if (!db) {
    const id = nextRecordId++;
    const fullRecord: PilotReadinessRecord = {
      id,
      ownerId: record.ownerId,
      title: record.title,
      status: (record.status ?? "draft") as "draft" | "in_review" | "approved" | "rejected",
      notes: record.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryPilotRecords.set(id, fullRecord);
    return fullRecord;
  }
  const result = await db.insert(pilotReadinessRecords).values(record);
  return { id: Number(result[0].insertId), ...record };
}

export async function updatePilotReadinessRecord(ownerId: number, id: number, values: Pick<InsertPilotReadinessRecord, "title" | "status" | "notes">) {
  const db = await getDb();
  if (!db) {
    const record = inMemoryPilotRecords.get(id);
    if (!record || record.ownerId !== ownerId) throw new Error("Record not found");
    const updated: PilotReadinessRecord = {
      ...record,
      ...values,
      notes: values.notes !== undefined ? (values.notes ?? null) : record.notes,
      updatedAt: new Date(),
    };
    inMemoryPilotRecords.set(id, updated);
    return updated;
  }
  await db.update(pilotReadinessRecords).set(values).where(and(eq(pilotReadinessRecords.id, id), eq(pilotReadinessRecords.ownerId, ownerId)));
  const updated = await db.select().from(pilotReadinessRecords).where(and(eq(pilotReadinessRecords.id, id), eq(pilotReadinessRecords.ownerId, ownerId))).limit(1);
  return updated[0];
}

export async function deletePilotReadinessRecord(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) {
    const record = inMemoryPilotRecords.get(id);
    if (record && record.ownerId === ownerId) {
      inMemoryPilotRecords.delete(id);
    }
    return { success: true } as const;
  }
  await db.delete(pilotReadinessRecords).where(and(eq(pilotReadinessRecords.id, id), eq(pilotReadinessRecords.ownerId, ownerId)));
  return { success: true } as const;
}
