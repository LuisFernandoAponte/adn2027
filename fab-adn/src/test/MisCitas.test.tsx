import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MisCitas } from '@/pages/MisCitas';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/api/citaApi', () => ({
  obtenerMisCitas: vi.fn(),
}));

import { obtenerMisCitas } from '@/api/citaApi';

describe('MisCitas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra loading al inicio', () => {
    vi.mocked(obtenerMisCitas).mockReturnValue(new Promise(() => {}));
    render(<MisCitas />);
    expect(screen.getByText('Cargando tus citas...')).toBeDefined();
  });

  it('muestra estado vacio cuando no hay citas', async () => {
    vi.mocked(obtenerMisCitas).mockResolvedValue([]);
    render(<MisCitas />);
    await waitFor(() => {
      expect(screen.getByText('No tienes citas registradas')).toBeDefined();
    });
  });

  it('muestra la lista de citas', async () => {
    vi.mocked(obtenerMisCitas).mockResolvedValue([
      {
        id: 1,
        fecha_cita: '2026-06-20',
        hora_inicio: '09:00:00',
        estado: 'Agendado',
      },
      {
        id: 2,
        fecha_cita: '2026-06-22',
        hora_inicio: '14:30:00',
        estado: 'Completado',
      },
    ]);
    render(<MisCitas />);
    await waitFor(() => {
      expect(screen.getByText('Cita #1')).toBeDefined();
      expect(screen.getByText('Cita #2')).toBeDefined();
      expect(screen.getAllByText('Agendado').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Completado').length).toBeGreaterThan(0);
    });
  });
});
