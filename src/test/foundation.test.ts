import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from '@/src/lib/validation/auth';
import { formatCurrency, formatPercentage } from '@/src/lib/formatting/currency';
import { formatDate } from '@/src/lib/formatting/date';
import { getSupabaseConfig } from '@/src/lib/supabase/client';

describe('Authentication Validation', () => {
  it('validates correct login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'trader@example.com',
      password: 'strongpassword123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email formats', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short passwords', () => {
    const result = loginSchema.safeParse({
      email: 'trader@example.com',
      password: '123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password confirmation on signup', () => {
    const result = signupSchema.safeParse({
      fullName: 'Alex Vance',
      email: 'alex@example.com',
      password: 'password123',
      confirmPassword: 'differentpassword',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Passwords do not match');
    }
  });

  it('accepts valid signup payloads', () => {
    const result = signupSchema.safeParse({
      fullName: 'Alex Vance',
      email: 'alex@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(true);
  });
});

describe('Financial Formatting Utilities', () => {
  it('formats positive currency with and without sign', () => {
    expect(formatCurrency(1250.5)).toBe('$1,250.50');
    expect(formatCurrency(1250.5, { showSign: true })).toBe('+$1,250.50');
  });

  it('formats negative currency correctly', () => {
    expect(formatCurrency(-450.25)).toBe('-$450.25');
  });

  it('formats percentages correctly', () => {
    expect(formatPercentage(65.4)).toBe('+65.40%');
    expect(formatPercentage(-12.8)).toBe('-12.80%');
  });

  it('formats dates consistently', () => {
    const date = new Date('2026-10-08T12:00:00Z');
    const formatted = formatDate(date);
    expect(formatted).toContain('2026');
  });
});

describe('Supabase Client Configuration', () => {
  it('exports configuration reader without crashing', () => {
    const config = getSupabaseConfig();
    expect(typeof config.isConfigured).toBe('boolean');
  });
});
