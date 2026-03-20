import type { TransformOptions } from "oxc-transform";
import type { LoaderContext } from "webpack";
import path from "node:path";
import { getTsconfig } from "get-tsconfig";

export interface OxcLoaderOptions extends Omit<TransformOptions, "sourcemap"> {
  /**
   * Enable source map generation.
   * When not specified, falls back to webpack's own `this.sourceMap` setting
   * (determined by the `devtool` option).
   * @default undefined (inherits from webpack)
   */
  sourcemap?: boolean;

  /**
   * Enable React Fast Refresh for development.
   * Passed as `jsx.refresh` to oxc-transform when autoDetectJsx is active.
   * @default false
   */
  refresh?: boolean;

  /**
   * Automatically detect and configure JSX based on file extension.
   * When enabled, `.jsx`/`.tsx` files receive `runtime: "automatic"` and
   * `development` is derived from webpack's `mode` (unless already set).
   * @default true
   */
  autoDetectJsx?: boolean;

  /**
   * Enable automatic tsconfig.json detection and configuration.
   * @default true
   */
  useTsconfig?: boolean;

  /**
   * Custom path to tsconfig.json file.
   * If not specified, will search for tsconfig.json from `rootContext`.
   */
  tsconfigPath?: string;

  /**
   * Use the synchronous oxc-transform API (`transformSync`) instead of the
   * default asynchronous one. This avoids promise overhead and can be faster
   * in certain build pipelines.
   *
   * Note: the oxc-transform module is still loaded asynchronously the first
   * time the loader runs; subsequent calls reuse the cached module.
   * @default false
   */
  sync?: boolean;
}

/**
 * Extract relevant options from tsconfig.json for oxc-transform
 */
function extractTsconfigOptions(tsconfigPath: string): Partial<TransformOptions> {
  try {
    const tsconfig = getTsconfig(tsconfigPath);
    if (!tsconfig) {
      return {};
    }

    const { compilerOptions } = tsconfig.config;
    if (!compilerOptions) {
      return {};
    }

    const options: Partial<TransformOptions> = {};

    // Map TypeScript compiler options to oxc-transform options
    if (compilerOptions.target) {
      // Convert TypeScript target to oxc target
      const targetMap: Record<string, string> = {
        ES3: "es3",
        ES5: "es5",
        ES6: "es2015",
        ES2015: "es2015",
        ES2016: "es2016",
        ES2017: "es2017",
        ES2018: "es2018",
        ES2019: "es2019",
        ES2020: "es2020",
        ES2021: "es2021",
        ES2022: "es2022",
        ESNext: "esnext",
      };
      const target = targetMap[compilerOptions.target.toUpperCase()];
      if (target) {
        options.target = target;
      }
    }

    // Handle JSX configuration
    if (compilerOptions.jsx) {
      const jsxOptions: any = {};

      switch (compilerOptions.jsx) {
        case "react":
          jsxOptions.runtime = "classic";
          break;
        case "react-jsx":
          jsxOptions.runtime = "automatic";
          break;
        case "react-jsxdev":
          jsxOptions.runtime = "automatic";
          jsxOptions.development = true;
          break;
        case "preserve":
          // Don't transform JSX
          break;
      }

      if (compilerOptions.jsxFactory) {
        jsxOptions.pragma = compilerOptions.jsxFactory;
      }

      if (compilerOptions.jsxFragmentFactory) {
        jsxOptions.pragmaFrag = compilerOptions.jsxFragmentFactory;
      }

      if (compilerOptions.jsxImportSource) {
        jsxOptions.importSource = compilerOptions.jsxImportSource;
      }

      if (Object.keys(jsxOptions).length > 0) {
        options.jsx = jsxOptions;
      }
    }

    // Handle TypeScript-specific options
    const typescriptOptions: any = {};

    if (compilerOptions.allowImportingTsExtensions) {
      typescriptOptions.rewrite_import_extensions = "rewrite";
    }

    if (compilerOptions.verbatimModuleSyntax) {
      typescriptOptions.only_remove_type_imports = true;
    }

    if (Object.keys(typescriptOptions).length > 0) {
      options.typescript = typescriptOptions;
    }
    return options;
  } catch (error) {
    // If tsconfig.json reading fails, return empty options
    console.warn(`Failed to read tsconfig.json: ${error}`);
    return {};
  }
}

// Cache the oxc-transform module promise so it is only loaded once per worker
// regardless of how many files are processed.  The dynamic import is needed
// because oxc-transform is an ESM-only package and must be imported
// asynchronously even from a CJS build of this loader.
const _oxcModulePromise = import("oxc-transform");

/**
 * Factory that produces a loader function.  Exposed as `oxcLoader.custom` so
 * callers can create isolated loader instances with their own defaults.
 */
export function makeLoader() {
  return async function oxcLoader(
    this: LoaderContext<OxcLoaderOptions>,
    source: string,
  ): Promise<void> {
    // Get the callback for async operation
    const callback = this.async();
    if (!callback) {
      throw new Error("oxc-loader requires async operation");
    }

    try {
      // Await the cached module (resolves immediately after the first call)
      const oxcModule = await _oxcModulePromise;
      // Get loader options from webpack loader context
      const options: OxcLoaderOptions = this.getOptions() || {};

      // Strip loader-specific keys before building oxc transform options
      const { autoDetectJsx, refresh, useTsconfig, tsconfigPath, sourcemap, sync, ...oxcOptions } =
        options;

      // ── Source map ────────────────────────────────────────────────────────
      // When the caller has not explicitly set `sourcemap`, fall back to
      // webpack's own decision (driven by `devtool`).  This matches the
      // behaviour of the authoritative oxc-webpack-loader reference.
      const sourceMaps = sourcemap === undefined ? this.sourceMap : sourcemap;

      // ── tsconfig ──────────────────────────────────────────────────────────
      let tsconfigOptions: Partial<TransformOptions> = {};
      if (useTsconfig !== false) {
        const tsconfigSearchPath = tsconfigPath || this.rootContext;
        tsconfigOptions = extractTsconfigOptions(tsconfigSearchPath);
      }

      // ── Language detection ────────────────────────────────────────────────
      const filename = this.resourcePath;
      const ext = path.extname(filename).slice(1);

      let lang: TransformOptions["lang"];
      switch (ext) {
        case "ts":
          lang = "ts";
          break;
        case "tsx":
          lang = "tsx";
          break;
        case "jsx":
          lang = "jsx";
          break;
        case "js":
        default:
          lang = "js";
          break;
      }

      // ── JSX auto-configuration for .jsx/.tsx ──────────────────────────────
      // When autoDetectJsx is enabled (default), .jsx and .tsx files receive
      // JSX transform defaults that can be individually overridden by the user.
      const shouldConfigureJsx = autoDetectJsx !== false && (lang === "jsx" || lang === "tsx");

      let jsxOptions = options.jsx;
      if (shouldConfigureJsx && !jsxOptions) {
        jsxOptions = {
          runtime: "automatic",
          // Only inject `development` when the user has not already set it
          development: this.mode === "development",
          refresh: !!(refresh && this.mode === "development"),
        };
      } else if (shouldConfigureJsx && typeof jsxOptions === "object") {
        jsxOptions = {
          runtime: "automatic",
          // Only inject `development` when the user has not already set it
          ...(!Object.hasOwn(jsxOptions, "development") && this.mode
            ? { development: this.mode === "development" }
            : {}),
          refresh: !!(refresh && this.mode === "development"),
          // User values always win
          ...jsxOptions,
        };
      }

      // ── JSX lang promotion for plain .js/.ts with jsx options ─────────────
      // When jsx options are supplied but the file uses a plain .js or .ts
      // extension, automatically promote the lang so the parser handles JSX
      // syntax — matching the behaviour of oxc-webpack-loader.
      if (!options.lang && jsxOptions && jsxOptions !== "preserve") {
        if (ext === "js") {
          lang = "jsx";
        } else if (ext === "ts") {
          lang = "tsx";
        }
      }

      // ── Build final JSX option ────────────────────────────────────────────
      const tsconfigJsxOption = tsconfigOptions.jsx;
      const tsconfigJsxObj =
        typeof tsconfigJsxOption === "object" && tsconfigJsxOption !== null
          ? tsconfigJsxOption
          : undefined;

      const jsxOptionsObj =
        typeof jsxOptions === "object" && jsxOptions !== null ? jsxOptions : undefined;

      let finalJsx: TransformOptions["jsx"] | undefined;
      if (jsxOptions === "preserve") {
        finalJsx = "preserve";
      } else if (jsxOptionsObj || tsconfigJsxObj) {
        const merged = { ...tsconfigJsxObj, ...jsxOptionsObj };
        finalJsx = Object.keys(merged).length > 0 ? merged : undefined;
      } else if (tsconfigJsxOption === "preserve") {
        finalJsx = "preserve";
      }

      // ── Final transform options ───────────────────────────────────────────
      const transformOptions: TransformOptions = {
        // tsconfig values provide the baseline
        ...tsconfigOptions,
        // user oxcOptions override tsconfig (jsx handled separately below)
        ...oxcOptions,
        lang,
        jsx: finalJsx,
        sourcemap: !!sourceMaps,
        cwd: this.rootContext,
      };

      // ── Helpers ───────────────────────────────────────────────────────────
      function formatErrors(errors: Array<{ message: string; codeframe?: string | null }>): string {
        return errors
          .map((e) => `${e.message}${e.codeframe ? `\n${e.codeframe}` : ""}`)
          .join("\n\n");
      }

      function toWebpackSourceMap(
        map:
          | {
              version: number;
              sources: string[];
              names: string[];
              mappings: string;
              file?: string;
              sourcesContent?: (string | null)[] | null;
              sourceRoot?: string;
            }
          | undefined,
      ) {
        if (!map) return undefined;
        return {
          version: map.version as 3,
          sources: map.sources,
          names: map.names,
          mappings: map.mappings,
          file: map.file || filename,
          // webpack's RawSourceMap requires string[], not (string | null)[]
          sourcesContent: map.sourcesContent ? map.sourcesContent.map((s) => s ?? "") : undefined,
          sourceRoot: map.sourceRoot,
        };
      }

      // ── Dispatch: sync vs async ───────────────────────────────────────────
      if (sync) {
        // Use transformSync for lower latency.  The module is guaranteed to be
        // cached by this point because we awaited _oxcModulePromise above.
        const { transformSync } = oxcModule;
        try {
          const output = transformSync(filename, source, transformOptions);
          if (output.errors.length > 0) {
            callback(new Error(`Oxc transform errors:\n${formatErrors(output.errors)}`));
            return;
          }
          callback(null, output.code, toWebpackSourceMap(output.map));
        } catch (e) {
          callback(e instanceof Error ? e : new Error(String(e)));
        }
      } else {
        const { transform } = oxcModule;
        const output = await transform(filename, source, transformOptions);
        if (output.errors.length > 0) {
          callback(new Error(`Oxc transform errors:\n${formatErrors(output.errors)}`));
          return;
        }
        callback(null, output.code, toWebpackSourceMap(output.map));
      }
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

const oxcLoader = makeLoader();

/**
 * Default export: the loader function ready to be used directly in webpack/rspack.
 *
 * @example
 * // webpack.config.js
 * module.exports = {
 *   module: { rules: [{ test: /\.[jt]sx?$/, loader: 'oxc-loader' }] }
 * }
 */
export default oxcLoader;
