export type PersistenceAdapter = 'file' | 'db';

export function resolvePersistenceAdapter(): PersistenceAdapter {
  const configured = (process.env.GP_PERSISTENCE_ADAPTER ?? process.env.PERSISTENCE_ADAPTER ?? '').trim().toLowerCase();
  if (configured === 'db') {
    return 'db';
  }

  return 'file';
}

export function isDbPersistenceEnabled() {
  return resolvePersistenceAdapter() === 'db' && Boolean(process.env.DATABASE_URL);
}
