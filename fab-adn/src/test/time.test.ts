import { describe, it, expect } from 'vitest';
import { formatAMPM } from '@/lib/time';

describe('formatAMPM', () => {
  it('convierte 00:00 a 12:00 AM', () => {
    expect(formatAMPM('00:00:00')).toBe('12:00 AM');
  });

  it('convierte 08:00 a 08:00 AM', () => {
    expect(formatAMPM('08:00:00')).toBe('08:00 AM');
  });

  it('convierte 11:59 a 11:59 AM', () => {
    expect(formatAMPM('11:59:00')).toBe('11:59 AM');
  });

  it('convierte 12:00 a 12:00 PM', () => {
    expect(formatAMPM('12:00:00')).toBe('12:00 PM');
  });

  it('convierte 14:30 a 02:30 PM', () => {
    expect(formatAMPM('14:30:00')).toBe('02:30 PM');
  });

  it('convierte 23:59 a 11:59 PM', () => {
    expect(formatAMPM('23:59:00')).toBe('11:59 PM');
  });

  it('maneja formato corto HH:mm', () => {
    expect(formatAMPM('08:00')).toBe('08:00 AM');
    expect(formatAMPM('16:00')).toBe('04:00 PM');
  });

  it('retorna string vacio para null/undefined', () => {
    expect(formatAMPM(null)).toBe('');
    expect(formatAMPM(undefined)).toBe('');
  });

  it('retorna el mismo string si no puede parsear', () => {
    expect(formatAMPM('')).toBe('');
    expect(formatAMPM('invalido')).toBe('invalido');
  });
});
