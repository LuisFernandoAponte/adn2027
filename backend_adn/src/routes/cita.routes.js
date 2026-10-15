import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  listarParaAdmin,
  listarParaEmpleado,
  cambiarEstado,
  cambiarEstadoEmpleado,
  obtenerMisCitas,
  agregarRepuestoACita,
  quitarRepuestoDeCita,
  crearTrabajoAdmin,
  obtenerHistorialVehiculo,
  eliminarTrabajo,
  subirFotoCita,
  eliminarFotoCita,
  actualizarInformeTecnico
} from '../controllers/cita.controller.js';

const router = Router();

router.get('/admin/citas', verifyToken, listarParaAdmin);
router.post('/admin/citas', verifyToken, crearTrabajoAdmin);
router.patch('/admin/citas/:citaId/estado', verifyToken, cambiarEstado);
router.post('/admin/citas/:citaId/repuestos', verifyToken, agregarRepuestoACita);
router.delete('/admin/citas/:citaId/repuestos/:repuestoId', verifyToken, quitarRepuestoDeCita);
router.get('/admin/vehiculo/:placa/historial', verifyToken, obtenerHistorialVehiculo);
router.get('/citas/admin/vehiculo/:placa/historial', verifyToken, obtenerHistorialVehiculo);
router.delete('/admin/citas/:citaId', verifyToken, eliminarTrabajo);

router.post('/admin/citas/:citaId/fotos', verifyToken, subirFotoCita);
router.delete('/admin/citas/:citaId/fotos', verifyToken, eliminarFotoCita);

router.get('/empleado/citas', verifyToken, listarParaEmpleado);
router.patch('/empleado/citas/:citaId/estado', verifyToken, cambiarEstadoEmpleado);
router.put('/citas/:citaId/informe-tecnico', verifyToken, actualizarInformeTecnico);
router.post('/citas/:citaId/repuestos', verifyToken, agregarRepuestoACita);
router.delete('/citas/:citaId/repuestos/:repuestoId', verifyToken, quitarRepuestoDeCita);

router.get('/cliente/citas', verifyToken, obtenerMisCitas);

export default router;