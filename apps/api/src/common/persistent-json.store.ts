import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export class PersistentJsonStore<T> {
  private state: T;

  constructor(
    relativeFilePath: string,
    private readonly createInitialState: () => T,
  ) {
    const filePath = resolve(process.cwd(), relativeFilePath);
    this.filePath = filePath;
    mkdirSync(dirname(filePath), { recursive: true });
    this.state = this.load();
  }

  private readonly filePath: string;

  get(): T {
    return this.state;
  }

  replace(nextState: T) {
    this.state = nextState;
    this.persist();
  }

  update(mutator: (draft: T) => void): T {
    const draft = this.clone(this.state);
    mutator(draft);
    this.state = draft;
    this.persist();
    return this.state;
  }

  snapshot(): T {
    return this.clone(this.state);
  }

  private load(): T {
    if (!existsSync(this.filePath)) {
      const initialState = this.createAndPersistInitialState();
      return initialState;
    }

    try {
      const raw = readFileSync(this.filePath, 'utf8').trim();
      if (!raw) {
        return this.createAndPersistInitialState();
      }
      return JSON.parse(raw) as T;
    } catch {
      return this.createAndPersistInitialState();
    }
  }

  private createAndPersistInitialState() {
    const initialState = this.createInitialState();
    writeFileSync(this.filePath, JSON.stringify(initialState, null, 2));
    return initialState;
  }

  private persist() {
    writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  private clone(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
