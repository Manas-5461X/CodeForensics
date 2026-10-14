import { describe, it, expect } from 'vitest';
import {
  PaginationParamsSchema,
  RepositoryParamsSchema,
  HealthResponseSchema,
  ClaimCategorySchema,
} from '../src/index.js';

describe('Shared Schemas and Enums', () => {
  it('validates default pagination parameters', () => {
    const parsed = PaginationParamsSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(25);
  });

  it('validates custom pagination parameters within limits', () => {
    const parsed = PaginationParamsSchema.parse({ page: '3', limit: '50' });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(50);
  });

  it('rejects invalid pagination limits', () => {
    expect(() => PaginationParamsSchema.parse({ limit: 500 })).toThrow();
    expect(() => PaginationParamsSchema.parse({ page: 0 })).toThrow();
  });

  it('validates repository owner and name params', () => {
    const parsed = RepositoryParamsSchema.parse({ owner: 'facebook', repo: 'react' });
    expect(parsed.owner).toBe('facebook');
    expect(parsed.repo).toBe('react');
  });

  it('rejects empty repository params', () => {
    expect(() => RepositoryParamsSchema.parse({ owner: '', repo: '' })).toThrow();
  });

  it('strictly validates claim categories (FACT, INFERENCE, HYPOTHESIS, UNKNOWN)', () => {
    expect(ClaimCategorySchema.parse('FACT')).toBe('FACT');
    expect(ClaimCategorySchema.parse('INFERENCE')).toBe('INFERENCE');
    expect(ClaimCategorySchema.parse('HYPOTHESIS')).toBe('HYPOTHESIS');
    expect(ClaimCategorySchema.parse('UNKNOWN')).toBe('UNKNOWN');
    expect(() => ClaimCategorySchema.parse('CERTAIN_BUG')).toThrow();
  });

  it('validates health response structure', () => {
    const health = {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 120,
      services: {
        database: 'connected',
        redis: 'connected',
      },
    };
    expect(HealthResponseSchema.parse(health)).toEqual(health);
  });
});
