// Excel export functionality for ADN Motors
import * as XLSX from 'xlsx';

export interface ServiceRecord {
  id: number;
  cliente: string;
  vehiculo: string;
  placa: string;
  servicio: string;
  mecanico: string;
  costo: number;
  estado: 'Pendiente' | 'En Proceso' | 'Completado';
  fecha: string;
  imagen?: string;
}

export const exportToExcel = (data: ServiceRecord[], filename: string = 'Servicios_ADN') => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Prepare data for Excel
  const excelData = data.map(record => ({
    'Nro': record.id,
    'Cliente': record.cliente,
    'Vehículo': record.vehiculo,
    'Placa': record.placa,
    'Servicio': record.servicio,
    'Mecánico': record.mecanico,
    'Costo (Bs.)': record.costo,
    'Estado': record.estado,
    'Fecha': record.fecha,
    'Imagen': record.imagen || 'Sin imagen'
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  const colWidths = [
    { wch: 5 },  // Nro
    { wch: 20 }, // Cliente
    { wch: 25 }, // Vehículo
    { wch: 10 }, // Placa
    { wch: 20 }, // Servicio
    { wch: 20 }, // Mecánico
    { wch: 12 }, // Costo
    { wch: 12 }, // Estado
    { wch: 12 }, // Fecha
    { wch: 30 }  // Imagen
  ];
  ws['!cols'] = colWidths;

  // Style header row
  const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1'];
  headerCells.forEach(cell => {
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '000000' } },
        alignment: { horizontal: 'center' }
      };
    }
  });

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Servicios_ADN');

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, finalFilename);
};

export const generateMockData = (): ServiceRecord[] => {
  return [
    {
      id: 1,
      cliente: 'Carlos Mendoza',
      vehiculo: 'Toyota Corolla 2018',
      placa: 'ABC-123',
      servicio: 'Cambio de Aceite',
      mecanico: 'Igor Andrés Bascope',
      costo: 250,
      estado: 'Completado',
      fecha: '2024-01-15',
      imagen: 'imagen1.jpg'
    },
    {
      id: 2,
      cliente: 'María González',
      vehiculo: 'Hyundai Accent 2020',
      placa: 'DEF-456',
      servicio: 'Frenos',
      mecanico: 'Rodei Takeshi Omura',
      costo: 450,
      estado: 'En Proceso',
      fecha: '2024-01-16'
    },
    {
      id: 3,
      cliente: 'Luis Rodriguez',
      vehiculo: 'Chevrolet Cruze 2019',
      placa: 'GHI-789',
      servicio: 'Alineación y Balanceo',
      mecanico: 'David Eduardo Nogales Vaca',
      costo: 180,
      estado: 'Pendiente',
      fecha: '2024-01-17'
    }
  ];
};