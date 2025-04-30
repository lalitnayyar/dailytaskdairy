const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Read or create config file
const configPath = path.join(__dirname, 'db.config.json');
let config = { resetDataOnStart: false };

try {
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
} catch (error) {
    console.error('Error reading/writing config:', error);
}

const db = new sqlite3.Database('./planner.db');

// Function to initialize the database
function initializeDatabase(shouldReset = false) {
    db.serialize(() => {
        // If reset is true, drop existing tables
        if (shouldReset) {
            console.log('Resetting database...');
            db.run('DROP TABLE IF EXISTS tasks');
            db.run('DROP TABLE IF EXISTS important_tasks');
            db.run('DROP TABLE IF EXISTS todos');
        }

        // Create tables if they don't exist
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            hour INTEGER,
            description TEXT,
            status TEXT DEFAULT 'open',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            completed_at TEXT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS important_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            title TEXT,
            description TEXT,
            status TEXT DEFAULT 'open',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            completed_at TEXT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            title TEXT,
            description TEXT,
            due_time TEXT,
            reminder_time TEXT,
            status TEXT DEFAULT 'open',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            completed_at TEXT NULL
        )`);

        // If reset is true or tables were empty, add sample data
        db.get('SELECT COUNT(*) as count FROM tasks', (err, result) => {
            if (err || result.count === 0) {
                const currentDate = new Date().toISOString().split('T')[0];
                
                // Sample important tasks
                db.run(`INSERT INTO important_tasks (date, title, description) VALUES (?, 'Project Meeting', 'Discuss project timeline')`, [currentDate]);
                db.run(`INSERT INTO important_tasks (date, title, description) VALUES (?, 'Code Review', 'Review team pull requests')`, [currentDate]);
                
                // Sample todos
                db.run(`INSERT INTO todos (date, title, description, due_time) VALUES (?, 'Send Report', 'Prepare and send weekly report', '17:00')`, [currentDate]);
                db.run(`INSERT INTO todos (date, title, description, due_time) VALUES (?, 'Client Call', 'Follow up on requirements', '15:30')`, [currentDate]);
            }
        });
    });
}

// Function to update configuration
function updateConfig(newConfig) {
    config = { ...config, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return config;
}

// Initialize database based on config
initializeDatabase(config.resetDataOnStart);

module.exports = {
    db,
    updateConfig,
    initializeDatabase,
    config
};
