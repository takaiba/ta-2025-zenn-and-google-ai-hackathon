import { accountRouter } from "./routers/account";
import { authRouter } from "./routers/auth";
import { bugTicketRouter } from "./routers/bugTicket";
import { cronjobRouter } from "./routers/cronjob";
import { integrationRouter } from "./routers/integration";
import { organizationRouter } from "./routers/organization";
import { projectRouter } from "./routers/project";
import { testConfigRouter } from "./routers/testConfig";
import { testExecutionRouter } from "./routers/testExecution";
import { testReportRouter } from "./routers/testReport";
import { testResultRouter } from "./routers/testResult";
import { testSessionRouter } from "./routers/testSession";
import { userRouter } from "./routers/user";
import { jobQueueRouter } from "./routers/jobQueue";
import { createCallerFactory, createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // Authentication & User Management
  auth: authRouter,
  user: userRouter,
  account: accountRouter,

  // QA³ Core Features
  organization: organizationRouter,
  project: projectRouter,
  testSession: testSessionRouter,
  testConfig: testConfigRouter,
  testExecution: testExecutionRouter,
  testResult: testResultRouter,
  bugTicket: bugTicketRouter,
  testReport: testReportRouter,
  integration: integrationRouter,

  // System Management
  cronjob: cronjobRouter,
  jobQueue: jobQueueRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
