import 'reflect-metadata';
import { jest } from '@jest/globals';

// Native ESM gives no global jest object; specs use it as in CommonJS (spec 020).
Object.assign(globalThis, { jest });
