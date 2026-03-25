import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { IRepository, ITransactionRunner, RepositoryFindManyOptions } from './contracts';

function resolveStorePath(relativePath: string) {
  const cwdResolved = resolve(process.cwd(), relativePath);
  if (cwdResolved.includes('/apps/api/')) {
    return cwdResolved;
  }

  return resolve(process.cwd(), 'apps/api', relativePath);
}

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

  resolvePath() {
    return resolveStorePath(this.relativePath);
  }
}

export class FileJsonRepository<T extends { id: string }, TState> implements IRepository<T>, ITransactionRunner {
  constructor(
    protected readonly store: FileJsonStore<TState>,
    private readonly selectCollection: (state: TState) => T[],
  ) {}

  findById(id: string) {
    return this.findMany({ predicate: (entity) => entity.id === id })[0];
  }

  findMany(options?: RepositoryFindManyOptions<T>) {
    const entities = [...this.selectCollection(this.store.read())];
    const filtered = options?.predicate ? entities.filter(options.predicate) : entities;
    const offset = options?.offset ?? 0;
    const limited = filtered.slice(offset);
    return typeof options?.limit === 'number' ? limited.slice(0, options.limit) : limited;
  }

  create(entity: T) {
    this.store.update((state) => {
      this.selectCollection(state).unshift(entity);
    });
    return entity;
  }

  update(id: string, updater: Partial<T> | ((current: T) => T)) {
    return this.store.update((state) => {
      const collection = this.selectCollection(state);
      const index = collection.findIndex((entity) => entity.id === id);
      if (index === -1) return undefined;

      const current = collection[index]!;
      collection[index] = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return collection[index];
    });
  }

  delete(id: string) {
    return this.store.update((state) => {
      const collection = this.selectCollection(state);
      const index = collection.findIndex((entity) => entity.id === id);
      if (index === -1) return false;
      collection.splice(index, 1);
      return true;
    });
  }

  runInTransaction<R>(work: () => R): R {
    return work();
  }
}
