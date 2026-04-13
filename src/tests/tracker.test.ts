import { describe, it, expect } from 'vitest';
import { fmtDecimal } from '../tracker.js';

describe('fmtDecimal', () => {
  it('formats 0 minutes as 0.0h', () => {
    expect(fmtDecimal(0)).toBe('0.0h');
  });

  it('formats 60 minutes as 1.0h', () => {
    expect(fmtDecimal(60)).toBe('1.0h');
  });

  it('formats 408 minutes as 6.8h', () => {
    expect(fmtDecimal(408)).toBe('6.8h');
  });

  it('formats 90 minutes as 1.5h', () => {
    expect(fmtDecimal(90)).toBe('1.5h');
  });

  it('formats 720 minutes as 12.0h', () => {
    expect(fmtDecimal(720)).toBe('12.0h');
  });
});
