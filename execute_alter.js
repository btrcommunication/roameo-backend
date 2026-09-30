const fs = require('fs');
const pool = require('./config/db');

async function runScript() {
    try {
        const script = fs.readFileSync('database/alter.sql', 'utf8');
        const statements = script.split(';').map(s => s.trim()).filter(s => s.length > 0);
        
        for (let i = 0; i < statements.length; i++) {
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            await pool.query(statements[i]);
        }
        console.log('Successfully executed alter.sql');
    } catch (err) {
        console.error('Error executing alter.sql:', err);
    } finally {
        pool.end();
    }
}

runScript();
