import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      console.log(" Conectado a MySQL");
      connection.release();
    } catch (error) {
      console.error(" Error de conexión a MySQL:", error.message);
      throw error;
    }
  }

  getPool() {
    return this.pool;
  }
}

const database = new Database();

export default database;