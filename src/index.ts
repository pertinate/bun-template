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

export const routes: Router = new Map<
  string,
  (request: RequestWithParams, server: Server) => Response
>();

routes.set("/test/(?<paramOne>.*)/ha", (request) => {
  const url = new URL(request.url);
  return new Response(
    `Return: ${url.pathname} -- ${JSON.stringify(request.params)}`
  );
});

Bun.serve({
  port: 3001,
  fetch(request, server) {
    const url = new URL(request.url);
    const regexRoutes = Array.from(routes.keys());
    for (let i = 0; i < regexRoutes.length; i++) {
      const regex = RegExp(`^${regexRoutes[i]}$`, "i");
      if (regex.test(url.pathname)) {
        const output = regex.exec(url.pathname);
        console.log(output?.groups);
        const response = routes.get(regexRoutes[i]);
        const requestWithParams = request;
        (requestWithParams as RequestWithParams).params = output?.groups || {};
        if (response) {
          return response(requestWithParams as RequestWithParams, server);
        }
      }
    }

    return new Response();
  },
});
