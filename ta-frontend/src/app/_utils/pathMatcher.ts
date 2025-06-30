/**
 * ワイルドカードパターンマッチング機能
 * example.com/* や *.example.com/xxx/* などのパターンに対応
 */

/**
 * ワイルドカードパターンをRegExpに変換する
 * @param pattern - ワイルドカードパターン (例: "example.com/*", "*.example.com/docs/*")
 * @returns 正規表現
 */
export function createPatternRegex(pattern: string): RegExp {
  // 特殊文字をエスケープ
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 正規表現の特殊文字をエスケープ
    .replace(/\*/g, '.*'); // * を .* に置換

  return new RegExp(`^${escaped}$`);
}

/**
 * URLがパターンにマッチするかチェック
 * @param url - チェック対象のURL
 * @param pattern - パターン（ワイルドカード付き）
 * @returns マッチするかどうか
 */
export function matchesPattern(url: string, pattern: string): boolean {
  try {
    const regex = createPatternRegex(pattern);
    return regex.test(url);
  } catch (error) {
    console.warn(`Invalid pattern: ${pattern}`, error);
    return false;
  }
}

/**
 * URLが複数のパターンのいずれかにマッチするかチェック
 * @param url - チェック対象のURL
 * @param patterns - パターンの配列
 * @returns マッチするかどうか
 */
export function matchesAnyPattern(url: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchesPattern(url, pattern));
}

/**
 * パターンの形式が正しいかバリデーション
 * @param pattern - バリデーション対象のパターン
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validatePattern(pattern: string): string | null {
  if (!pattern.trim()) {
    return "パターンが空です";
  }

  // ドメインを含むかチェック
  if (!pattern.includes('.')) {
    return "ドメインを含むパターンを指定してください";
  }

  // 基本的な形式チェック
  try {
    createPatternRegex(pattern);
    return null;
  } catch (_error) {
    return "無効なパターン形式です";
  }
}

/**
 * パターン配列をバリデーション
 * @param patterns - パターンの配列
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validatePatterns(patterns: string[]): string | null {
  if (!Array.isArray(patterns)) {
    return "パターンは配列形式で指定してください";
  }

  for (let i = 0; i < patterns.length; i++) {
    const error = validatePattern(patterns[i]);
    if (error) {
      return `パターン ${i + 1}: ${error}`;
    }
  }

  return null;
} 
