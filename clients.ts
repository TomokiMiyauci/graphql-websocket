// deno-lint-ignore-file no-explicit-any
import {
  CloseCode,
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  MessageType,
} from "./constants.ts";
import {
  NextMessage,
  PartialGraphQLParameters,
  SubscribeMessage,
} from "./types.ts";
import { isString } from "./deps.ts";
import { parseMessage } from "./parse.ts";

export interface GraphQLWebSocketEventMap {
  next: MessageEvent<NextMessage>;
}

/** GraphQL over WebSocket client specification.
 * ```ts
 * import { createClient } from "https://deno.land/x/graphql_websocket@$VERSION/mod.ts";
 *
 * const Client = createClient(`wss://<ENDPOINT>`);
 * Client.addEventListener("next", ({ data }) => {
 *   console.log(data);
 * });
 *
 * Client.subscribe({
 *   query: `subscription { test }`,
 * });
 * ```
 */
export interface Client extends WebSocket {
  subscribe(params: PartialGraphQLParameters): void;

  addEventListener<K extends keyof GraphQLWebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: GraphQLWebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

export class ClientImpl extends WebSocket implements Client {
  #ws: WebSocket;
  #queue: (string | ArrayBufferLike | Blob | ArrayBufferView)[] = [];

  constructor(url: string | URL) {
    super(url);
    this.#ws = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);

    this.#ws.addEventListener("open", () => {
      while (this.#queue.length > 0) {
        const message = this.#queue.pop();
        if (isString(message)) {
          this.#ws.send(message);
        }
      }
    }, {
      once: true,
    });
  }

  #send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.#ws.readyState === this.#ws.OPEN) {
      this.#ws.send(data);
    } else {
      this.#queue.push(data);
    }
  }

  subscribe(params: PartialGraphQLParameters): void {
    const id = crypto.randomUUID();
    const msg: SubscribeMessage = {
      id,
      type: MessageType.Subscribe,
      payload: params,
    };
    this.#send(JSON.stringify(msg));
  }

  addEventListener<
    K extends keyof (WebSocketEventMap & GraphQLWebSocketEventMap),
  >(
    type: K,
    listener: (
      this: WebSocket,
      ev: (WebSocketEventMap & GraphQLWebSocketEventMap)[K],
    ) => any,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void {
    if (["next"].includes(type)) {
      this.#ws.addEventListener("message", (ev) => {
        const [data, error] = parseMessage(ev.data);

        if (!data) {
          return this.close(CloseCode.BadRequest, error.message);
        }

        switch (data.type) {
          case MessageType.Next: {
            // deno-lint-ignore ban-types
            (listener as Function)({ ...ev, data });
          }
        }
      }, options);
    } else {
      this.#ws.addEventListener(type, listener, options);
    }
  }
}

/** Create GraphQL over WebSocket client.
 * @param url The URL to which to connect; this should be the URL to which the WebSocket server will respond.
 * @throws SyntaxError
 * ```ts
 * import { createClient } from "https://deno.land/x/graphql_websocket/mod.ts";
 *
 * const Client = createClient(`wss://<ENDPOINT>`);
 * ```
 */
export function createClient(url: string | URL): Client {
  return new ClientImpl(url);
}
