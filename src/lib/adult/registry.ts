import {ADULT_ACCESS_PUBLIC_KEY_B64, hasAdultAccess} from './access';
import {decryptRegistry} from './crypto';
import {REGISTRY_BLOB} from './registryBlob';
import type {AdultRegistry} from './types';

export const REGISTRY_SEED_PREFIX = 'ngotak-adult-registry-v1:';

let cachedRegistry: AdultRegistry | null | undefined;

export function loadAdultRegistry(): AdultRegistry | null {
  if (!hasAdultAccess()) {
    return null;
  }
  if (cachedRegistry !== undefined) {
    return cachedRegistry;
  }
  try {
    const json = decryptRegistry(
      REGISTRY_BLOB,
      REGISTRY_SEED_PREFIX + ADULT_ACCESS_PUBLIC_KEY_B64,
    );
    const parsed = json ? JSON.parse(json) : null;
    cachedRegistry =
      parsed && Array.isArray(parsed.sites) && parsed.sites.length > 0
        ? parsed
        : null;
  } catch {
    cachedRegistry = null;
  }
  return cachedRegistry ?? null;
}

export function resetRegistryCache(): void {
  cachedRegistry = undefined;
}
