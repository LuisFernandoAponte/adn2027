export interface Usuario {
  id: string;
  nombre_completo: string;
  email: string;
  password?: string;
  telefono: string;
  direccion: string;
  sexo: string;
  rol: string;
  rol_id: string;
  estado: number;
  fecha_reg?: string;
  cargo?: string;
}