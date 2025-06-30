## Next.js App Routerにおけるページファイル（page.tsx）作成ガイド

### 1. はじめに

Next.js App Routerでは、`app` ディレクトリ配下に `page.tsx` (または `page.js`) ファイルを作成することで、新しいルート（ページ）が定義されます。このガイドでは、`page.tsx` の基本的な作成方法と、いくつかの実装パターンについて解説します。

### 2. 詳細パターン解説

#### 2.1 シンプルなページコンポーネントの場合

最も基本的なパターンは、特定のコンポーネントをレンダリングするだけのシンプルなページです。

```tsx
// src/app/tenants/page.tsx の例
import { ManageTenantArea } from "../_components/domain/tenants/ManageTenantArea";

const Page = () => {
  return <ManageTenantArea />;
};

export default Page;
```

この例では、`ManageTenantArea` コンポーネントをインポートし、それをページの内容として返しています。

#### 2.2 URLパラメータ `searchParams` の利用する場合

URLの検索パラメータ (`searchParams`) を利用することで、パラメータに応じて表示内容を動的に変更することが可能です。`searchParams` を受け取る場合、ページコンポーネントは `async` 関数として定義する必要があります。

```tsx
// src/app/page.tsx の例
import { ChatMessagesArea } from "./_components/domain/chat/ChatMessagesArea";
import { ChatStartArea } from "./_components/domain/chat/ChatStartArea";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  // searchParams は Promise で渡されるため、await で解決する
  const params = await searchParams;
  const ticketId = params.ticketId as string | undefined;

  return (
    <div className={"flex size-full"}>
      {ticketId ? <ChatMessagesArea ticketId={ticketId} /> : <ChatStartArea />}
    </div>
  );
};

export default Page;
```

この例では、`searchParams` から `ticketId` を取得し、その存在有無によって `ChatMessagesArea` または `ChatStartArea` のいずれかを表示しています。

### 3. 各ファイルの役割と責務分担

`page.tsx` の主な責務は以下の通りです。

- ルートに対応するUIコンポーネントをレンダリングする。 **原則として、`page.tsx` からは `◯◯Area` という命名規則のコンポーネントを1つだけレンダリングするようにします。**
- 必要に応じて、URL パラメータ (`params` や `searchParams`) を受け取り、子コンポーネント (`◯◯Area`) に渡す。
- **データフェッチ処理は `◯◯Area` コンポーネント以下で行い、`page.tsx` では行わないこと。（厳禁）**

複雑なロジックや状態管理、UIの詳細は、`page.tsx` から呼び出される `◯◯Area` コンポーネント（例: `ManageTenantArea`, `ChatMessagesArea`）に委譲することが推奨されます。

### 4. 命名規則 (厳守)

- ページファイル名は必ず `page.tsx` (または `page.js`) とします。
- ページコンポーネントの関数名（または変数名）は `Page` とします（例: `const Page = () => { ... }`, `function Page() { ... }`）。
- デフォルトエクスポート (`export default Page;`) が必要です。
