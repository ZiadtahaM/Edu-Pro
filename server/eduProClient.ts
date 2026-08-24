import { z } from "zod";

const API_BASE_URL = (process.env.EDU_PRO_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 8_000;

export const userSchema = z.object({
  _id: z.string().optional(),
  fullName: z.string(),
  email: z.string().email(),
  bio: z.string().nullable().optional(),
  specializationIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const mentorSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  email: z.string().email(),
  specializations: z.array(z.string()).default([]),
  category: z.string().optional(),
  experienceYears: z.number().nonnegative().optional(),
  bio: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  isActive: z.boolean().default(true),
  mentorIds: z.array(z.string()).default([]),
});

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().email(),
  bio: z.string().optional(),
  specializationIds: z.array(z.string()).optional(),
});
export const updateUserSchema = createUserSchema.partial();
export const userFilterSchema = z.object({
  specializationId: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export const createMentorSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  specializations: z.array(z.string()).optional(),
  category: z.string().optional(),
  experienceYears: z.number().min(0).optional(),
  bio: z.string().optional(),
});
export const updateMentorSchema = createMentorSchema.partial();
export const mentorFilterSchema = z.object({ specialization: z.string().optional(), category: z.string().optional(), page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(20) });
export const createCategorySchema = z.object({
  name: z.string().trim().min(1),
  isActive: z.boolean().optional(),
  mentorIds: z.array(z.string()).optional(),
});
export const updateCategorySchema = createCategorySchema.partial();

export type User = z.infer<typeof userSchema>;
export type Mentor = z.infer<typeof mentorSchema>;
export type Category = z.infer<typeof categorySchema>;

async function request<T>(path: string, init: RequestInit = {}, schema?: z.ZodType<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new Error(typeof body?.message === "string" ? body.message : `Edu-Pro API returned ${response.status}`);
    }
    return schema ? schema.parse(body) : (body as T);
  } finally {
    clearTimeout(timeout);
  }
}

export const eduProClient = {
  listUsers: (input: z.infer<typeof userFilterSchema>) => {
    const params = new URLSearchParams({ page: String(input.page), limit: String(input.limit) });
    if (input.specializationId) params.set("specializationId", input.specializationId);
    return request<User[]>(`/users?${params}`, undefined, z.array(userSchema));
  },
  getUser: (id: string) => request(`/users/${encodeURIComponent(id)}`, undefined, userSchema),
  updateUser: (id: string, body: z.infer<typeof updateUserSchema>) => request(`/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }, userSchema),
  assignSpecialization: (id: string, categoryIds: string[]) => request(`/users/${encodeURIComponent(id)}/assign-specialization`, { method: "POST", body: JSON.stringify({ categoryIds }) }, userSchema),
  removeUser: (id: string) => request(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listMentors: (input: z.infer<typeof mentorFilterSchema>) => {
    const params = new URLSearchParams();
    if (input.specialization) params.set("specialization", input.specialization);
    if (input.category) params.set("category", input.category);
    params.set("page", String(input.page));
    params.set("limit", String(input.limit));
    return request<Mentor[]>(`/mentors${params.size ? `?${params}` : ""}`, undefined, z.array(mentorSchema));
  },
  getMentor: (id: string) => request(`/mentors/${encodeURIComponent(id)}`, undefined, mentorSchema),
  createMentor: (body: z.infer<typeof createMentorSchema>) => request("/mentors", { method: "POST", body: JSON.stringify(body) }, mentorSchema),
  updateMentor: (id: string, body: z.infer<typeof updateMentorSchema>) => request(`/mentors/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }, mentorSchema),
  listCategories: () => request<Category[]>("/categories", undefined, z.array(categorySchema)),
  getCategory: (id: string) => request(`/categories/${encodeURIComponent(id)}`, undefined, categorySchema),
  createCategory: (body: z.infer<typeof createCategorySchema>) => request("/categories", { method: "POST", body: JSON.stringify(body) }, categorySchema),
  updateCategory: (id: string, body: z.infer<typeof updateCategorySchema>) => request(`/categories/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }, categorySchema),
};
