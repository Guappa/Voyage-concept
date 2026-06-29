import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// base './' keeps asset URLs relative so the build runs from any host (pages.dev or the custom domain)
export default defineConfig({
  plugins: [svelte()],
  base: "./",
});
