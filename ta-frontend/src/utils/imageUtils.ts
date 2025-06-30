/**
 * Base64画像データからData URLを生成する
 * @param base64Data Base64エンコードされた画像データ（プレフィックスなし）
 * @param mimeType MIME型（デフォルト: image/png）
 * @returns Data URL形式の文字列
 */
export function createImageDataUrl(base64Data: string, mimeType: string = "image/png"): string {
  // 既にdata:プレフィックスがある場合はそのまま返す
  if (base64Data.startsWith("data:")) {
    return base64Data;
  }
  
  // Base64データにプレフィックスがない場合は追加
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Base64画像データが有効かどうかをチェックする
 * @param base64Data Base64エンコードされた画像データ
 * @returns 有効な場合true
 */
export function isValidImageData(base64Data: string | null | undefined): boolean {
  if (!base64Data || base64Data.trim() === '') {
    return false;
  }
  
  // data:で始まっている場合
  if (base64Data.startsWith("data:")) {
    return true;
  }
  
  // Base64文字列の場合（最低限の長さチェック）
  return base64Data.length > 10;
}

/**
 * MIME型を推測する（Base64データから）
 * @param base64Data Base64データ
 * @returns MIME型
 */
export function inferMimeType(base64Data: string): string {
  if (base64Data.startsWith("data:")) {
    const match = base64Data.match(/data:([^;]+);/);
    if (match) {
      return match[1];
    }
  }
  
  // Base64データの最初の数文字からファイル形式を推測
  const header = base64Data.substring(0, 10);
  
  // PNGのマジックナンバー
  if (header.startsWith("iVBORw0KGg")) {
    return "image/png";
  }
  
  // JPEGのマジックナンバー
  if (header.startsWith("/9j/")) {
    return "image/jpeg";
  }
  
  // WebPのマジックナンバー
  if (header.startsWith("UklGR")) {
    return "image/webp";
  }
  
  // デフォルトはPNG
  return "image/png";
}