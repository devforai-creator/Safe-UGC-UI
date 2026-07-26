/**
 * @safe-ugc-ui/react — Asset Resolver
 *
 * Maps @assets/ paths used by card creators to actual platform-provided URLs.
 * Card authors reference assets as "@assets/name.png", and the hosting platform
 * provides a mapping to network, blob:, relative, or safe raster data: URLs.
 */

export type AssetMap = Record<string, string>;

const RESOLVED_ASSET_URL_BASE = 'https://safe-ugc-ui.invalid/';
const SAFE_DATA_IMAGE_MEDIA_TYPES = new Set([
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/x-icon',
]);

/**
 * Resolve an asset path to its actual URL.
 *
 * Card creators use `@assets/name.png`; the platform provides actual URLs.
 * Looks up by full path first, then by the key after `@assets/`.
 *
 * @param path - The asset path (e.g. "@assets/avatar.png")
 * @param assets - The asset map from the platform
 * @returns The resolved URL, or undefined if not found
 */
export function resolveAsset(path: string, assets: AssetMap): string | undefined {
  if (!path.startsWith('@assets/')) return undefined;

  // Try full path match first
  if (path in assets) return assets[path];

  // Try key-only match (strip @assets/ prefix)
  const key = path.slice('@assets/'.length);
  if (key in assets) return assets[key];

  return undefined;
}

function isSafeDataImageUrl(url: string): boolean {
  const metadataEnd = url.indexOf(',');
  if (metadataEnd === -1) return false;

  const metadata = url.slice('data:'.length, metadataEnd);
  const mediaType = metadata.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType !== undefined && SAFE_DATA_IMAGE_MEDIA_TYPES.has(mediaType);
}

export function isSafeResolvedAssetUrl(url: string): boolean {
  const normalized = url.trim();
  if (normalized.length === 0 || normalized.toLowerCase().startsWith('@assets/')) {
    return false;
  }

  let protocol: string;
  try {
    protocol = new URL(normalized, RESOLVED_ASSET_URL_BASE).protocol.toLowerCase();
  } catch {
    return false;
  }

  if (protocol === 'data:') {
    return isSafeDataImageUrl(normalized);
  }

  return protocol === 'http:' || protocol === 'https:' || protocol === 'blob:';
}
