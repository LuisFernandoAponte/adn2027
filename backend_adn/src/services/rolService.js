import rolModel from "../models/rolModel.js";
import permisoModel from "../models/permisoModel.js";

class RolService {

  async listarRoles() {
    const roles = await rolModel.findAll();
    // Para cada rol, traer sus permisos
    const rolesConPermisos = await Promise.all(
      roles.map(async (rol) => {
        const permisos = await permisoModel.getPermisosByRolId(rol.id);
        return { ...rol, permisos };
      })
    );
    return rolesConPermisos;
  }

  async obtenerRol(id) {
    const rol = await rolModel.findById(id);
    if (!rol) throw new Error("Rol no encontrado");
    const permisos = await permisoModel.getPermisosByRolId(id);
    return { ...rol, permisos };
  }

  async crearRol(descripcion) {
    if (!descripcion || !descripcion.trim()) {
      throw new Error("La descripción del rol es obligatoria");
    }

    const existe = await rolModel.findByDescripcion(descripcion.trim());
    if (existe) {
      throw new Error("Ya existe un rol con esa descripción");
    }

    return await rolModel.create(descripcion.trim());
  }

  async actualizarRol(id, descripcion) {
    if (!descripcion || !descripcion.trim()) {
      throw new Error("La descripción del rol es obligatoria");
    }

    const rol = await rolModel.findById(id);
    if (!rol) throw new Error("Rol no encontrado");

    const existe = await rolModel.findByDescripcion(descripcion.trim());
    if (existe && existe.id !== parseInt(id)) {
      throw new Error("Ya existe otro rol con esa descripción");
    }

    return await rolModel.update(id, descripcion.trim());
  }

  async eliminarRol(id) {
    const rol = await rolModel.findById(id);
    if (!rol) throw new Error("Rol no encontrado");

    const tieneUsuarios = await rolModel.hasUsers(id);
    if (tieneUsuarios) {
      throw new Error("No se puede eliminar el rol porque tiene usuarios asignados");
    }

    // Eliminar permisos del rol primero
    await permisoModel.asignarPermisosARol(id, []);

    return await rolModel.delete(id);
  }

  async asignarPermisos(rolId, permisoIds) {
    const rol = await rolModel.findById(rolId);
    if (!rol) throw new Error("Rol no encontrado");

    // Validar que todos los permisos existan
    if (permisoIds && permisoIds.length > 0) {
      for (const pid of permisoIds) {
        const permiso = await permisoModel.findById(pid);
        if (!permiso) throw new Error(`Permiso con id ${pid} no encontrado`);
      }
    }

    await permisoModel.asignarPermisosARol(rolId, permisoIds || []);
    return await this.obtenerRol(rolId);
  }
}

export default new RolService();
