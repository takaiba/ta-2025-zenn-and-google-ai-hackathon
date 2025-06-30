import { createTRPCRouter, publicProcedure, protectedUserProcedure } from "../trpc";
import { z } from "zod";

export const cronjobRouter = createTRPCRouter({
  createDefaultAdmin: publicProcedure.query(async ({ ctx }) => {
    const organizationId = process.env.DEFAULT_ORGANIZATION_ID || process.env.DEFAULT_TENANT_ID;
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;

    if (!organizationId) {
      throw Error("デフォルトの組織IDが見つかりません");
    }
    if (!adminEmail) {
      throw Error("デフォルトの管理者アドレスが見つかりません");
    }

    // デフォルト組織を作成
    await ctx.db.organization.upsert({
      where: { id: organizationId },
      create: {
        id: organizationId,
        name: "デフォルト組織",
        apiKey: `org-${organizationId}-${Date.now()}`,
      },
      update: {
        name: "デフォルト組織",
      },
    });

    // デフォルト管理者アカウントを作成
    await ctx.db.account.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: adminEmail,
        role: "admin",
        organizationId,
      },
      update: {
        name: adminEmail,
        role: "admin",
        organizationId,
      },
    });

    console.log("デフォルトの管理者アカウントおよび組織を作成しました");
    return { success: true, message: "デフォルトの管理者アカウントおよび組織を作成しました" };
  }),

  // createDefaultDifyAppsは削除（QA3では不要）

  // テスト用のサンプルデータを作成
  createSampleTestSession: protectedUserProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true, organizationId: true }
      });

      if (!account) {
        throw new Error("アカウントが見つかりません");
      }

      // プロジェクトの確認
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: account.organizationId
        }
      });

      if (!project) {
        throw new Error("プロジェクトが見つかりません");
      }

      // デフォルトのテスト設定を取得または作成
      let testConfig = await ctx.db.testConfig.findFirst({
        where: {
          projectId: input.projectId,
          isDefault: true
        }
      });

      if (!testConfig) {
        testConfig = await ctx.db.testConfig.create({
          data: {
            projectId: input.projectId,
            name: "デフォルト設定",
            mode: "omakase",
            browser: "chrome",
            viewportWidth: 1920,
            viewportHeight: 1080,
            maxDuration: 3600,
            excludedPaths: [],
            isDefault: true
          }
        });
      }

      // テストセッションを作成
      const testSession = await ctx.db.testSession.create({
        data: {
          projectId: input.projectId,
          testConfigId: testConfig.id,
          accountId: account.id,
          status: "completed",
          startedAt: new Date(Date.now() - 3600000), // 1時間前
          completedAt: new Date(Date.now() - 1800000), // 30分前
          duration: 1800, // 30分
          pagesScanned: 10,
          bugsFound: 2,
          testCoverage: 85.5
        }
      });

      // サンプルのテスト結果を作成
      await ctx.db.testResult.createMany({
        data: [
          {
            testSessionId: testSession.id,
            url: `${project.url}/`,
            status: "passed",
            executionTime: 5000
          },
          {
            testSessionId: testSession.id,
            url: `${project.url}/about`,
            status: "passed",
            executionTime: 3000
          },
          {
            testSessionId: testSession.id,
            url: `${project.url}/contact`,
            status: "failed",
            executionTime: 4000
          }
        ]
      });

      // サンプルのバグチケットを作成
      await ctx.db.bugTicket.create({
        data: {
          projectId: input.projectId,
          testSessionId: testSession.id,
          reportedById: account.id,
          title: "お問い合わせフォームの送信ボタンが機能しない",
          description: "お問い合わせページで、すべての必須項目を入力しても送信ボタンがクリックできない状態です。",
          severity: "high",
          status: "open",
          bugType: "functional",
          affectedUrl: `${project.url}/contact`,
          reproductionSteps: ["お問い合わせページにアクセス", "すべての必須項目を入力", "送信ボタンをクリック"],
          expectedBehavior: "送信ボタンがクリックでき、フォームが送信される",
          actualBehavior: "送信ボタンがdisabled状態のまま",
          affectedComponents: ["ContactForm", "SubmitButton"],
          aiConfidenceScore: 0.92
        }
      });

      return {
        success: true,
        testSessionId: testSession.id,
        message: "サンプルテストセッションを作成しました"
      };
    })
});

export type CronjobRouter = typeof cronjobRouter;