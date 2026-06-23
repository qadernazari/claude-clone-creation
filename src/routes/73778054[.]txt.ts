import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/73778054.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response("73778054", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
