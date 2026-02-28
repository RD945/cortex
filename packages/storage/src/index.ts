/**
 * @cortex/storage - Storage abstraction with multiple backend support
 *
 * This package provides a unified interface for object storage with
 * support for local filesystem, S3-compatible backends, and in-memory storage.
 *
 * ## Usage
 *
 * Import the core types and key utilities from the main export:
 * ```typescript
 * import { buildKey, parseKey, assetPrefix } from '@cortex/storage';
 * import type { Storage, ObjectMetadata } from '@cortex/storage';
 * ```
 *
 * Import adapters from their specific paths:
 * ```typescript
 * import { LocalStorage } from '@cortex/storage/local';
 * import { MemoryStorage } from '@cortex/storage/memory';
 * ```
 */

// Re-export everything from core
export * from "./core/index.js";
