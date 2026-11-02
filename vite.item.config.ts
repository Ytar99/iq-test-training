import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function itemIndex(): Plugin {
  return {
    name: "item-index",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? "";
        const queryAt = url.indexOf("?");
        const path = queryAt === -1 ? url : url.slice(0, queryAt);
        const query = queryAt === -1 ? "" : url.slice(queryAt);
        if (path === "/" || path === "/index.html") req.url = `/item.html${query}`;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), itemIndex()],
  server: { port: 5174, strictPort: true },
});
