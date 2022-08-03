import { ExecutionResult, GraphQLError, RequiredBy } from "./deps.ts";
import {
  CompleteMessage,
  ConnectionAckMessage,
  ErrorMessage,
  NextMessage,
  PongMessage,
} from "./types.ts";
import { MessageType } from "./constants.ts";

export function isRequestError(
  executionResult: ExecutionResult,
): executionResult is RequiredBy<Omit<ExecutionResult, "data">, "errors"> {
  return !("data" in executionResult);
}

interface Messenger {
  pongMsg(): PongMessage;
  connectionArcMsg(): ConnectionAckMessage;
  nextMsg(id: string, payload: ExecutionResult): NextMessage;
  errorMsg(id: string, errors: ReadonlyArray<GraphQLError>): ErrorMessage;
  completeMsg(id: string): CompleteMessage;
}

export class MessengerImpl implements Messenger {
  pongMsg(): PongMessage {
    return {
      type: MessageType.Pong,
    };
  }

  connectionArcMsg(): ConnectionAckMessage {
    return {
      type: MessageType.ConnectionAck,
    };
  }

  nextMsg(
    id: string,
    payload: ExecutionResult,
  ): NextMessage {
    const msg: NextMessage = {
      id,
      type: MessageType.Next,
      payload,
    };

    return msg;
  }

  completeMsg(id: string): CompleteMessage {
    const msg: CompleteMessage = {
      id,
      type: MessageType.Complete,
    };

    return msg;
  }

  errorMsg(id: string, errors: readonly GraphQLError[]): ErrorMessage {
    const errorMessage: ErrorMessage = {
      id,
      type: MessageType.Error,
      payload: errors,
    };
    return errorMessage;
  }
}
