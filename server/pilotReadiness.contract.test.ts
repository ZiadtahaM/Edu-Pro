import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const records = new Map<number, { id: number; ownerId: number; title: string; status: "draft" | "in_review" | "approved" | "rejected"; notes: string | null }>();
let nextId = 1;

vi.mock("./db", () => ({
  listPilotReadinessRecords: vi.fn(async (ownerId: number) => [...records.values()].filter(record => record.ownerId === ownerId)),
  createPilotReadinessRecord: vi.fn(async (record: { ownerId: number; title: string; status: "draft"; notes: string | null }) => {
    const created = { id: nextId++, ...record };
    records.set(created.id, created);
    return created;
  }),
  updatePilotReadinessRecord: vi.fn(async (ownerId: number, id: number, values: { title: string; status: "draft" | "in_review" | "approved" | "rejected"; notes: string | null }) => {
    const current = records.get(id);
    if (!current || current.ownerId !== ownerId) return undefined;
    const updated = { ...current, ...values };
    records.set(id, updated);
    return updated;
  }),
  deletePilotReadinessRecord: vi.fn(async (ownerId: number, id: number) => {
    const current = records.get(id);
    if (current?.ownerId === ownerId) records.delete(id);
    return { success: true as const };
  }),
}));

function context(id: number): TrpcContext {
  return {
    user: { id, openId: `readiness-${id}`, email: `user${id}@example.com`, name: `User ${id}`, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

afterEach(() => {
  records.clear();
  nextId = 1;
  vi.clearAllMocks();
});

describe("Edu-Pro pilot readiness contract", () => {
  it("creates and lists records only for the authenticated owner", async () => {
    const owner = appRouter.createCaller(context(7));
    const other = appRouter.createCaller(context(8));
    await owner.pilotReadiness.create({ title: "First mentor conversation", notes: "Clarify the next question." });
    expect(await owner.pilotReadiness.list()).toHaveLength(1);
    expect(await other.pilotReadiness.list()).toHaveLength(0);
  });

  it("rejects short titles and oversized notes before persistence", async () => {
    const caller = appRouter.createCaller(context(7));
    await expect(caller.pilotReadiness.create({ title: "x" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.pilotReadiness.create({ title: "Valid title", notes: "x".repeat(4001) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("prevents cross-owner updates and supports status transitions", async () => {
    const owner = appRouter.createCaller(context(7));
    const other = appRouter.createCaller(context(8));
    const created = await owner.pilotReadiness.create({ title: "Pilot review", notes: "Invite operator review." });
    expect(await other.pilotReadiness.update({ id: created.id, title: "Hijack", status: "approved" })).toBeUndefined();
    const updated = await owner.pilotReadiness.update({ id: created.id, title: "Pilot review", status: "in_review", notes: "Ready for operator review." });
    expect(updated).toMatchObject({ ownerId: 7, status: "in_review" });
  });

  it("removes only the owner’s record", async () => {
    const owner = appRouter.createCaller(context(7));
    const other = appRouter.createCaller(context(8));
    const created = await owner.pilotReadiness.create({ title: "Delete test" });
    await other.pilotReadiness.remove({ id: created.id });
    expect(await owner.pilotReadiness.list()).toHaveLength(1);
    await owner.pilotReadiness.remove({ id: created.id });
    expect(await owner.pilotReadiness.list()).toHaveLength(0);
  });
});
