export interface RepositoryFindManyOptions<T> {
  predicate?: (entity: T) => boolean;
  limit?: number;
  offset?: number;
}

export interface IRepository<T extends { id: string }> {
  findById(id: string): T | undefined;
  findMany(options?: RepositoryFindManyOptions<T>): T[];
  create(entity: T): T;
  update(id: string, updater: Partial<T> | ((current: T) => T)): T | undefined;
  delete(id: string): boolean;
}

export interface ITransactionRunner {
  runInTransaction<T>(work: () => T): T;
}
