import { defineConfig } from "tsdown";

export default defineConfig([
	{
		globalName: "zipperjs",
		platform: "browser",
		format: ["esm", "iife"],
		entry: ["src/index.js"],
		exports: true,
	},
	{
		platform: "node",
		format: ["esm", "cjs"],
		entry: ["src/index.js", "src/node-compat.js"],
		exports: true,
	},
]);
