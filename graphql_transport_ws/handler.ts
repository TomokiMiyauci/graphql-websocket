import { Status, tryCatchSync, validateSchema } from "../deps.ts";
import { GraphQLExecutionArgs } from "../types.ts";
import { validateWebSocketRequest } from "../validates.ts";
import { graphqlTransportWsHandler } from "./protocol.ts";

/** Create `Request` handler compliant GraphQL over WebSocket server.
 * @throws `AggregateError` - When GraphQL schema validation error has occurred.
 * ```ts
 * import { createHandler } from "https://deno.land/x/graphql_websocket@$VERSION/graphql_transport_ws/mod.ts";
 * import { serve } from "https://deno.land/std@$VERSION/http/mod.ts";
 * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
 *
 * const handler = createHandler({
 *   schema: buildSchema(`type Query { hello: String }
 * type Subscription {
 *   greetings: String!
 * }`),
 *   rootValue: {
 *     greetings: async function* () {
 *       for (const hi of ["Hi", "Bonjour", "Hola", "Ciao", "Zdravo"]) {
 *         yield { greetings: hi };
 *       }
 *     },
 *   },
 * });
 *
 * serve(handler);
 * ```
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
    const [data] = tryCatchSync(() => Deno.upgradeWebSocket(req, { protocol }));

    if (!data) {
      return new Response(null, {
        status: Status.InternalServerError,
      });
    }

    graphqlTransportWsHandler(data.socket, { graphqlExecutionArgs: params });
    return data.response;
  };
}
