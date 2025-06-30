// アップロードに対応している拡張子（ファイル形式の種類別）
export const IMAGE_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
export const PDF_FILE_EXTENSIONS = [".pdf"];
export const AUDIO_FILE_EXTENSIONS = [".mp3", ".wav"];
export const TEXT_FILE_EXTENSIONS = [".txt"];
export const VIDEO_FILE_EXTENSIONS = [
  ".mpeg",
  ".mov",
  ".mp4",
  ".mpg",
  ".flv",
  ".avi",
  ".wmv",
];

// アップロードに対応している拡張子（全ファイル形式）
export const ACCEPTED_FILE_EXTENSIONS = [
  ...IMAGE_FILE_EXTENSIONS,
  ...PDF_FILE_EXTENSIONS,
  ...AUDIO_FILE_EXTENSIONS,
  ...TEXT_FILE_EXTENSIONS,
  ...VIDEO_FILE_EXTENSIONS,
];
