import {
  DocumentNode,
  execute,
  ExecutionArgs,
  getOperationAST,
  GraphQLError,
  isAsyncIterable,
  OperationTypeNode,
  parse,
  subscribe,
  tryCatchSync,
  validate,
} from "../deps.ts";
import { GraphQLExecutionArgs } from "../types.ts";
import { PrivateStatus } from "./status.ts";
import { MessageType, MessengerImpl, parseMessage } from "./message.ts";
import { isRequestError } from "../utils.ts";

export const PROTOCOL = "graphql-transport-ws";

export type ProtocolHandler = (
  websocket: WebSocket,
  ctx: { graphqlExecutionArgs: GraphQLExecutionArgs },
) => void;

export const graphqlTransportWsHandler: ProtocolHandler = (
  socket,
  { graphqlExecutionArgs: args },
) => {
  socket.addEventListener("open", () => {
    if (socket.protocol !== PROTOCOL) {
      return socket.close(
        PrivateStatus.SubprotocolNotAcceptable,
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
        PrivateStatus.BadRequest,
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

        if (isAsyncIterable(executionResult)) {
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
};

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
