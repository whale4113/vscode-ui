import { Plugin } from "rollup";
import { createFilter, FilterPattern } from "@rollup/pluginutils";
import path from "node:path";

const relative = (from: string, to: string) => {
  if (!path.isAbsolute(from)) {
    from = `/${from}`;
  }
  from = path.dirname(from);

  if (!path.isAbsolute(to)) {
    to = `/${to}`;
  }

  if (from === path.dirname(to)) {
    return `./${path.basename(to)}`;
  }

  return path.relative(from, to);
};

const IGNORE_ID = "ignore_id";

export function ignore(input?: FilterPattern): Plugin {
  const filter = createFilter(input);

  return {
    name: "ignore",
    async resolveId(source) {
      return source === IGNORE_ID ||
        filter(source.startsWith("./") ? source.slice(1) : source)
        ? IGNORE_ID
        : null;
    },
    load(id) {
      return id === IGNORE_ID ? "export default {}" : null;
    },
  };
}

interface CustomFileName {
  (options: { name: string; ext: string; base: string }): string;
}

const defaultCustomFileName: CustomFileName = ({ name, ext }) =>
  `styles/${name}/index${ext}`;

interface RollupCssOptions {
  /**
   * Custom the path of the emitted asset file, relative to `output.dir` without a leading `./`.
   */
  customFileName?: CustomFileName;
}

export function css(options: RollupCssOptions = {}): Plugin {
  const { customFileName = defaultCustomFileName } = options;

  interface CSS {
    /**
     * The reference id of the emitted css file.
     */
    referenceId: string;
    /**
     * The `importer` is the fully resolved id of the importing module. When resolving entry points, importer will usually be `undefined`.
     */
    importer: string;
    /**
     * The path of the emitted css file, relative to `output.dir` without a leading `./`.
     */
    fileName: string;
    /**
     * The source code of css file.
     */
    code: string;
  }

  interface JS {
    /**
     * The reference id of the emitted js file.
     */
    referenceId: string;
    /**
     * The path of the emitted js file, relative to `output.dir` without a leading `./`.
     */
    fileName: string;
  }

  interface Style {
    css: CSS;
    js: JS;
  }

  let emittedStyles = new Map<string, Style>();
  let importerToStyles = new Map<string, Set<Style>>();

  return {
    name: "css",
    async resolveId(source, importer, options) {
      if (!source.endsWith(".css")) return null;

      const resolvedId = await this.resolve(source, importer, options);

      if (resolvedId && importer) {
        let style: Style | undefined = emittedStyles.get(resolvedId.id);

        if (!style) {
          const { name, ext, base } = path.parse(source);

          const cssFileName = customFileName({ name, ext, base });
          const cssReferenceId = this.emitFile({
            type: "asset",
            fileName: cssFileName,
            originalFileName: resolvedId.id,
          });

          const jsFileName = customFileName({
            name,
            ext: ".js",
            base: `${name}.js`,
          });
          const jsReferenceId = this.emitFile({
            type: "asset",
            fileName: jsFileName,
          });

          style = {
            css: {
              referenceId: cssReferenceId,
              importer,
              code: "",
              fileName: cssFileName,
            },
            js: {
              referenceId: jsReferenceId,
              fileName: jsFileName,
            },
          };

          emittedStyles.set(resolvedId.id, style);
        }

        if (style) {
          const styles = importerToStyles.get(importer) ?? new Set();
          styles.add(style);

          importerToStyles.set(importer, styles);
        }
      }

      return resolvedId;
    },
    async transform(code, id) {
      if (!id.endsWith(".css")) return null;

      if (emittedStyles.has(id)) {
        const style = emittedStyles.get(id)!;

        style.css.code = code;
      }

      return {
        code: "export default {}",
      };
    },
    async generateBundle() {
      for (const [, style] of emittedStyles) {
        this.setAssetSource(style.css.referenceId, style.css.code);

        let importStatements = `import "${relative(
          style.js.fileName,
          style.css.fileName
        )}";\n`;
        const moduleInfo = this.getModuleInfo(style.css.importer);
        if (moduleInfo) {
          for (const importedId of moduleInfo.importedIds) {
            const styleDependencies = importerToStyles.get(importedId);
            if (styleDependencies) {
              for (const styleDependency of styleDependencies) {
                importStatements += `import "${relative(
                  style.js.fileName,
                  styleDependency.css.fileName
                )}";\n`;
              }
            }
          }
        }

        this.setAssetSource(style.js.referenceId, importStatements);
      }

      emittedStyles.clear();
      importerToStyles.clear();
    },
  };
}
