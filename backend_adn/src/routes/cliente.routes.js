import { Router } from 'express';
import { verifyToken, requireVerifiedEmail } from '../middlewares/auth.middleware.js';
import { register } from '../controllers/auth.controller.js';
import {
  getEmpleadosDisponibles,
  getHorariosDisponibles,
  getDiasDisponibles,
  agendarCita,
  buscarClientes,
  obtenerCitasPorCliente,
  getMisVehiculos,
  agregarVehiculo,
  eliminarVehiculo,
  solicitarAuxilioMecanico
} from '../controllers/cliente.controller.js';

const router = Router();

router.post('/registro', register);

router.get('/empleados-disponibles', getEmpleadosDisponibles);
router.get('/horarios-disponibles', (req, res) => getHorariosDisponibles(req, res));
router.get('/dias-disponibles', verifyToken, (req, res) => getDiasDisponibles(req, res));
router.post('/agendar-cita', verifyToken, requireVerifiedEmail, (req, res) => agendarCita(req, res));
router.get('/buscar', verifyToken, (req, res) => buscarClientes(req, res));
router.get('/vehiculos', verifyToken, (req, res) => getMisVehiculos(req, res));
router.post('/vehiculos', verifyToken, (req, res) => agregarVehiculo(req, res));
router.delete('/vehiculos/:id', verifyToken, (req, res) => eliminarVehiculo(req, res));
router.post('/auxilio-mecanico', verifyToken, (req, res) => solicitarAuxilioMecanico(req, res));
router.get('/:clienteId/citas', verifyToken, (req, res) => obtenerCitasPorCliente(req, res));

export default router;