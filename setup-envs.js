const fs = require('fs');
const path = require('path');

const OLD_URL = 'http://192.168.0.101:3000';
const BASE_ENV_VAR = 'process.env.EXPO_PUBLIC_BASE_URL';

const directories = [
  '../roameo-customer',
  '../roameo-vendor',
  '../roameo-admin-panel'
];

function createEnvFiles() {
  directories.forEach(dir => {
    const envPath = path.join(__dirname, dir, '.env');
    const envContent = `EXPO_PUBLIC_BASE_URL=http://192.168.0.101:3000\n`;
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`Created .env in ${dir}`);
  });
}

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Replace 'http://192.168.0.101:3000' with process.env.EXPO_PUBLIC_BASE_URL
  const target1 = "'http://192.168.0.101:3000'";
  if (content.includes(target1)) {
    content = content.split(target1).join(BASE_ENV_VAR);
    updated = true;
  }

  // Sometimes it might be in backticks without variables if it was a direct fetch:
  // e.g. fetch('http://192.168.0.101:3000/api/...')
  // but my previous script just replaced the base part, so it would be:
  // fetch('http://192.168.0.101:3000/api/...') -> fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/...`)
  // Let's do a regex to catch all string literals containing the URL.
  
  const regex = /(['"\`])http:\/\/192\.168\.0\.101:3000(.*?)\1/g;
  content = content.replace(regex, (match, quote, pathPart) => {
    updated = true;
    if (!pathPart) return BASE_ENV_VAR;
    return `\`\${${BASE_ENV_VAR}}${pathPart}\``;
  });

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath} to use ENV variable.`);
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

createEnvFiles();
directories.forEach(dir => {
  walkDir(path.join(__dirname, dir));
});

console.log('All URLs moved to .env and files updated!');
