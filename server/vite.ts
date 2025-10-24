import { createServer as createViteServer } from "vite";
import path from "path";

export async function createVite() {
  const vite = await createViteServer({
    root: path.resolve(process.cwd(), "client"),
    server: { middlewareMode: true },
  });
  return vite;
}
