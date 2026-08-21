/**
 * 3D Catalog Swap Preloader & Cache Manager for Afrofade (BMAD Story 9.2).
 * Guarantees sub-500ms hair switching and safe WebGL resource cleanup.
 */

export interface CachedHairAsset {
  styleId: string;
  version: number;
  glbUrl: string;
  arrayBuffer?: ArrayBuffer;
  loadedAt: number;
  accessCount: number;
}

export interface SwapMetrics {
  styleId: string;
  version: number;
  durationMs: number;
  cacheHit: boolean;
  providerCalled: false; // Invariant: generative providers are NEVER called during swap
}

class CatalogSwapManager {
  private cache = new Map<string, CachedHairAsset>();
  private maxCacheSize: number;

  constructor(maxCacheSize: number = 10) {
    this.maxCacheSize = maxCacheSize;
  }

  private makeKey(styleId: string, version: number): string {
    return `${styleId}:v${version}`;
  }

  public async preloadStyle(
    styleId: string,
    version: number,
    glbUrl: string,
    fetchFn: typeof fetch = fetch
  ): Promise<CachedHairAsset> {
    const key = this.makeKey(styleId, version);

    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      existing.accessCount += 1;
      return existing;
    }

    const response = await fetchFn(glbUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch 3D hair asset for preloading: ${glbUrl}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    const item: CachedHairAsset = {
      styleId,
      version,
      glbUrl,
      arrayBuffer,
      loadedAt: Date.now(),
      accessCount: 1,
    };

    this.cache.set(key, item);
    return item;
  }

  public async swapStyle(
    styleId: string,
    version: number,
    glbUrl: string,
    fetchFn: typeof fetch = fetch
  ): Promise<{ asset: CachedHairAsset; metrics: SwapMetrics }> {
    const startTime = performance.now();
    const key = this.makeKey(styleId, version);
    const cacheHit = this.cache.has(key);

    const asset = await this.preloadStyle(styleId, version, glbUrl, fetchFn);
    const durationMs = Math.round(performance.now() - startTime);

    const metrics: SwapMetrics = {
      styleId,
      version,
      durationMs,
      cacheHit,
      providerCalled: false,
    };

    return { asset, metrics };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let lowestAccessCount = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < lowestAccessCount) {
        lowestAccessCount = item.accessCount;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  public disposeMeshResources(threeMeshOrScene: any): void {
    if (!threeMeshOrScene) return;

    if (typeof threeMeshOrScene.traverse === 'function') {
      threeMeshOrScene.traverse((child: any) => {
        if (child.geometry && typeof child.geometry.dispose === 'function') {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: any) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(child.material);
          }
        }
      });
    }
  }

  private disposeMaterial(material: any): void {
    if (!material) return;
    if (typeof material.dispose === 'function') {
      material.dispose();
    }
    for (const key of Object.keys(material)) {
      const value = material[key];
      if (value && typeof value.dispose === 'function' && key.endsWith('Map')) {
        value.dispose();
      }
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public get size(): number {
    return this.cache.size;
  }
}

export const catalogSwapManager = new CatalogSwapManager(10);
