import { readFileSync } from "node:fs";

export function fail(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

/** Extract a readable message from an unknown error (catch is typed as `unknown` in TS). */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Shared wrapper for entry points (bin/*). Runs `main`, uses its return value
 * as the exit code (defaults to 0 if non-numeric), and prints any error before
 * exiting with code 1.
 */
export async function runCli(
  main: () => number | void | Promise<number | void>,
): Promise<never> {
  try {
    const code = await main();
    process.exit(typeof code === "number" ? code : 0);
  } catch (error) {
    fail(errorMessage(error));
  }
}

export function readJsonFile(absolutePath: string): unknown {
  let fileContents: string;
  try {
    fileContents = readFileSync(absolutePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`File does not exist: ${absolutePath}`);
    }
    throw new Error(`Failed to read file: ${absolutePath}\n${errorMessage(error)}`);
  }
  try {
    return JSON.parse(fileContents);
  } catch (error) {
    throw new Error(`File is not valid JSON: ${absolutePath}\n${errorMessage(error)}`);
  }
}
