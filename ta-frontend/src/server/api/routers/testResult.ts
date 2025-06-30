import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const testResultRouter = createTRPCRouter({
  getAllBySession: protectedUserProcedure
    .input(
      z.object({
        sessionId: z.string(),
        status: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        testSessionId: input.sessionId,
        ...(input.status && { status: input.status }),
      };

      const [results, total] = await Promise.all([
        ctx.db.testResult.findMany({
          where,
          include: {
            _count: {
              select: { bugTickets: true }
            }
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.testResult.count({ where }),
      ]);

      return {
        results,
        total,
        hasMore: total > input.offset + input.limit,
      };
    }),

  create: protectedUserProcedure
    .input(
      z.object({
        testSessionId: z.string(),
        url: z.string(),
        status: z.enum(["passed", "failed", "skipped"]),
        executionTime: z.number().int().min(0).default(0),
        screenshot: z.string().optional(),
        domSnapshot: z.string().optional(),
        consoleLogs: z.any().optional(),
        networkLogs: z.any().optional(),
        userActions: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.testResult.create({
        data: {
          testSessionId: input.testSessionId,
          url: input.url,
          status: input.status,
          executionTime: input.executionTime,
          ...(input.screenshot && { screenshot: input.screenshot }),
          ...(input.domSnapshot && { domSnapshot: input.domSnapshot }),
          ...(input.consoleLogs && { consoleLogs: input.consoleLogs }),
          ...(input.networkLogs && { networkLogs: input.networkLogs }),
          ...(input.userActions && { userActions: input.userActions }),
        },
      });
    }),

  update: protectedUserProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["passed", "failed", "skipped"]).optional(),
        executionTime: z.number().optional(),
        screenshot: z.string().optional(),
        domSnapshot: z.string().optional(),
        consoleLogs: z.any().optional(),
        networkLogs: z.any().optional(),
        userActions: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      return ctx.db.testResult.update({
        where: { id },
        data: {
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.executionTime !== undefined && { executionTime: updateData.executionTime }),
          ...(updateData.screenshot !== undefined && { screenshot: updateData.screenshot }),
          ...(updateData.domSnapshot !== undefined && { domSnapshot: updateData.domSnapshot }),
          ...(updateData.consoleLogs !== undefined && { consoleLogs: updateData.consoleLogs }),
          ...(updateData.networkLogs !== undefined && { networkLogs: updateData.networkLogs }),
          ...(updateData.userActions !== undefined && { userActions: updateData.userActions }),
        },
      });
    }),
});

export type TestResultRouter = typeof testResultRouter;