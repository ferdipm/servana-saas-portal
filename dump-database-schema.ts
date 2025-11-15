#!/usr/bin/env tsx
/**
 * Script para generar documentación completa del esquema de la base de datos de Supabase
 * Sin incluir datos, solo estructura: tablas, columnas, relaciones, índices, políticas RLS, etc.
 */

import * as fs from 'fs';
import { config } from 'dotenv';
import pg from 'pg';

const { Client } = pg;

// Cargar variables de entorno desde .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL) {
  console.error('❌ Error: Falta NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

// Extraer el project ref de la URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Error: No se pudo extraer el project ref de la URL');
  process.exit(1);
}

if (!SUPABASE_DB_PASSWORD) {
  console.error('❌ Error: Falta SUPABASE_DB_PASSWORD');
  console.error('\n💡 Cómo obtener la contraseña de la base de datos:');
  console.error('1. Ve a tu proyecto en Supabase Dashboard');
  console.error('2. Settings → Database');
  console.error('3. Copia la contraseña (o resetéala si no la recuerdas)');
  console.error('4. Agrégala a .env.local: SUPABASE_DB_PASSWORD=tu_password\n');
  process.exit(1);
}

console.log(`🔐 Conectando a PostgreSQL directamente...\n`);
console.log(`📍 Project: ${projectRef}`);

const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: SUPABASE_DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

interface TableInfo {
  table_name: string;
  columns: any[];
  foreign_keys: any[];
  indexes: any[];
}

async function getTablesInfo(): Promise<TableInfo[]> {
  const query = `
    SELECT
      t.table_name,
      json_agg(
        json_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default,
          'character_maximum_length', c.character_maximum_length,
          'is_primary_key', (
            SELECT COUNT(*) > 0
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND kcu.table_name = t.table_name
              AND kcu.column_name = c.column_name
          )
        ) ORDER BY c.ordinal_position
      ) as columns
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c
      ON t.table_name = c.table_name
      AND t.table_schema = c.table_schema
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name;
  `;

  const result = await client.query(query);
  return result.rows;
}

async function getForeignKeysForTable(tableName: string): Promise<any[]> {
  const query = `
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1
    ORDER BY kcu.ordinal_position;
  `;

  const result = await client.query(query, [tableName]);
  return result.rows;
}

async function getIndexesForTable(tableName: string): Promise<any[]> {
  const query = `
    SELECT
      i.indexname,
      i.indexdef
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = $1
      AND i.indexname NOT LIKE '%_pkey'
    ORDER BY i.indexname;
  `;

  const result = await client.query(query, [tableName]);
  return result.rows;
}

async function getPoliciesForTable(tableName: string): Promise<any[]> {
  const query = `
    SELECT
      pol.polname as policyname,
      CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
      END as cmd,
      pg_get_expr(pol.polqual, pol.polrelid) as qual,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check,
      CASE
        WHEN pol.polpermissive THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
      END as permissive,
      (
        SELECT array_agg(rolname)
        FROM pg_roles
        WHERE oid = ANY(pol.polroles)
      ) as roles
    FROM pg_policy pol
    JOIN pg_class pc ON pol.polrelid = pc.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public'
      AND pc.relname = $1
    ORDER BY pol.polname;
  `;

  const result = await client.query(query, [tableName]);
  return result.rows;
}

async function getTriggersForTable(tableName: string): Promise<any[]> {
  const query = `
    SELECT
      trigger_name,
      event_manipulation,
      action_statement,
      action_timing
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = $1
    ORDER BY trigger_name;
  `;

  const result = await client.query(query, [tableName]);
  return result.rows;
}

async function getFunctions(): Promise<any[]> {
  const query = `
    SELECT
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments,
      pg_get_function_result(p.oid) as return_type,
      pg_get_functiondef(p.oid) as definition,
      d.description
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    LEFT JOIN pg_description d ON p.oid = d.objoid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname;
  `;

  const result = await client.query(query);
  return result.rows;
}

async function getEnums(): Promise<any[]> {
  const query = `
    SELECT
      t.typname as enum_name,
      array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname;
  `;

  const result = await client.query(query);
  return result.rows;
}

async function generateSchemaDoc() {
  console.log('🔍 Extrayendo esquema de la base de datos...\n');

  let markdown = `# Esquema de Base de Datos - Supabase\n\n`;
  markdown += `> Documentación generada automáticamente el ${new Date().toLocaleString('es-ES')}\n\n`;
  markdown += `## Información General\n\n`;
  markdown += `- **Supabase URL**: ${SUPABASE_URL}\n`;
  markdown += `- **Project Ref**: ${projectRef}\n`;
  markdown += `- **Esquema**: public\n`;
  markdown += `- **Generado con**: Conexión directa a PostgreSQL\n\n`;
  markdown += `---\n\n`;

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // Obtener tablas
    const tables = await getTablesInfo();
    console.log(`✅ Encontradas ${tables.length} tablas\n`);

    // Obtener enums
    const enums = await getEnums();
    if (enums.length > 0) {
      console.log(`✅ Encontrados ${enums.length} tipos enum\n`);
      markdown += `## Tipos Enum\n\n`;
      enums.forEach(enumType => {
        markdown += `### \`${enumType.enum_name}\`\n\n`;
        markdown += `Valores:\n`;
        enumType.values.forEach((val: string) => {
          markdown += `- \`${val}\`\n`;
        });
        markdown += `\n`;
      });
      markdown += `---\n\n`;
    }

    markdown += `## Resumen de Tablas\n\n`;
    markdown += `Total de tablas: **${tables.length}**\n\n`;
    tables.forEach(table => {
      const columnCount = table.columns?.length || 0;
      markdown += `- [\`${table.table_name}\`](#tabla-${table.table_name.toLowerCase()}) (${columnCount} columnas)\n`;
    });
    markdown += `\n---\n\n`;

    // Detalles de cada tabla
    for (const table of tables) {
      console.log(`📋 Procesando tabla: ${table.table_name}`);

      markdown += `## Tabla: \`${table.table_name}\`\n\n`;

      // Columnas
      if (table.columns && table.columns.length > 0) {
        markdown += `### Columnas\n\n`;
        markdown += `| Columna | Tipo | Nullable | Default | PK | Longitud Max |\n`;
        markdown += `|---------|------|----------|---------|----|--------------|\n`;
        table.columns.forEach((col: any) => {
          const maxLength = col.character_maximum_length || '-';
          const defaultVal = col.column_default || '-';
          const isPk = col.is_primary_key ? '🔑' : '';
          markdown += `| \`${col.column_name}\` | ${col.data_type} | ${col.is_nullable} | ${defaultVal} | ${isPk} | ${maxLength} |\n`;
        });
        markdown += `\n`;
      }

      // Claves foráneas
      const foreignKeys = await getForeignKeysForTable(table.table_name);
      if (foreignKeys.length > 0) {
        markdown += `### Relaciones (Foreign Keys)\n\n`;
        foreignKeys.forEach(fk => {
          markdown += `- \`${fk.column_name}\` → [\`${fk.foreign_table_name}.${fk.foreign_column_name}\`](#tabla-${fk.foreign_table_name.toLowerCase()})\n`;
          markdown += `  - Constraint: \`${fk.constraint_name}\`\n`;
          markdown += `  - ON UPDATE: ${fk.update_rule}, ON DELETE: ${fk.delete_rule}\n`;
        });
        markdown += `\n`;
      }

      // Índices
      const indexes = await getIndexesForTable(table.table_name);
      if (indexes.length > 0) {
        markdown += `### Índices\n\n`;
        indexes.forEach(idx => {
          markdown += `- **${idx.indexname}**\n`;
          markdown += `  \`\`\`sql\n  ${idx.indexdef}\n  \`\`\`\n`;
        });
        markdown += `\n`;
      }

      // Políticas RLS
      const policies = await getPoliciesForTable(table.table_name);
      if (policies.length > 0) {
        markdown += `### Políticas RLS (Row Level Security)\n\n`;
        policies.forEach(policy => {
          markdown += `- **${policy.policyname}** (${policy.cmd}) - ${policy.permissive}\n`;
          if (policy.roles && Array.isArray(policy.roles)) {
            markdown += `  - Roles: ${policy.roles.join(', ')}\n`;
          }
          if (policy.qual) {
            markdown += `  - USING: \`${policy.qual}\`\n`;
          }
          if (policy.with_check) {
            markdown += `  - WITH CHECK: \`${policy.with_check}\`\n`;
          }
        });
        markdown += `\n`;
      }

      // Triggers
      const triggers = await getTriggersForTable(table.table_name);
      if (triggers.length > 0) {
        markdown += `### Triggers\n\n`;
        triggers.forEach(trigger => {
          markdown += `- **${trigger.trigger_name}**\n`;
          markdown += `  - Timing: ${trigger.action_timing}\n`;
          markdown += `  - Event: ${trigger.event_manipulation}\n`;
          markdown += `  - Action: \`${trigger.action_statement}\`\n`;
        });
        markdown += `\n`;
      }

      markdown += `---\n\n`;
    }

    // Funciones
    console.log(`\n⚙️  Extrayendo funciones...`);
    const functions = await getFunctions();
    if (functions.length > 0) {
      markdown += `## Funciones de Base de Datos\n\n`;
      markdown += `Total de funciones: **${functions.length}**\n\n`;

      functions.forEach(func => {
        markdown += `### \`${func.function_name}(${func.arguments || ''})\`\n\n`;
        if (func.description) {
          markdown += `${func.description}\n\n`;
        }
        markdown += `**Returns**: \`${func.return_type}\`\n\n`;
        markdown += `<details>\n<summary>Ver definición</summary>\n\n`;
        markdown += `\`\`\`sql\n${func.definition}\n\`\`\`\n\n`;
        markdown += `</details>\n\n`;
        markdown += `---\n\n`;
      });
    }

    // Guardar archivo
    const filename = 'DATABASE_SCHEMA.md';
    fs.writeFileSync(filename, markdown, 'utf-8');

    console.log(`\n✅ Documentación generada exitosamente: ${filename}`);
    console.log(`📄 Total de tablas documentadas: ${tables.length}`);
    console.log(`📄 Total de enums documentados: ${enums.length}`);
    console.log(`⚙️  Total de funciones documentadas: ${functions.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Ejecutar
generateSchemaDoc()
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
