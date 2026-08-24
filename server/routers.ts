import { COOKIE_NAME } from "@shared/const";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createPilotReadinessRecord, deletePilotReadinessRecord, listPilotReadinessRecords, updatePilotReadinessRecord } from "./db";
import {
  createCategorySchema,
  createMentorSchema,
  createUserSchema,
  eduProClient,
  mentorFilterSchema,
  updateCategorySchema,
  updateMentorSchema,
  updateUserSchema,
  userFilterSchema,
} from "./eduProClient";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  users: router({
    list: adminProcedure.input(userFilterSchema).query(async ({ input }) => {
      const items = await eduProClient.listUsers(input);
      return { items, page: input.page, limit: input.limit, hasNextPage: items.length === input.limit };
    }),
    getById: protectedProcedure.input(z.object({ id: z.string().trim().min(1) })).query(async ({ input }) => eduProClient.getUser(input.id)),
    update: protectedProcedure.input(updateUserSchema.extend({ id: z.string().trim().min(1) })).mutation(({ input }) => {
      const { id, ...body } = input;
      return eduProClient.updateUser(id, body);
    }),
    assignSpecialization: protectedProcedure.input(z.object({ id: z.string().trim().min(1), categoryIds: z.array(z.string()).min(1) })).mutation(({ input }) => eduProClient.assignSpecialization(input.id, input.categoryIds)),
    remove: adminProcedure.input(z.object({ id: z.string().trim().min(1) })).mutation(({ input }) => eduProClient.removeUser(input.id)),
  }),
  mentors: router({
    list: publicProcedure.input(mentorFilterSchema).query(({ input }) => eduProClient.listMentors(input)),
    get: publicProcedure.input(z.object({ id: z.string().trim().min(1) })).query(({ input }) => eduProClient.getMentor(input.id)),
    create: adminProcedure.input(createMentorSchema).mutation(({ input }) => eduProClient.createMentor(input)),
    update: adminProcedure.input(updateMentorSchema.extend({ id: z.string().trim().min(1) })).mutation(({ input }) => {
      const { id, ...body } = input;
      return eduProClient.updateMentor(id, body);
    }),
  }),
  learningGuide: publicProcedure.input(z.object({ question: z.string().trim().min(3).max(240) })).mutation(async ({ input }) => {
    const [categories, mentors] = await Promise.all([eduProClient.listCategories(), eduProClient.listMentors({ page: 1, limit: 20 })]);
    const categoryNames = categories.filter(category => category.isActive).map(category => category.name).slice(0, 20);
    const mentorNames = mentors.filter(mentor => mentor.isActive).map(mentor => mentor.name).slice(0, 20);
    const fallback = categoryNames.length > 0
      ? `Start with ${categoryNames.slice(0, 2).join(" or ")}, then explore a mentor${mentorNames.length ? ` such as ${mentorNames[0]}` : ""}.`
      : "Start with the mentors directory and choose one conversation that matches your question.";
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are Edu-Pro's learning guide. Give one concise, warm next step grounded only in the supplied active categories and mentors. Never invent a mentor, course, credential, outcome, or availability. Return plain text in 35 words or fewer." },
          { role: "user", content: JSON.stringify({ question: input.question, activeCategories: categoryNames, activeMentors: mentorNames }) },
        ],
        max_tokens: 120,
      });
      const content = response.choices?.[0]?.message?.content;
      const answer = typeof content === "string" ? content.trim() : "";
      return { answer: answer || fallback, groundedIn: { categories: categoryNames, mentors: mentorNames } };
    } catch {
      return { answer: fallback, groundedIn: { categories: categoryNames, mentors: mentorNames }, fallback: true };
    }
  }),
  pilotReadiness: router({
    list: protectedProcedure.query(({ ctx }) => listPilotReadinessRecords(ctx.user.id)),
    create: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(160), notes: z.string().trim().max(4000).optional() })).mutation(({ ctx, input }) => createPilotReadinessRecord({ ownerId: ctx.user.id, title: input.title, notes: input.notes || null, status: "draft" })),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(2).max(160), status: z.enum(["draft", "in_review", "approved", "rejected"]), notes: z.string().trim().max(4000).optional() })).mutation(({ ctx, input }) => updatePilotReadinessRecord(ctx.user.id, input.id, { title: input.title, status: input.status, notes: input.notes || null })),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deletePilotReadinessRecord(ctx.user.id, input.id)),
  }),
  categories: router({
    list: publicProcedure.query(() => eduProClient.listCategories()),
    get: publicProcedure.input(z.object({ id: z.string().trim().min(1) })).query(({ input }) => eduProClient.getCategory(input.id)),
    create: adminProcedure.input(createCategorySchema).mutation(({ input }) => eduProClient.createCategory(input)),
    update: adminProcedure.input(updateCategorySchema.extend({ id: z.string().trim().min(1) })).mutation(({ input }) => {
      const { id, ...body } = input;
      return eduProClient.updateCategory(id, body);
    }),
  }),
});

export type AppRouter = typeof appRouter;
