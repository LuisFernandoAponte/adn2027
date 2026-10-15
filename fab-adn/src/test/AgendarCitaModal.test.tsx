import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgendarCitaModal from '@/components/AgendarCitaModal';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { empleados: [], servicios: [] } }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('AgendarCitaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(<AgendarCitaModal isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renderiza el modal cuando isOpen es true', () => {
    render(<AgendarCitaModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Agendar Cita')).toBeDefined();
    expect(screen.getByText('Tipo de Servicio')).toBeDefined();
    expect(screen.getByText('Empleado')).toBeDefined();
    expect(screen.getByText('Servicios')).toBeDefined();
  });

  it('muestra opciones de tipo de servicio', () => {
    render(<AgendarCitaModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Revision (09:00 AM - 12:00 PM)')).toBeDefined();
    expect(screen.getByText('Reparacion (02:00 PM - 06:00 PM)')).toBeDefined();
  });

  it('tiene boton Volver y Confirmar Cita', () => {
    render(<AgendarCitaModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Volver')).toBeDefined();
    expect(screen.getByText('Confirmar Cita')).toBeDefined();
  });
});
