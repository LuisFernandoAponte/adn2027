import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploySql() {
  console.log('\n========================================');
  console.log('   APLICANDO SUPABASE SETUP SQL');
  console.log('========================================\n');

  try {
    const sqlPath = path.resolve(__dirname, '../database/supabase_setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Dividir sentencias respetando bloques de funciones PL/pgSQL ($$...$$)
    const statements = [];
    let current = '';
    let inDollarBlock = false;

    for (const line of sql.split('\n')) {
      const trimmed = line.trim();
      if (!inDollarBlock && (trimmed.startsWith('--') || trimmed === '')) {
        continue;
      }

      current += line + '\n';

      // Detectar apertura/cierre de bloques de función ($$ o $tag$)
      const dollarMatches = (line.match(/\$\$/g) || []).length;
      if (dollarMatches % 2 === 1) {
        inDollarBlock = !inDollarBlock;
      }

      if (!inDollarBlock && trimmed.endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    }
    if (current.trim()) {
      statements.push(current.trim());
    }

    console.log(`🔌 Conectando y ejecutando ${statements.length} sentencias SQL...`);
    for (const stmt of statements) {
      if (stmt) {
        await prisma.$executeRawUnsafe(stmt);
      }
    }

    console.log('✅ ¡Funciones, triggers y restricciones instaladas con éxito en PostgreSQL!');
    console.log('   - horarios_disponibles()');
    console.log('   - cita_agendar()');
    console.log('   - cita_cambiar_estado()');
    console.log('   - inventario_agregar_stock()');
    console.log('   - inventario_descontar_stock()');
    console.log('   - pre_reserva_confirmar()');
    console.log('   - inventario_usar_en_cita()');
    console.log('\n========================================\n');
  } catch (error) {
    console.error('❌ Error ejecutando supabase_setup.sql:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deploySql();
