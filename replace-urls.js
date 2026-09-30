const fs = require('fs');
const path = require('path');

const OLD_URL = 'https://roameomobileapp.braventra.in';
const NEW_URL = 'http://192.168.0.101:3000';

const directories = [
  '../roameo-customer',
  '../roameo-vendor',
  '../roameo-admin-panel'
];

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(OLD_URL)) {
    const newContent = content.split(OLD_URL).join(NEW_URL);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.expo') {
        walkDir(fullPath);
      }
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
        replaceInFile(fullPath);
      }
    }
  }
}

directories.forEach(dir => {
  walkDir(path.join(__dirname, dir));
});

console.log('All URLs updated!');
