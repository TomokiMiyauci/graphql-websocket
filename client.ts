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
import { resolveData } from "./resolve.ts";

interface GraphQLWebSocketEventMap {
  next: MessageEvent<NextMessage>;
}

interface GqlClient {
  subscribe(params: PartialGraphQLParameters): void;

  addEventListener<K extends keyof GraphQLWebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: GraphQLWebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

export default class GraphQLClient extends WebSocket implements GqlClient {
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
        const [data, error] = resolveData(ev.data);

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
