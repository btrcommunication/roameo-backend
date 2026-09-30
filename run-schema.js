const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    try {
        // We connect without specifying a database first to ensure we can create it if it doesn't exist
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });
        
        console.log("Connected to MySQL server on port " + (process.env.DB_PORT || 3306));
        
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log("Executing schema.sql...");
        await connection.query(sql);
        console.log("Schema executed successfully.");
        
        await connection.end();
    } catch (err) {
        console.error("Error executing schema:", err);
    }
}
run();
