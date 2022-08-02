import {
  DocumentNode,
  execute,
  ExecutionArgs,
  ExecutionResult,
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
import { isAsyncGenerator, MessengerImpl } from "./utils.ts";
import {
  CloseCode,
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  MessageType,
} from "./constants.ts";
import { resolveData } from "./resolve.ts";
import { GraphQLExecutionArgs } from "./types.ts";

/**
 * @throws `AggregateError` - When GraphQL schema validation error has occurred.
 */
export default function createHandler(
  params: GraphQLExecutionArgs,
): (req: Request) => Response | Promise<Response> {
  const validationResult = validateSchema(params.schema);
  if (validationResult.length) {
    throw new AggregateError(
      validationResult,
      "GraphQL schema validation error",
    );
  }
  return (req: Request): Response => {
    if (isWebsocketRequest(req)) {
      const protocol = req.headers.get("sec-websocket-protocol") ?? undefined;
      const { response, socket } = Deno.upgradeWebSocket(req, {
        protocol,
      });

      register(socket, params);

      return response;
    }

    return new Response("Not Found", {
      status: Status.NotFound,
    });
  };
}

function isWebsocketRequest(req: Request): boolean {
  const upgrade = req.headers.get("upgrade");

  return upgrade === "websocket";
}

function register(
  socket: WebSocket,
  args: GraphQLExecutionArgs,
): void {
  socket.addEventListener("open", () => {
    if (!isValidProtocol(socket.protocol)) {
      return socket.close(
        CloseCode.SubprotocolNotAcceptable,
        "Sub protocol is not acceptable",
      );
    }
  }, {
    once: true,
  });

  socket.addEventListener("message", async ({ data }) => {
    const [message, error] = resolveData(data);

    if (!message) {
      return socket.close(
        CloseCode.BadRequest,
        `Invalid message received. ${error.message}`,
      );
    }

    const messenger = new MessengerImpl();

    switch (message.type) {
      case MessageType.ConnectionInit: {
        return safeSend(
          socket,
          JSON.stringify({
            type: MessageType.ConnectionAck,
          }),
        );
      }

      case MessageType.Ping: {
        return safeSend(
          socket,
          JSON.stringify({
            type: MessageType.Pong,
          }),
        );
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
            const msg = messenger.nextMsg({ payload: result, id: message.id });
            safeSend(socket, JSON.stringify(msg));
          }
        } else {
          const msg = isRequestError(executionResult)
            ? messenger.errorMsg(message.id, executionResult.errors)
            : messenger.nextMsg({
              payload: executionResult,
              id: message.id,
            });

          safeSend(socket, JSON.stringify(msg));
        }

        const msg = messenger.completeMsg(message.id);
        safeSend(socket, JSON.stringify(msg));
        return;
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

function isValidProtocol(
  protocol: string,
): protocol is typeof GRAPHQL_TRANSPORT_WS_PROTOCOL {
  return [GRAPHQL_TRANSPORT_WS_PROTOCOL].includes(
    protocol,
  );
}

type RequestErrorResult = {
  errors: [];
};

function isRequestError(
  executionResult: ExecutionResult,
): executionResult is RequestErrorResult {
  return !("data" in executionResult);
}
