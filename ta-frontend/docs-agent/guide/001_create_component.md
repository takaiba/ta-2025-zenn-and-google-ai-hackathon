## コンポーネント実装ガイド

### 1. はじめに

このドキュメントは、Next.js (App Router) 環境において、一貫性のある効率的なコンポーネント実装を行うためのガイドラインです。記載されたパターンと判断基準に従って、コンポーネントのファイル構成と実装方法を決定してください。

**基本設計方針:** Container/Presentation パターンを採用し、Server Component と Client Component の責務を分離します。

### 2. 実装パターンの選択フロー

以下のフローに従って、実装するコンポーネントに最適なパターンを選択してください。

**Step 1: データ取得（Read）の要件を確認する**

コンポーネントがサーバーサイドからデータを取得する必要があるか、また、そのデータに定期的な自動更新（ポーリング）が必要かを判断します。

- **A. データ取得が不要な場合:**
  - 主に UI 表示とクライアントサイドのインタラクションのみを担当します。
  - パターン 1: UIコンポーネント に進みます。
- **B. データ取得が必要で、ポーリングが不要な場合:**
  - サーバーサイドで一度データを取得し、表示します。
  - パターン 2: データ表示コンポーネント (静的) に進みます。
- **C. データ取得が必要で、ポーリングが必要な場合:**
  - **注意:** ポーリングはサーバー負荷を考慮し、**真に必要な場合に限定**してください。
  - サーバーサイドでデータを取得・表示し、定期的に自動更新します。
  - パターン 3: データ表示コンポーネント (ポーリング) に進みます。

**Step 2: データ操作（Create, Update, Delete）の要件を確認する**

Step 1 で選択したパターンをベースに、データの作成・更新・削除 (CUD) が必要かを判断します。必要な場合、さらに**データ操作の結果に基づいた副作用**が必要かどうか、そして `<form>` 要素を使用するかどうかを判断します。データ操作が必要な場合は、**必ず `actions.ts` (Server Actions) を使用**します。

ここで言う **副作用** とは、主に **データ操作後にサーバーから最新のデータを再取得し、その結果をクライアントの状態 (State) に反映させること** を指します。例えば、アイテムを削除した後に最新のアイテム一覧を再表示する場合などです。
操作の **実行中の状態（ローディング表示）** は、副作用の有無に関わらず `useTransition` または `useActionState` で管理できます。

- **D. データ操作が不要な場合:**
  - Step 1 で選択したパターンのまま実装を完了します。
- **E. データ操作が必要な場合:**
  - **E-1. 副作用が不要な場合:**
    - データ操作を実行するだけで、操作後のデータ再取得やそれに基づく状態更新が不要な場合。（ローディング表示は行う場合があります）
    - **`<form>` 要素を使用しない:**
      - パターン 4: データ操作 (フォームなし、副作用不要) を選択し、`actions.ts` を追加し、主にローディング状態管理のために `useTransition` を使用します。
    - **`<form>` 要素を使用する:**
      - パターン 5: データ操作 (フォームあり) を選択し、`actions.ts`, `schema.ts` を追加し、Conform と、主にローディング状態管理のために `useTransition` を使用します。
  - **E-2. 副作用が必要な場合:**
    - データ操作の結果（成功/失敗、更新されたデータなど）を状態として保持し、データ再取得のトリガーにするなど、UIに反映させたい場合。
    - **`<form>` 要素を使用しない:**
      - パターン 6: データ操作 (フォームなし、副作用あり) を選択し、`actions.ts` を追加し、結果状態の管理と副作用実行のために `useActionState` を使用します。
    - **`<form>` 要素を使用する:**
      - パターン 7: データ操作 (フォームあり) を選択し、`actions.ts`, `schema.ts` を追加し、Conform と、サーバーサイドバリデーション結果や操作結果の反映のために `useActionState` を使用します。

### 3. 詳細パターン解説

#### パターン 1: データ取得なし

- **判断基準:** サーバーサイドのデータ取得が不要。
- **ファイル構成:**
  - `presentation.tsx` (Client Component)
  - `index.ts`
- **技術要素:** Client Component (状態管理 `useState`, イベントハンドラなど)
- **用途:** ボタン、インプット、ダイアログ、静的な表示要素など。
- **コード例:**

```typescript
// presentation.tsx
"use client";
import { FC, useState } from "react";

// ... (Props定義)

export const SimpleCounterButtonPresentation: FC<Props> = (props) => {
  /* ... */
};

// index.ts
export { SimpleCounterButtonPresentation as SimpleCounterButton } from "./presentation";
```

#### パターン 2: データ取得あり(静的なデータ表示)

- **判断基準:** データ取得あり、ポーリングなし。(**原則このパターンを使用**)
- **ファイル構成:**
  - `container.tsx` (Server Component)
  - `presentation.tsx` (Client Component)
  - `index.ts`
- **技術要素:** Server Component (tRPC クライアント `@/server/api` でデータ取得)、Client Component (データ表示)
- **用途:** マスタデータ一覧、ユーザープロファイル表示など、ページ表示時にデータが決まるもの。
- **コード例:**

```typescript
// container.tsx
"use server"; // または暗黙的にServer Component
import { api } from "@/server/api";
import { SomeComponentPresentation } from "./presentation";
import { type User } from "@/server/db/schema";

type Props = { /* ... */ };

export const SomeComponentContainer<Props> = async (props) => {
  const user = await api.user.get();
  return <SomeComponentPresentation user={user} />;
};

// presentation.tsx
"use client";
import { FC } from "react";
import { type User } from "@/server/db/schema";

type Props = { user: User | null };

export const SomeComponentPresentation: FC<Props> = (props) => { /* ... */ };

// index.ts
export { SomeComponentContainer as SomeComponent } from "./container";
```

#### パターン 3: データ取得あり (ポーリングされたデータ表示)

- **判断基準:** データ取得あり、**定期的な自動更新 (ポーリング) が必須**の場合 (**限定的な使用**)。
- **ファイル構成:**
  - `container.tsx` (Server Component, 初期データプリフェッチ)
  - `presentation.tsx` (Client Component)
  - `index.ts`
- **技術要素:** Server Component (`@/server/api` の `prefetch` メソッドで初期データ取得)、Client Component (`useQuery` + `@/trpc/react` でデータ取得・ポーリング `refetchInterval`)
- **用途:** リアルタイムチャット表示、監視ダッシュボードなど。
- **コード例:**

```typescript
// container.tsx
"use server";
import { api } from "@/server/api"; // API定義
import { RealtimeChatMessagesPresentation } from "./presentation";

type Props = { /* ... */ };

export const RealtimeChatMessagesContainer: FC<Props> = async (props) => {
  // @/server/api の prefetch メソッドを直接呼び出す
  await api.chat.getMessages.prefetch({ limit: 20 });

  return <RealtimeChatMessagesPresentation />;
};

// presentation.tsx
"use client";
import { FC } from "react";
import { api } from "@/trpc/react";

type Props = { /* ... */ };

export const RealtimeChatMessagesPresentation: FC<Props> = (props) => {
  // api オブジェクトから直接 useQuery を呼び出す
  const { data: messages, isLoading, error } = api.chat.getMessages.useQuery(
    { limit: 20 },
    {
      refetchInterval: 5000, // ポーリング間隔 (慎重に設定)
    }
  );
  // ... (UI表示)
};

// index.ts
export { RealtimeChatMessagesContainer as RealtimeChatMessages } from "./container";
```

#### パターン 4: データ操作 (フォームなし、副作用不要)

- **判断基準:** データ操作あり、`<form>` なし、データ操作後のデータ再取得やそれに基づく状態更新は不要だが、**実行中の状態（ローディング）は表示したい**場合。
- **ファイル構成:** Step 1 で選択したパターン + `actions.ts` (`"use server"`)
- **技術要素:** Server Actions, `useTransition` (Presentation で**ローディング状態**管理), `revalidatePath` / `revalidateTag` でキャッシュ更新。
- **用途:** 一覧画面の単純な削除ボタンなど (実行中はローディング表示し、完了したらトースト通知を出す程度。操作結果に応じた複雑なUI更新は行わない)。
  分析用ログ送信など、UIに影響を与えない処理。
- **コード例:**

```typescript
// actions.ts
"use server";
import { api } from "@/server/api";
import { z } from "zod";

const analyticsEventSchema = z.object({
  eventName: z.string(),
  data: z.record(z.any()).optional(),
  userId: z.string().optional(),
});

export const sendAnalyticsEvent = async (params: {
  eventName: string;
  data?: Record<string, any>;
  userId?: string;
}) => {
  // バリデーション (任意)
  const validatedParams = analyticsEventSchema.safeParse(params);
  if (!validatedParams.success) {
    console.error("Invalid analytics event parameters:", validatedParams.error);
    return;
  }

  try {
    await api.analytics.logEvent({
      eventName: validatedParams.data.eventName,
      eventData: validatedParams.data.data || {},
      userId: validatedParams.data.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics event error:", error);
  }
};

// presentation.tsx
"use client";
import { FC, useTransition } from "react";
import { Button } from "@/app/_components/common/Button";
import { sendAnalyticsEvent } from "./actions";

type Props = {
  buttonLabel: string;
  eventName: string;
  extraData?: Record<string, any>;
};

export const AnalyticsButtonPresentation: FC<Props> = (props) => {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // ユーザー操作があった時に分析イベントを送信
    startTransition(async () => {
      try {
        // Server Action を呼び出し（UIには影響しない）
        await sendAnalyticsEvent({
          eventName: props.eventName,
          data: props.extraData
        });
        // 成功時も特にUI変更なし（必要に応じてログのみ）
        console.log(`Analytics event '${props.eventName}' sent successfully`);
      } catch (error) {
        // エラー時も静かに失敗（デバッグ時のみログ出力）
        console.error("Failed to send analytics event:", error);
      }
    });
  };

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {props.buttonLabel}
    </Button>
  );
};

// index.ts (例: Presentationのみの場合)
export { AnalyticsButtonPresentation as AnalyticsButton } from "./presentation";
export { PageViewTracker } from "./presentation";
```

#### パターン 5: データ操作 (フォームあり、副作用不要)

- **判断基準:** データ操作あり、`<form>` 要素を使用。サーバーサイドバリデーション結果や操作結果の詳細なフィードバックをフォームに直接反映する必要はなく、**フォーム送信中のローディング表示のみが必要**な場合。
- **ファイル構成:** Step 1 で選択したパターン + `actions.ts` (`"use server"`), `schema.ts`
- **技術要素:** Server Actions, Zod (`schema.ts`), Conform (`presentation.tsx` でフォーム状態管理), **`useTransition` (ローディング管理)**
- **用途:** ユーザー入力のあるフォームで、送信中のローディング表示のみが必要な場合。成功/失敗のフィードバックはトースト通知程度で行う。
- **コード例:**

```typescript
// schema.ts
import { z } from "zod";
export const tenantSchema = z.object({
  id: z.string().optional(), // 更新用に optional
  name: z.string().min(1, "テナント名は必須です。"),
});
export type TenantSchema = z.infer<typeof tenantSchema>;

// actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { parseWithZod } from "@conform-to/zod"; // getZodConstraint は不要な場合も
import { tenantSchema } from "./schema";
import { api } from "@/server/api";

export const upsertTenantSimple = async (formData: FormData, tenantId?: string) => {
  const submission = parseWithZod(formData, { schema: tenantSchema });

  if (submission.status !== "success") {
    throw new Error("入力内容に誤りがあります。");
  }

  try {
    const { name } = submission.value;
    if (tenantId) {
      await api.tenant.update({ where: { id: tenantId }, data: { name } });
    } else {
      await api.tenant.create({ data: { name } });
    }
    revalidatePath("/tenants"); // 関係するパスを再検証
    return { success: true };
  } catch (error) {
    console.error("Upsert tenant error:", error);
    throw new Error("保存中にサーバーエラーが発生しました。");
  }
};

// presentation.tsx
"use client";
import { FC, useTransition } from "react";
import { useForm, conform, getFormProps } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { tenantSchema, type TenantSchema } from "./schema";
import { upsertTenantSimple } from "./actions";
import { Input } from "@/app/_components/common/Input";
import { Button } from "@/app/_components/common/Button";
import { toast } from "sonner";
import { InputElementContainer } from "@/app/_components/common/InputElementContainer";

type Props = { initialData?: Partial<TenantSchema> & { id?: string } };

export const TenantFormSimplePresentation: FC<Props> = (props) => {
  const [isPending, startTransition] = useTransition();

  const [form, fields] = useForm<TenantSchema>({
    constraint: getZodConstraint(tenantSchema),
    onValidate: ({ formData }) => {
      return parseWithZod(formData, { schema: tenantSchema });
    },
    defaultValue: { name: props.initialData?.name },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit: (event, { formData }) => {
      event.preventDefault();

      startTransition(async () => {
        try {
          await upsertTenantSimple(formData, props.initialData?.id);
          toast.success(props.initialData?.id ? "更新しました。" : "作成しました。");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "保存に失敗しました。");
        }
      });
    },
  });

  return (
    <form {...getFormProps(form)}>
      <InputElementContainer
        label={"テナント名:"}
        errorMessage={fields.name.errors?.[0]}
      >
        <Input {...conform.input(fields.name)} key={fields.name.key} />
      </InputElementContainer>
      <Button type="submit" disabled={isPending}>
        {isPending ? "送信中..." : (props.initialData?.id ? "更新" : "作成")}
      </Button>
    </form>
  );
};

// index.ts (例: Presentationのみの場合)
export { TenantFormSimplePresentation as TenantFormSimple } from "./presentation";
```

#### パターン 6: データ操作 (フォームなし、副作用あり)

- **判断基準:** データ操作あり、`<form>` なし、データ操作の**結果（成功/失敗、サーバーからのメッセージ、更新後のデータ等）を状態として保持**し、それに基づいてUIの更新（例: 成功時にデータを再取得して表示を更新するなど）を行いたい場合。
- **ファイル構成:** Step 1 で選択したパターン + `actions.ts` (`"use server"`)
- **技術要素:** Server Actions, `useActionState` (Presentation で **結果状態** とロード中状態を管理し、副作用をトリガーする)
- **用途:** ステータス更新ボタン（更新後のステータスを state で受け取り表示）、削除ボタン（削除成功後に一覧データを再取得して state を更新）など。
- **コード例:**

```typescript
// actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/server/api";

// アイテムデータの一覧を取得するServer Action
export const getItemList = async () => {
  try {
    // APIからデータを取得
    const data = await api.item.getAll({
      orderBy: { createdAt: "desc" },
    });

    return data;
  } catch (error) {
    console.error("データ取得エラー:", error);
    // エラー時は空のデータを返す
    return [];
  }
};

// 選択されたアイテムを一括削除するServer Action
export const deleteItemsBulk = async (itemIds: string[]) => {
  if (itemIds.length === 0) return;

  try {
    // 選択された全てのアイテムを削除
    await api.item.deleteMany({
      where: { id: { in: itemIds } },
    });
    return { success: true, deletedCount: itemIds.length };
  } catch (error) {
    console.error("削除エラー:", error);
    return { success: false, error: "アイテムの削除に失敗しました" };
  }
};

// presentation.tsx
"use client";
import { FC, startTransition, useState } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/app/_components/common/Button";
import { Checkbox } from "@/app/_components/common/Checkbox";
import { TrashIcon } from "@/app/_components/icon/TrashIcon";
import { deleteItemsBulk, getItemList } from "./actions";

// アイテムデータの型定義
type ItemData = {
  id: string;
  name: string;
  description: string;
  // ... その他のプロパティ
};

type Props = {
  initialItems: ItemData[];
};

export const ItemListPresentation: FC<Props> = (props) => {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // useActionStateでアイテムリストの状態を管理
  // 第一引数: Server Action関数
  // 第二引数: 初期状態
  // 戻り値: [現在の状態, アクション実行関数, ロード中フラグ]
  const [items, fetchItems, isPending] = useActionState(
    async (_prevState: ItemData[]) => {
      // Server Actionを呼び出してデータを取得
      return await getItemList();
    },
    props.initialItems, // 初期状態として受け取ったリストを使用
  );

  // アイテムを選択する処理
  const handleSelectItem = (itemId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItemIds((prev) => [...prev, itemId]);
    } else {
      setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  // 選択したアイテムを削除する処理
  const handleDeleteSelected = async () => {
    if (selectedItemIds.length === 0) return;

    if (confirm(`選択した${selectedItemIds.length}件のアイテムを削除してもよろしいですか？`)) {
      // === ここがパターン6の重要なポイント ===
      // Server Action呼び出しとその後の状態更新をstartTransitionで囲む
      startTransition(async () => {
        // Server Actionを呼び出して削除処理を実行
        const result = await deleteItemsBulk(selectedItemIds);

        if (result?.success) {
          toast.success(`${result.deletedCount}件のアイテムを削除しました`);
          // 選択状態をリセット
          setSelectedItemIds([]);

          // 副作用: 削除後にデータを再取得して画面を更新
          // useActionStateで管理しているitemsを更新
          fetchItems();
        } else {
          toast.error(result?.error || "削除に失敗しました");
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {selectedItemIds.length > 0 && (
          <Button onClick={handleDeleteSelected} variant="filled">
            <TrashIcon size={14} color="white" />
            選択を削除（{selectedItemIds.length}件）
          </Button>
        )}
      </div>

      {/* アイテム一覧 */}
      <div className="border rounded p-4">
        {isPending ? (
          <div className="flex justify-center py-8">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="flex justify-center py-8">表示するアイテムがありません</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="w-12 p-2">
                  <Checkbox
                    checked={selectedItemIds.length === items.length && items.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItemIds(items.map(item => item.id));
                      } else {
                        setSelectedItemIds([]);
                      }
                    }}
                  />
                </th>
                <th className="p-2 text-left">名前</th>
                <th className="p-2 text-left">説明</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <Checkbox
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                    />
                  </td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// index.ts
export { ItemListPresentation as ItemList } from "./presentation";
```

#### パターン 7: データ操作 (フォームあり、副作用あり)

- **判断基準:** データ操作あり、`<form>` 要素を使用する。**サーバーサイドバリデーションの結果や操作結果（成功/失敗、メッセージ等）をフォームに反映させたい場合。**
- **ファイル構成:** Step 1 で選択したパターン + `actions.ts` (`"use server"`), `schema.ts`
- **技術要素:** Server Actions, Zod (`schema.ts`), Conform (`presentation.tsx` でフォーム状態管理), **`useActionState` (サーバー結果連携)**
- **用途:** ユーザー入力とサーバーサイドバリデーションを伴うデータの新規作成・更新フォームで、サーバーからのフィードバック（エラーメッセージ等）をフォームに表示する必要がある場合。
- **コード例:**

```typescript
// schema.ts
import { z } from "zod";

// フィルターのスキーマを定義 (searchTextのみ)
export const productFilterSchema = z.object({
  searchText: z.string().optional(),
});
export type ProductFilterSchema = z.infer<typeof productFilterSchema>;

// actions.ts
"use server";
import { parseWithZod } from "@conform-to/zod";
import { productFilterSchema } from "./schema";
import { api } from "@/server/api";
// Prismaから型をインポート
import { Product } from "@prisma/client";

// 商品リストを取得するアクション
export const getFilteredProducts = async (formData: FormData) => {
  // フォームデータをバリデーション
  const submission = parseWithZod(formData, { schema: productFilterSchema });

  if (submission.status !== "success") {
    // エラーの場合は空配列を返す
    return [] as Product[];
  }

  try {
    const filters = submission.value;

    // APIからフィルター条件に基づいてデータを取得
    const products = await api.product.getFiltered({
      searchText: filters.searchText,
    });

    // 商品データ配列を直接返す
    return products;
  } catch (error) {
    console.error("商品データ取得エラー:", error);
    // エラーの場合は空配列を返す
    return [] as Product[];
  }
};

// container.tsx
"use server";
import { api } from "@/server/api";
import { ProductTablePresentation } from "./presentation";
import { Product } from "@prisma/client";

export const ProductTableContainer = async () => {
  // 初期データを取得
  const initialProducts = await api.product.getAll();

  return <ProductTablePresentation initialProducts={initialProducts} />;
};

// presentation.tsx
"use client";
import { FC, useState } from "react";
import { useForm, conform, getFormProps } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { useActionState } from "react";
import { toast } from "sonner";
import { productFilterSchema, type ProductFilterSchema } from "./schema";
import { getFilteredProducts } from "./actions";
import { Product } from "@prisma/client";
import { Input } from "@/app/_components/common/Input";
import { Button } from "@/app/_components/common/Button";
import { InputElementContainer } from "@/app/_components/common/InputElementContainer";

type Props = {
  initialProducts: Product[];
};

export const ProductTablePresentation: FC<Props> = (props) => {
  // フォーム状態を管理
  const [form, fields] = useForm<ProductFilterSchema>({
    constraint: getZodConstraint(productFilterSchema),
    onValidate: ({ formData }) => {
      return parseWithZod(formData, { schema: productFilterSchema });
    },
    defaultValue: {
      searchText: "",
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  // 現在適用中のフィルター状態
  const [appliedFilter, setAppliedFilter] = useState<string>("");

  // useActionStateでServer Actionの状態を管理
  // 状態は商品データの配列のみ
  const [products, formAction, isPending] = useActionState(
    // Server Action
    async (formData: FormData) => {
      // フィルター内容を取得（フォーム状態更新用）
      const submission = parseWithZod(formData, { schema: productFilterSchema });
      if (submission.status === "success") {
        // フィルターが適用されたらその内容を状態として保存
        setAppliedFilter(submission.value.searchText || "");
      }

      // Server Actionの実行
      return await getFilteredProducts(formData);
    },
    // 初期状態は初期商品リスト
    props.initialProducts
  );

  return (
    <div className="flex flex-col gap-4">
      {/* フィルターフォーム */}
      <form
        {...getFormProps(form)}
        action={formAction}
        className="bg-gray-100 p-4 rounded"
      >
        <div className="text-lg font-bold mb-2">商品フィルター</div>

        <div className="flex items-end gap-4">
          {/* 検索テキスト入力 */}
          <div className="flex-1">
            <InputElementContainer
              label="検索:"
              errorMessage={fields.searchText.errors?.[0]}
            >
              <Input
                {...conform.input(fields.searchText)}
                key={fields.searchText.key}
                placeholder="商品名で検索"
              />
            </InputElementContainer>
          </div>

          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "検索中..." : "検索"}
            </Button>
          </div>
        </div>
      </form>

      {/* 商品テーブル */}
      <div className="border rounded">
        {isPending ? (
          <div className="flex justify-center py-8">読み込み中...</div>
        ) : products.length === 0 ? (
          <div className="flex justify-center py-8">表示する商品がありません</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">商品名</th>
                <th className="p-2 text-left">説明</th>
                <th className="p-2 text-right">価格</th>
                <th className="p-2 text-center">在庫</th>
                <th className="p-2 text-center">セール</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{product.name}</td>
                  <td className="p-2">{product.description}</td>
                  <td className="p-2 text-right">¥{product.price.toLocaleString()}</td>
                  <td className="p-2 text-center">
                    {product.inStock ? "あり" : "なし"}
                  </td>
                  <td className="p-2 text-center">
                    {product.isDiscounted ? "セール中" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 適用中のフィルター情報 */}
      <div className="text-sm text-gray-500">
        {appliedFilter ? `検索フィルター: 「${appliedFilter}」` : "すべての商品を表示中"}
      </div>
    </div>
  );
};

// index.ts
export { ProductTableContainer as ProductTable } from "./container";
```

### 4. 各ファイルの役割と責務分担

- **`container.tsx` (Server Component):**

  - サーバーサイドでのデータ取得 (`@/server/api`) またはデータプリフェッチ (`@/server/api` の `prefetch` メソッド)。
  - サーバーサイドでのみ実行可能なロジック。
  - Presentation コンポーネントのレンダリング。

- **`presentation.tsx` (Client Component):**

  - `"use client"` ディレクティブ必須。
  - UI の表示とスタイリング。
  - クライアントサイドの状態管理 (`useState`)。
  - イベントハンドリング (`onClick`, `onChange` など)。
  - **パターン別の特徴:**
    - **パターン 3:** TanStack Query (`useQuery`) によるデータ取得・ポーリング (`@/trpc/react`)。 `prefetch` されたデータの利用。
    - **パターン 4:** `useTransition` による実行状態(ローディング)管理。
    - **パターン 5:** Conform (`useForm`) によるフォーム管理、`useTransition` による実行状態管理。
    - **パターン 6:** `useActionState` による結果状態・実行状態管理。
    - **パターン 7:** Conform (`useForm`) によるフォーム管理、`useActionState` による結果状態・実行状態管理。

- **`index.ts`:**

  - コンポーネントのエントリーポイント。
  - 原則として Container (存在する場合) または Presentation をエクスポート。

- **`actions.ts` (Server Actions):**

  - `"use server"` ディレクティブ必須。
  - データの作成・更新・削除 (CUD) 処理。
  - **パターン 5, 7:** Zod (`parseWithZod`) による入力値バリデーション。
  - `revalidatePath`, `revalidateTag`, `redirect` など Next.js の機能利用。

- **`schema.ts`:**
  - **パターン 5, 7:** Zod スキーマ定義。フォームの入力値バリデーションルール。
