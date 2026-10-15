import db from "../config/db.js";

class ClienteModel {

  async crear(usuario_id) {
    const sql = "INSERT INTO cliente (usuario_id) VALUES (?)";
    const [result] = await db.query(sql, [usuario_id]);
    return result.insertId;
  }

}

export default new ClienteModel();