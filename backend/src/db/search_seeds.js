const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '../../../backend/src/db');
const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.ts'));

const itemsToFind = [
  "ASUS VivoBook 14 X1404FA",
  "Keyboard ASUS VivoBook",
  "RAM DDR4 8GB 3200MHz",
  "MSI Modern 14 C12MO",
  "Dell Latitude 5420",
  "Dell Latitude 3540",
  "HP ProBook 440 G8"
];

console.log("Mencari item di berkas seed...");

for (const file of files) {
  const content = fs.readFileSync(path.join(dbDir, file), 'utf8');
  console.log(`Checking ${file}...`);
  for (const item of itemsToFind) {
    if (content.toLowerCase().includes(item.toLowerCase())) {
      console.log(`  -> KETEMU "${item}" di ${file}!`);
      // Temukan baris yang memuat nama item ini
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(item.toLowerCase())) {
          console.log(`     L${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}
