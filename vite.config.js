import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),
      },
      output: {
        entryFileNames: "popup.js",
        chunkFileNames: "popup.chunk.js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    viteStaticCopy({
      targets: [
        { src: "public/background.js", dest: "." },
        { src: "public/content.js", dest: "." },
        { src: "public/idb-keyval-iife.min.js", dest: "." },
      ],
    }),
  ],
});
