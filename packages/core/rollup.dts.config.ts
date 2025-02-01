import { defineConfig } from "rollup";
import { dts } from "rollup-plugin-dts";
import { ignore } from "./rollup-plugins";

export default defineConfig([
  {
    input: {
      index: ".declaration-temp/src/index.d.ts",
      common: ".declaration-temp/src/common/index.d.ts",
    },
    output: [{ dir: "dist", format: "es" }],
    plugins: [ignore(["**/*.css"]), dts()],
  },
]);
