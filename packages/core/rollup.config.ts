import { defineConfig } from "rollup";
import escape from "regexp.escape";
import resolve from "@rollup/plugin-node-resolve";
import { swc } from "rollup-plugin-swc3";
import { css } from "./rollup-plugins";

import { peerDependencies } from "./package.json";

const packageNames = Object.keys(peerDependencies).map(escape);
const externalRegex =
  packageNames.length > 0
    ? new RegExp(`(${packageNames.join("|")})`)
    : undefined;

export default defineConfig([
  {
    input: {
      index: "src/index.ts",
      common: "src/common/index.ts",
    },
    output: {
      dir: "dist",
      format: "esm",
      assetFileNames: "styles/[name]/index.css",
    },
    plugins: [
      resolve(),
      swc({
        tsconfig: "tsconfig.build.json",
      }),
      css(),
    ],
    external: externalRegex,
  },
]);
