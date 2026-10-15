import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export const query = (text, params) => pool.query(text, params);

export const getPool = () => pool;

export default { query, getPool };
