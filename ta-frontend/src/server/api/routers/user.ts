import { z } from "zod";

import { db } from "../../db/prisma";
import { createTRPCRouter, protectedAdminProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  get: protectedAdminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return db.user.findUnique({ where: { id: input.userId } });
    }),
});

export type UserRouter = typeof userRouter;
