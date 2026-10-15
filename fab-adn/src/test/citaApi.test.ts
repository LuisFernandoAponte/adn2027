import { describe, it, expect } from 'vitest';
import { ESTADOS_CITA } from '@/api/citaApi';

describe('ESTADOS_CITA', () => {
  it('incluye Cancelado en los estados disponibles', () => {
    expect(ESTADOS_CITA).toContain('Cancelado');
  });

  it('tiene 7 estados definidos', () => {
    expect(ESTADOS_CITA.length).toBe(7);
  });

  it('incluye todos los estados necesarios', () => {
    const required = ['Agendado', 'En taller', 'En progreso', 'En revisión', 'Completado', 'Entregado', 'Cancelado'];
    required.forEach(e => expect(ESTADOS_CITA).toContain(e));
  });
});
