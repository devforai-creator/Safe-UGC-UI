/**
 * @safe-ugc-ui/react — Asset Resolver
 *
 * Maps @assets/ paths used by card creators to actual platform-provided URLs.
 * Card authors reference assets as "@assets/name.png", and the hosting platform
 * provides a mapping to real URLs (blob:, data:, or CDN URLs).
 */

export type AssetMap = Record<string, string>;

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
export function resolveAsset(
  path: string,
  assets: AssetMap,
): string | undefined {
  if (!path.startsWith('@assets/')) return undefined;

  // Try full path match first
  if (path in assets) return assets[path];

  // Try key-only match (strip @assets/ prefix)
  const key = path.slice('@assets/'.length);
  if (key in assets) return assets[key];

  return undefined;
}
