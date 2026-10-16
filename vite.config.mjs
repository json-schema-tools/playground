import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const cryptoShim = fileURLToPath(new URL("./shims/crypto.mjs", import.meta.url));

// React 16 has no automatic JSX runtime. Keep the classic transform until React itself is upgraded.
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
  ],
  define: {
    // use-dark-mode reads the webpack-era `global` binding. Browsers do not provide it.
    global: "globalThis",
  },
  resolve: {
    // @json-schema-tools/titleizer calls crypto.createHash while naming untitled schemas.
    // Webpack 4 polyfilled that module. The shim covers the one call the browser makes.
    alias: {
      crypto: cryptoShim,
    },
  },
  build: {
    outDir: "build",
    // Monaco 0.18 ships a selector lightningcss rejects (:before followed by a sibling).
    // Leave the stylesheet intact so the browser keeps ignoring that one rule.
    cssMinify: false,
  },
  server: {
    port: 3000,
  },
});
