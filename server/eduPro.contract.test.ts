import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { invokeLLM } from "./_core/llm";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import type { TrpcContext } from "./_core/context";

function context(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 7,
      openId: `contract-${role}`,
      email: `${role}@example.com`,
      name: role === "admin" ? "Admin Tester" : "User Tester",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function apiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("Edu-Pro tRPC contract", () => {
  it("returns bounded admin user pages from the REST bridge", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([{ _id: "u1", fullName: "Ada Lovelace", email: "ada@example.com", specializationIds: [], isActive: true }])));
    const result = await appRouter.createCaller(context("admin")).users.list({ page: 2, limit: 10 });
    expect(result).toMatchObject({ page: 2, limit: 10, hasNextPage: false, items: [{ fullName: "Ada Lovelace" }] });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/users?page=2&limit=10"), expect.any(Object));
  });

  it("returns mentors with specialization, category, and pagination inputs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([{ _id: "m1", name: "Grace Hopper", email: "grace@example.com", specializations: ["systems"], experienceYears: 12, isActive: true }])));
    const result = await appRouter.createCaller(context()).mentors.list({ specialization: "systems", category: "Engineering", page: 1, limit: 6 });
    expect(result[0]).toMatchObject({ name: "Grace Hopper", specializations: ["systems"] });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("category=Engineering"), expect.any(Object));
  });

  it("returns categories and validates their response shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([{ _id: "c1", name: "Systems thinking", mentorIds: [], isActive: true }])));
    const result = await appRouter.createCaller(context()).categories.list();
    expect(result).toEqual([{ _id: "c1", name: "Systems thinking", mentorIds: [], isActive: true }]);
  });

  it("surfaces REST failures as typed procedure failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse({ message: "service unavailable" }, 503)));
    await expect(appRouter.createCaller(context()).categories.list()).rejects.toThrow("service unavailable");
  });

  it("rejects mentor limits above the backend maximum", async () => {
    await expect(appRouter.createCaller(context()).mentors.list({ page: 1, limit: 101 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects empty resource IDs before a REST request is attempted", async () => {
    await expect(appRouter.createCaller(context()).categories.get({ id: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps user administration restricted to admins", async () => {
    await expect(appRouter.createCaller(context("user")).users.list({ page: 1, limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("grounds learning guidance in active categories and mentors", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("/categories")
      ? Promise.resolve(apiResponse([{ _id: "c1", name: "Systems thinking", mentorIds: ["m1"], isActive: true }]))
      : Promise.resolve(apiResponse([{ _id: "m1", name: "Grace Hopper", email: "grace@example.com", specializations: ["systems"], experienceYears: 12, isActive: true }]))));
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: "Start with Systems thinking, then meet Grace Hopper." } }] } as never);
    const result = await appRouter.createCaller(context()).learningGuide({ question: "I want to think more clearly about systems." });
    expect(result.answer).toContain("Systems thinking");
    expect(result.groundedIn).toEqual({ categories: ["Systems thinking"], mentors: ["Grace Hopper"] });
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ messages: expect.arrayContaining([expect.objectContaining({ role: "user", content: expect.stringContaining("Systems thinking") })]) }));
  });

  it("returns grounded fallback guidance when the model is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("/categories")
      ? Promise.resolve(apiResponse([{ _id: "c1", name: "Design research", mentorIds: [], isActive: true }]))
      : Promise.resolve(apiResponse([]))));
    vi.mocked(invokeLLM).mockRejectedValue(new Error("model unavailable"));
    const result = await appRouter.createCaller(context()).learningGuide({ question: "Where should I begin?" });
    expect(result.fallback).toBe(true);
    expect(result.answer).toContain("Design research");
  });

  it("rejects learning questions that are too short", async () => {
    await expect(appRouter.createCaller(context()).learningGuide({ question: "?" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
