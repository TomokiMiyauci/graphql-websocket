import {
  DocumentNode,
  execute,
  ExecutionArgs,
  getOperationAST,
  GraphQLError,
  OperationTypeNode,
  parse,
  Status,
  subscribe,
  tryCatchSync,
  validate,
  validateSchema,
} from "./deps.ts";
import { isAsyncGenerator, isRequestError, MessengerImpl } from "./utils.ts";
import {
  CloseCode,
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  MessageType,
} from "./constants.ts";
import { GraphQLExecutionArgs } from "./types.ts";
import { validateWebSocketRequest } from "./validates.ts";
import { parseMessage } from "./parse.ts";

/**
 * @throws `AggregateError` - When GraphQL schema validation error has occurred.
 */
export default function createHandler(
  params: GraphQLExecutionArgs,
): (req: Request) => Response {
  const validationResult = validateSchema(params.schema);
  if (validationResult.length) {
    throw new AggregateError(
      validationResult,
      "GraphQL schema validation error",
    );
  }

  return (req: Request): Response => {
    const [result, error] = validateWebSocketRequest(req);
    if (!result) {
      const headers = error.status === Status.MethodNotAllowed
        ? new Headers({ "Allow": "GET" })
        : undefined;
      return new Response(error.message, {
        status: error.status,
        headers,
      });
    }

    const protocol = req.headers.get("sec-websocket-protocol") ?? undefined;
    const [data, err] = tryCatchSync(() =>
      Deno.upgradeWebSocket(req, { protocol })
    );

    if (!data) {
      const msg = resolveErrorMsg(err);
      return new Response(msg, {
        status: Status.InternalServerError,
      });
    }

    register(data.socket, params);
    return data.response;
  };
}

function register(
  socket: WebSocket,
  args: GraphQLExecutionArgs,
): void {
  socket.addEventListener("open", () => {
    if (socket.protocol !== GRAPHQL_TRANSPORT_WS_PROTOCOL) {
      return socket.close(
        CloseCode.SubprotocolNotAcceptable,
        "Sub protocol is not acceptable",
      );
    }
  }, {
    once: true,
  });

  socket.addEventListener("message", async ({ data }) => {
    const [message, error] = parseMessage(data);

    if (!message) {
      return socket.close(
        CloseCode.BadRequest,
        `Invalid message received. ${error.message}`,
      );
    }

    const messenger = new MessengerImpl();

    switch (message.type) {
      case MessageType.ConnectionInit: {
        safeSend(
          socket,
          JSON.stringify({
            type: MessageType.ConnectionAck,
          }),
        );
        break;
      }

      case MessageType.Ping: {
        safeSend(
          socket,
          JSON.stringify({
            type: MessageType.Pong,
          }),
        );
        break;
      }

      case MessageType.Subscribe: {
        const { payload } = message;

        const [document, error] = tryCatchSync<DocumentNode, GraphQLError>(() =>
          parse(payload.query)
        );
        if (!document) {
          const msg = messenger.errorMsg(message.id, [error]);
          return safeSend(socket, JSON.stringify(msg));
        }

        const validationResult = validate(args.schema, document);
        if (validationResult.length) {
          const msg = messenger.errorMsg(message.id, validationResult);
          return safeSend(socket, JSON.stringify(msg));
        }

        const operationAST = getOperationAST(document);

        if (!operationAST) {
          const msg = messenger.errorMsg(message.id, [
            new GraphQLError("Unable to identify operation"),
          ]);

          return safeSend(socket, JSON.stringify(msg));
        }

        const executor = getExecutor(operationAST.operation);

        const executionArgs: ExecutionArgs = {
          ...args,
          document,
          ...payload,
        };

        const executionResult = await executor(executionArgs);

        if (isAsyncGenerator(executionResult)) {
          for await (const result of executionResult) {
            const msg = messenger.nextMsg(message.id, result);
            safeSend(socket, JSON.stringify(msg));
          }
        } else {
          const msg = isRequestError(executionResult)
            ? messenger.errorMsg(message.id, executionResult.errors)
            : messenger.nextMsg(message.id, executionResult);

          safeSend(socket, JSON.stringify(msg));
        }

        const msg = messenger.completeMsg(message.id);
        return safeSend(socket, JSON.stringify(msg));
      }
    }
  });
}

function safeSend(
  socket: WebSocket,
  data: string | ArrayBufferLike | Blob | ArrayBufferView,
) {
  if (socket.readyState === socket.OPEN) {
    try {
      socket.send(data);
    } catch {
      // noop
    }
  }
}

function getExecutor(
  operationTypeNode: OperationTypeNode,
): typeof subscribe | typeof execute {
  return operationTypeNode === "subscription" ? subscribe : execute;
}

function resolveErrorMsg(value: unknown): string {
  return value instanceof Error ? value.message : "Unknown error has occurred.";
}
