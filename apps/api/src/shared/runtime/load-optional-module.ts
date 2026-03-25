function isMissingModuleError(error: unknown, specifier: string) {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  return code === 'ERR_MODULE_NOT_FOUND'
    || code === 'MODULE_NOT_FOUND'
    || error.message.includes(`Cannot find module '${specifier}'`)
    || error.message.includes(`Cannot find package '${specifier}'`)
    || error.message.includes(`Cannot find package "${specifier}"`);
}

export async function loadOptionalModule<TModule = unknown>(specifier: string): Promise<TModule | null> {
  try {
    const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (modulePath: string) => Promise<TModule>;
    return await dynamicImport(specifier);
  } catch (error) {
    if (isMissingModuleError(error, specifier)) {
      return null;
    }
    throw error;
  }
}
