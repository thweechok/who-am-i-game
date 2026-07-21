import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/img?url=... — Proxy external images to avoid CORS/hotlinking issues */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "WhoAmIGame/1.0 (https://sanukhub.vercel.app)",
        "Accept": "image/*",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return new Response("Not found", { status: 404 });

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Failed", { status: 502 });
  }
}
