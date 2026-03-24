import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

export class FileJsonStore<T> {
  constructor(
    private readonly relativePath: string,
    private readonly seed: () => T,
  ) {}

  read(): T {
    const filePath = this.resolvePath();
    if (!existsSync(filePath)) {
      const initialValue = this.seed();
      this.write(initialValue);
      return initialValue;
    }

    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  }

  write(value: T) {
    const filePath = this.resolvePath();
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(value, null, 2));
  }

  update<R>(updater: (value: T) => R): R {
    const current = this.read();
    const result = updater(current);
    this.write(current);
    return result;
  }

  private resolvePath() {
    return resolve(process.cwd(), this.relativePath);
  }
}
