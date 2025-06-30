// Cursorのカスタムモード用プロンプト作成するスクリプトです
// 現状、カスタムモードのプロンプトをファイル管理する仕組みが無いため、
// このスクリプトを実行して作成されたプロンプトを手動でコピーする必要があります

// Cursorのカスタムモード設定ファイル
const CURSOR_MODE_FILES = [
  {
    input: "docs-agent/mode/001_code.md",
    output: ".cursor/modes/code.md",
  },
  {
    input: "docs-agent/mode/002_plan.md",
    output: ".cursor/modes/plan.md",
  },
];

// Cursorの基本的なルールファイル
const CURSOR_BASIC_RULE_FILE = "docs-agent/guide/000_basic.md";

// Cursorのモデルルールファイル
const CURSOR_MODEL_RULE_FILE = "docs-agent/model/002_gemini.md";

// Cursorのその他のルールファイル
const CURSOR_OTHER_RULE_FILES = [
  "docs-agent/guide/001_create_component.md",
  "docs-agent/guide/002_create_trpc_router.md",
  "docs-agent/guide/003_create_page.md",
];

import * as fs from "fs/promises";
import * as path from "path";

// ファイルの内容を読み込む関数
async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    console.error(`ファイル読み込みエラー (${filePath}):`, error);
    throw error;
  }
}

// ディレクトリが存在しない場合に作成する関数
async function ensureDirectoryExists(filePath: string): Promise<void> {
  const directory = path.dirname(filePath);
  try {
    await fs.access(directory);
  } catch (_error) {
    await fs.mkdir(directory, { recursive: true });
    console.log(`ディレクトリを作成しました: ${directory}`);
  }
}

// プロンプトファイルを生成する関数
async function generatePromptFile(modeFile: {
  input: string;
  output: string;
}): Promise<void> {
  try {
    // 各ファイルの内容を読み込む
    const modeContent = await readFile(modeFile.input);
    const basicRuleContent = await readFile(CURSOR_BASIC_RULE_FILE);
    const modelRuleContent = await readFile(CURSOR_MODEL_RULE_FILE);

    // その他のルールファイルの内容を読み込む
    const otherRuleContents = await Promise.all(
      CURSOR_OTHER_RULE_FILES.map((filePath) => readFile(filePath)),
    );

    // すべての内容を結合する
    const combinedContent = [
      modeContent,
      "# 遵守すべきガイドライン\n\n" + basicRuleContent,
      modelRuleContent,
      ...otherRuleContents,
    ].join("\n\n");

    // 出力先ディレクトリが存在するか確認し、なければ作成
    await ensureDirectoryExists(modeFile.output);

    // 結合した内容をファイルに書き込む
    await fs.writeFile(modeFile.output, combinedContent);
    console.log(`生成完了: ${modeFile.output}`);
  } catch (error) {
    console.error(
      `プロンプト生成エラー (${modeFile.input} -> ${modeFile.output}):`,
      error,
    );
    throw error;
  }
}

// メイン処理
async function main() {
  try {
    // 各モードファイルに対してプロンプトを生成
    for (const modeFile of CURSOR_MODE_FILES) {
      await generatePromptFile(modeFile);
    }
    console.log("全てのカスタムモード用プロンプトの作成が完了しました！");
  } catch (error) {
    console.error("カスタムモード用プロンプトの作成に失敗しました:", error);
    process.exit(1);
  }
}

// スクリプトの実行
void main();
