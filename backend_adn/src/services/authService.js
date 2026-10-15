import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import usuarioModel from "../models/usuarioModel.js";
import permisoModel from "../models/permisoModel.js";
import rolModel from "../models/rolModel.js";

class AuthService {

  async register(data) {
    const { email, password } = data;

    const userExist = await usuarioModel.findByEmail(email);
    if (userExist) {
      throw new Error("El correo ya está registrado");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    data.password = hashedPassword;
    data.rol_id = 2;

    const userId = await usuarioModel.create(data);

    return { userId };
  }

  async login(email, password) {

    const user = await usuarioModel.findByEmail(email);

    if (!user) {
      throw new Error("Correo o contraseña incorrectos");
    }

    // ── Verificar bloqueo por intentos fallidos ──
    const estadoBloqueo = await usuarioModel.obtenerEstadoBloqueo(user.id);

    if (estadoBloqueo && estadoBloqueo.bloqueado_hasta) {
      const ahora = new Date();
      const bloqueadoHasta = new Date(estadoBloqueo.bloqueado_hasta);

      if (ahora < bloqueadoHasta) {
        const segundosRestantes = Math.ceil((bloqueadoHasta - ahora) / 1000);
        const minutosRestantes = Math.ceil(segundosRestantes / 60);
        throw new Error(
          `Cuenta bloqueada por demasiados intentos fallidos. Intente nuevamente en ${minutosRestantes} minuto(s).`
        );
      } else {
        // El bloqueo ya expiró, resetear intentos
        await usuarioModel.resetearIntentos(user.id);
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Incrementar intentos fallidos
      await usuarioModel.incrementarIntentos(user.id);

      // Re-consultar para obtener el conteo actualizado
      const estadoActualizado = await usuarioModel.obtenerEstadoBloqueo(user.id);
      const intentosRestantes = 3 - estadoActualizado.intentos_fallidos;

      if (estadoActualizado.intentos_fallidos >= 3) {
        await usuarioModel.bloquearUsuario(user.id, 5);
        throw new Error(
          "Cuenta bloqueada por 5 minutos debido a 3 intentos fallidos."
        );
      }

      throw new Error(
        `Correo o contraseña incorrectos. Le quedan ${intentosRestantes} intento(s).`
      );
    }

    // Login exitoso → resetear intentos
    if (estadoBloqueo && estadoBloqueo.intentos_fallidos > 0) {
      await usuarioModel.resetearIntentos(user.id);
    }

    // Obtener el nombre del rol desde la BD (no hardcodeado)
    const rolData = await rolModel.findById(user.rol_id);
    const rolNombre = rolData ? rolData.descripcion : "Sin rol";

    // Determinar el tipo de rol para el frontend:
    // - rol_id 1 = admin
    // - rol_id 3 = cliente  
    // - Cualquier otro rol = empleado (staff)
    let rolTipo;
    if (user.rol_id === 1) {
      rolTipo = "admin";
    } else if (user.rol_id === 3) {
      rolTipo = "cliente";
    } else {
      rolTipo = "empleado";
    }

    // Obtener permisos del usuario según su rol
    const permisos = await permisoModel.getPermisosByUsuarioId(user.id);
    const permisosNombres = permisos.map(p => p.permiso);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        rol: user.rol_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return {
      token,
      user: {
        id: user.id,
        nombre: user.nombre_completo,
        email: user.email,
        rol: rolTipo,
        rol_id: user.rol_id,
        rol_nombre: rolNombre,
        permisos: permisosNombres,
        email_verificado: !!user.email_verificado
      }
    };
  }

}

export default new AuthService();