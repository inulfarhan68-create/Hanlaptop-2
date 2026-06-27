const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace fetch('/api/...
  content = content.replace(/fetch\(\s*['"]\/(api\/.*?)['"]\s*([,)])/g, "fetch((import.meta.env.VITE_API_URL || '') + '/$1'$2");
  
  // Replace fetch(`/api/...
  content = content.replace(/fetch\(\s*`\/(api\/.*?)`\s*([,)])/g, "fetch((import.meta.env.VITE_API_URL || '') + `/$1`$2");

  // Replace useSWR conditional with '
  content = content.replace(/useSWR\(\s*(.*?)\s*\?\s*['"]\/(api\/.*?)['"]\s*:/g, "useSWR($1 ? (import.meta.env.VITE_API_URL || '') + '/$2' :");
  
  // Replace useSWR standard with '
  content = content.replace(/useSWR\(\s*['"]\/(api\/.*?)['"]\s*,/g, "useSWR((import.meta.env.VITE_API_URL || '') + '/$1',");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
