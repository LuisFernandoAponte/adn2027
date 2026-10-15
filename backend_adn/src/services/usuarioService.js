import bcrypt from "bcrypt";
import usuarioModel from "../models/usuarioModel.js";

// IDs de roles que NO son personal/staff (no necesitan registro en tabla empleado)
const ROL_CLIENTE_ID = 3;

//logica de negocio de usuario
class UsuarioService {

  async listarUsuarios() {
    return await usuarioModel.findAll();
  }

  async obtenerUsuario(id) {
    return await usuarioModel.findById(id);
  }

  async crearUsuario(data) {
    if (!data.nombre_completo || !data.email || !data.password) {
      throw new Error("Nombre, email y password son obligatorios");
    }

    const existe = await usuarioModel.findByEmail(data.email);
    if (existe) {
      throw new Error("El correo ya está registrado");
    }

    data.password = await bcrypt.hash(data.password, 10);
    const usuarioId = await usuarioModel.create(data);

    // Si NO es cliente, insertar en tabla empleado con su cargo
    if (data.rol_id != ROL_CLIENTE_ID && data.cargo) {
      await usuarioModel.createEmpleado(usuarioId, data.cargo);
    }

    return usuarioId;
  }

  async actualizarUsuario(id, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const cargo = data.cargo;
    delete data.cargo; // no pertenece a la tabla usuario

    await usuarioModel.update(id, data);

    // Manejar tabla empleado según el rol
    if (data.rol_id != ROL_CLIENTE_ID && data.rol_id !== undefined) {
      // Es un rol de staff (admin, empleado, secretaria, etc.) → crear/actualizar empleado
      if (cargo) {
        const empleadoExiste = await usuarioModel.getEmpleadoByUsuarioId(id);
        if (empleadoExiste) {
          await usuarioModel.updateEmpleadoCargo(id, cargo);
        } else {
          await usuarioModel.createEmpleado(id, cargo);
        }
      }
    } else if (data.rol_id == ROL_CLIENTE_ID) {
      // Si cambió a cliente, eliminar registro de empleado
      await usuarioModel.deleteEmpleado(id);
    }

    return;
  }

  async eliminarUsuario(id) {
    return await usuarioModel.deleteLogical(id);
  }

  async activarUsuario(id) {
    return await usuarioModel.activar(id);
  }
}

export default new UsuarioService();