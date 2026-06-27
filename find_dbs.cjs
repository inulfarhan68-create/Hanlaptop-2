const fs = require('fs');
const path = require('path');

function searchDbs(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== '.vercel' && file !== '.next') {
          results = results.concat(searchDbs(fullPath));
        }
      } else if (file.endsWith('.db') || file.endsWith('.sqlite')) {
        results.push({ path: fullPath, size: stat.size });
      }
    });
  } catch (err) {
    // ignore
  }
  return results;
}

const dbs = searchDbs('c:/Users/inulf/OneDrive/Documents/Hanlaptop-2');
console.log('Database files found:');
dbs.forEach(d => {
  console.log(`- Path: ${d.path}, Size: ${d.size} bytes`);
});
