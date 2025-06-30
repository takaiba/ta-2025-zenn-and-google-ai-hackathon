// Gemini API utility functions
// Note: Using manual implementation since package installation is blocked

interface GenerativeAIConfig {
  apiKey: string;
  model: string;
}

// Using any type for flexibility with Prisma-generated types
interface ReportData {
  sessionId: string;
  projectName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testResults: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bugs: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logs: any[];
  screenshots: string[];
}

interface GenerateContentRequest {
  contents: Array<{
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  }>;
}

interface GenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiAPI {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GenerativeAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async generateContent(request: GenerateContentRequest): Promise<string> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gemini API error: ${response.status} - ${response.statusText}. Response: ${errorBody}`);
    }

    const data: GenerateContentResponse = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      throw new Error('No response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  async generateTestReport(data: ReportData): Promise<string> {
    const prompt = `
テストセッションの結果を基に、詳細なHTMLレポートを生成してください。

## テストセッション情報
- セッションID: ${data.sessionId}
- プロジェクト名: ${data.projectName}
- テスト結果数: ${data.testResults.length}
- 検出されたバグ数: ${data.bugs.length}
- ログエントリ数: ${data.logs.length}
- スクリーンショット数: ${data.screenshots.length}

## テスト結果詳細
${JSON.stringify(data.testResults, null, 2)}

## 検出されたバグ
${JSON.stringify(data.bugs, null, 2)}

## ログ情報
${JSON.stringify(data.logs, null, 2)}

以下の要件に従ってHTMLレポートを生成してください：

1. **構造化されたHTML**：適切なHTML5構造を使用
2. **視覚的に見やすいデザイン**：Tailwind CSSまたはインラインCSSを使用
3. **セクション分け**：
   - 概要（サマリー）
   - テスト結果詳細
   - 検出されたバグ
   - ログ詳細
   - 推奨事項
4. **統計情報**：成功率、失敗率、重要度別バグ数など
5. **日本語対応**：すべてのテキストを日本語で出力
6. **レスポンシブデザイン**：モバイルでも見やすい設計

完全なHTMLドキュメントとして出力してください。`;

    console.log('prompt length', prompt.length);

    const request: GenerateContentRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    return this.generateContent(request);
  }
}

export const createGeminiClient = (apiKey: string) => {
  return new GeminiAPI({
    apiKey,
    model: 'gemini-1.5-pro', // Use Gemini 1.5 Pro instead of 2.5
  });
};
