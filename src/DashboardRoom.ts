import type { StoredEvent } from "./types";

interface Env {
  WEBHOOKS: KVNamespace;
}

export class DashboardRoom implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle broadcast from webhook worker
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const message = await request.text();
      const webSockets = this.state.getWebSockets();
      let successCount = 0;
      let errorCount = 0;

      for (const ws of webSockets) {
        try {
          ws.send(message);
          successCount++;
        } catch (error) {
          console.error("Error sending to WebSocket:", error);
          errorCount++;
        }
      }

      return Response.json({
        broadcasted: true,
        clients: webSockets.length,
        success: successCount,
        errors: errorCount,
      });
    }

    // Handle connection count request
    if (url.pathname === "/connections" && request.method === "GET") {
      const webSockets = this.state.getWebSockets();
      return Response.json({ connections: webSockets.length });
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);

      server.send(
        JSON.stringify({
          type: "connected",
          timestamp: Date.now(),
          message: "Connected to Setup Manager dashboard",
        })
      );

      this.sendHistory(server, 200).catch((error) => {
        console.error("Error sending history:", error);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not Found", { status: 404 });
  }

  /** Maximum accepted WebSocket message size (bytes) */
  private static readonly MAX_WS_MESSAGE_SIZE = 4096;

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const messageLength =
        typeof message === "string" ? message.length : message.byteLength;

      if (messageLength > DashboardRoom.MAX_WS_MESSAGE_SIZE) {
        ws.send(JSON.stringify({ type: "error", message: "Message too large" }));
        return;
      }

      if (typeof message === "string") {
        const data = JSON.parse(message);

        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }

        if (data.type === "request-history") {
          const MAX_HISTORY = 200;
          const limit =
            typeof data.limit === "number"
              ? Math.min(Math.max(data.limit, 1), MAX_HISTORY)
              : MAX_HISTORY;
          await this.sendHistory(ws, limit);
        }
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    ws.close(code, "Connection closed");
  }

  async webSocketError(_ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error:", error);
  }

  private async sendHistory(ws: WebSocket, limit = 200): Promise<void> {
    const list = await this.env.WEBHOOKS.list({ limit });

    const events = await Promise.all(
      list.keys.map(async (key) => {
        const data = await this.env.WEBHOOKS.get(key.name);
        if (!data) return null;
        try {
          return JSON.parse(data) as StoredEvent;
        } catch {
          return null;
        }
      })
    );

    const validEvents = events
      .filter((e): e is StoredEvent => e !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    ws.send(JSON.stringify({ type: "history", data: validEvents }));
  }
}
