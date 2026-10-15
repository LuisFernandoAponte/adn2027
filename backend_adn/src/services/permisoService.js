import permisoModel from "../models/permisoModel.js";

class PermisoService {

  async listarPermisos() {
    return await permisoModel.findAll();
  }

  async obtenerPermiso(id) {
    const permiso = await permisoModel.findById(id);
    if (!permiso) throw new Error("Permiso no encontrado");
    return permiso;
  }

  async crearPermiso(nombre) {
    if (!nombre || !nombre.trim()) {
      throw new Error("El nombre del permiso es obligatorio");
    }

    const existe = await permisoModel.findByNombre(nombre.trim());
    if (existe) {
      throw new Error("Ya existe un permiso con ese nombre");
    }

    return await permisoModel.create(nombre.trim());
  }

  async actualizarPermiso(id, nombre) {
    if (!nombre || !nombre.trim()) {
      throw new Error("El nombre del permiso es obligatorio");
    }

    const permiso = await permisoModel.findById(id);
    if (!permiso) throw new Error("Permiso no encontrado");

    const existe = await permisoModel.findByNombre(nombre.trim());
    if (existe && existe.id !== parseInt(id)) {
      throw new Error("Ya existe otro permiso con ese nombre");
    }

    return await permisoModel.update(id, nombre.trim());
  }

  async eliminarPermiso(id) {
    const permiso = await permisoModel.findById(id);
    if (!permiso) throw new Error("Permiso no encontrado");
    return await permisoModel.delete(id);
  }

  // Obtener permisos de un usuario por su ID
  async obtenerPermisosDeUsuario(usuarioId) {
    return await permisoModel.getPermisosByUsuarioId(usuarioId);
  }
}

export default new PermisoService();
