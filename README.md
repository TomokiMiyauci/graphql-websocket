# graphql-websocket

[![deno land](http://img.shields.io/badge/available%20on-deno.land/x-lightgrey.svg?logo=deno&labelColor=black&color=black)](https://deno.land/x/graphql_websocket)
[![deno doc](https://img.shields.io/badge/deno-doc-black)](https://doc.deno.land/https/deno.land/x/graphql_websocket/mod.ts)
[![codecov](https://codecov.io/gh/TomokiMiyauci/graphql-websocket/branch/main/graph/badge.svg?token=0Dq5iqtnjw)](https://codecov.io/gh/TomokiMiyauci/graphql-websocket)

GraphQL client and handler compliant with GraphQL over WebSocket specification

## API

### createClient

Create GraphQL over WebSocket client.

#### Example

```ts
import { createClient } from "https://deno.land/x/graphql_websocket@$VERSION/mod.ts";

const Client = createClient(`wss://<ENDPOINT>`);
```

#### Parameters

| Name |      Required      | Description                                                                                                               |
| ---- | :----------------: | ------------------------------------------------------------------------------------------------------------------------- |
| url  | :white_check_mark: | `string` &#124; `URL`<br> The URL to which to connect; this should be the URL to which the WebSocket server will respond. |

#### ReturnType

[Client](#Client)

### Client

GraphQL over WebSocket client specification.

#### Example

```ts
import { createClient } from "https://deno.land/x/graphql_websocket@$VERSION/mod.ts";

const Client = createClient(`wss://<ENDPOINT>`);
Client.addEventListener("next", ({ data }) => {
  console.log(data);
});

Client.subscribe({
  query: `subscription { test }`,
});
```
