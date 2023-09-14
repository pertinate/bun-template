import { Server } from "bun";

type RequestWithParams = Request & {
  params: {
    [key: string]: string;
  };
};

type Router = Map<
  string,
  ((request: RequestWithParams, server: Server) => Response) | Router
>;

export const routes: Router = new Map();

routes.set("/test/(?<paramOne>.*)/ha", (request) => {
  const url = new URL(request.url);
  return new Response(
    `Return: ${url.pathname} -- ${JSON.stringify(request.params)}`
  );
});

routes.set(
  "/api",
  new Map([
    [
      "/hello_world",
      (request) => {
        return new Response();
      },
    ],
  ])
);

const fullRoutes: [
  string,
  (request: RequestWithParams, server: Server) => Response
][] = [];

const queue: [
  string,
  ((request: RequestWithParams, server: Server) => Response) | Router
][] = Array.from(routes.entries());

while (queue.length > 0) {
  const [routeName, callbackOrNest] = queue[0];
  if (typeof callbackOrNest === "function") {
    fullRoutes.push([routeName, callbackOrNest]);
  } else {
    const test = Array.from(callbackOrNest.entries()).map(([name, cb]) => [
      `${routeName}${name}`,
      cb,
    ]) as [
      string,
      ((request: RequestWithParams, server: Server) => Response) | Router
    ][];
    queue.push(...test);
  }
  queue.shift();
}

Bun.serve({
  port: 3001,
  fetch(request, server) {
    const url = new URL(request.url);
    for (let i = 0; i < fullRoutes.length; i++) {
      const regex = RegExp(`^${fullRoutes[i]}`, "i");
      if (regex.test(url.pathname)) {
        const output = regex.exec(url.pathname);
        console.log(output?.groups);
        const [_, response] = fullRoutes[i];
        const requestWithParams = request;
        (requestWithParams as RequestWithParams).params = output?.groups || {};
        if (response) {
          return response(requestWithParams as RequestWithParams, server);
        }
      }
    }

    return new Response("Route not found", { status: 404 });
  },
});
