// import { StreamingTextResponse, LangChainStream } from 'ai';

export const runtime = "edge";

const rateLimitStore: Record<string, number[]> = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;

export async function POST(req: Request) {
  const token = req.headers.get("Authorization")?.split(" ")[1];

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const userRequests = rateLimitStore[token] || [];
  const requestsInWindow = userRequests.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW
  );

  if (requestsInWindow.length >= RATE_LIMIT_MAX_REQUESTS) {
    return new Response("Too Many Requests", { status: 429 });
  }

  rateLimitStore[token] = [...requestsInWindow, now];

  const { messages } = await req.json();
  const userMessage = messages[messages.length - 1].content as string;

  if (userMessage.toLowerCase().includes("error test")) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (text: string) => {
          controller.enqueue(encoder.encode(text));
        };

        send(
          '{"type": "error", "error": "Failed to stamp hash: Insufficient funds."}\n'
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (text: string) => {
        controller.enqueue(encoder.encode(text));
      };

      send('{"type": "step", "step": "Stamping hash..."}\n');
      await new Promise((res) => setTimeout(res, 1000));
      send(
        '{"type": "step_result", "result": "✅ Hash stamped successfully! Transaction ID: 0x123...def"}\n'
      );
      await new Promise((res) => setTimeout(res, 500));

      send('{"type": "step", "step": "Checking stamp status..."}\n');
      await new Promise((res) => setTimeout(res, 1500));
      send('{"type": "step_result", "result": "✅ Status: Confirmed"}\n');
      await new Promise((res) => setTimeout(res, 500));

      send('{"type": "step", "step": "Resolving proof..."}\n');
      await new Promise((res) => setTimeout(res, 1000));
      send('{"type": "step_result", "result": "✅ Proof resolved."}\n');
      await new Promise((res) => setTimeout(res, 500));

      send(
        '{"type": "final_response", "response": "Your document has been successfully stamped and verified on the blockchain.", "proof": { "timestamp": "2025-08-29T12:00:00Z", "hash": "...", "transactionId": "0x123...def" }}'
      );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain" },
  });
}
