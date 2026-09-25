import { Blob as NodeBlob } from 'node:buffer';
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// jsdom's Blob can't be structured-cloned into fake-indexeddb (real browsers
// can), so use Node's spec-compliant Blob in tests.
globalThis.Blob = NodeBlob as unknown as typeof Blob;
