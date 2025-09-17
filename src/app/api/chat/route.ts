// app/api/chat/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const MCP_HOST_URL = process.env.MCP_HOST_URL ?? "http://127.0.0.1:8788/chat";

export async function POST(req: NextRequest) {
  try {
    const headers: HeadersInit = { "content-type": "application/json" };
    const auth = req.headers.get("authorization");
    if (auth) headers["authorization"] = auth;
    const apiKey = req.headers.get("x-api-key");
    if (apiKey) headers["x-api-key"] = apiKey;

    const body = await req.text(); // keep raw for streaming compatibility

    const resp = await fetch(MCP_HOST_URL, {
      method: "POST",
      headers,
      body,
    });

    // Forward status and headers (normalize content-type)
    const ct = resp.headers.get("content-type") || "text/plain";
    const { status, statusText } = resp;

    return new Response(resp.body, {
      status,
      statusText,
      headers: { "content-type": ct },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Proxy failure", detail: e?.message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
