/**
 * @safe-ugc-ui/react — Barrel Export
 *
 * Public API for the React rendering package.
 */

// Top-level renderer
export { UGCRenderer } from './UGCRenderer.js';
export type { UGCRendererProps } from './UGCRenderer.js';

// Security isolation container
export { UGCContainer } from './UGCContainer.js';

// Individual components
export { Box, Row, Column, Text, Image } from './components/index.js';

// Node renderer (for advanced usage)
export { renderNode, renderTree } from './node-renderer.js';

// Utilities
export { resolveRef, resolveValue } from './state-resolver.js';
export { mapStyle } from './style-mapper.js';
export { resolveAsset } from './asset-resolver.js';
export type { AssetMap } from './asset-resolver.js';
