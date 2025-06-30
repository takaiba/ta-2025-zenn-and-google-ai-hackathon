import process from "process";

import { Storage } from "@google-cloud/storage";
import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string[] }> },
) {
  const session = await auth0.getSession();

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { filename } = await params;
  const filePath = filename.join("/");

  const storage = new Storage();
  const bucket = storage.bucket(process.env.MULTIMODAL_GCS_BUCKET_NAME ?? "");
  const file = bucket.file(filePath);

  try {
    const [metaData] = await file.getMetadata();
    const contents = await file.download();

    return new NextResponse(contents[0], {
      headers: {
        // utf-8を明示的に指定する
        "Content-Type": metaData.contentType + "; charset=utf-8",
        // キャッシュは完全無効化する
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      } as HeadersInit,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Not Found", { status: 404 });
  }
}
