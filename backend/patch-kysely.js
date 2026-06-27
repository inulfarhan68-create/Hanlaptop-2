const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, 'node_modules', 'kysely', 'dist', 'esm', 'index.js'),
  path.join(__dirname, 'node_modules', 'kysely', 'dist', 'cjs', 'index.js'),
  path.join(__dirname, 'node_modules', 'kysely', 'dist', 'index.js')
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Repair corrupted ESM files that have "exports." instead of "export const"
    if (content.includes('export {') && content.includes('exports.DEFAULT_MIGRATION_LOCK_TABLE')) {
      content = content.replace(/exports\.DEFAULT_MIGRATION_LOCK_TABLE/g, 'export const DEFAULT_MIGRATION_LOCK_TABLE');
      content = content.replace(/exports\.DEFAULT_MIGRATION_TABLE/g, 'export const DEFAULT_MIGRATION_TABLE');
      fs.writeFileSync(file, content);
      console.log(`Repaired corrupted patch in ${file}`);
    } else if (!content.includes('DEFAULT_MIGRATION_LOCK_TABLE')) {
      if (content.includes('export *') || content.includes('export {')) {
        content += '\nexport const DEFAULT_MIGRATION_LOCK_TABLE = "kysely_migration_lock";\nexport const DEFAULT_MIGRATION_TABLE = "kysely_migration";\n';
      } else {
        content += '\nexports.DEFAULT_MIGRATION_LOCK_TABLE = "kysely_migration_lock";\nexports.DEFAULT_MIGRATION_TABLE = "kysely_migration";\n';
      }
      fs.writeFileSync(file, content);
      console.log(`Patched ${file}`);
    }
  }
}
