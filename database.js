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
async function initializeDatabase(shouldReset = false) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            try {
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
                    completed_at TEXT NULL,
                    color TEXT
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS important_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT 'open',
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    completed_at TEXT NULL,
                    color TEXT
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS todos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    due_time TEXT,
                    reminder_time TEXT,
                    status TEXT DEFAULT 'open',
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    completed_at TEXT NULL,
                    color TEXT
                )`);

                // If reset is true or tables were empty, add sample data
                db.get('SELECT COUNT(*) as count FROM tasks', (err, result) => {
                    if (err || result.count === 0) {
                        const currentDate = new Date().toISOString().split('T')[0];

                        // Sample colors
                        const sampleColors = [
                            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
                            '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'
                        ];

                        function getRandomColor() {
                            return sampleColors[Math.floor(Math.random() * sampleColors.length)];
                        }

                        // Add sample tasks with colors
                        db.run(`INSERT INTO important_tasks (title, description, status, color) VALUES 
                            ('Project Meeting', 'Discuss Q2 goals with team', 'open', '${getRandomColor()}'),
                            ('Client Presentation', 'Prepare slides for client demo', 'in_progress', '${getRandomColor()}'),
                            ('Code Review', 'Review team pull requests', 'open', '${getRandomColor()}')`);

                        db.run(`INSERT INTO todos (title, description, due_time, status, color) VALUES 
                            ('Email Response', 'Reply to vendor proposals', '14:00', 'open', '${getRandomColor()}'),
                            ('Documentation', 'Update API documentation', '16:30', 'in_progress', '${getRandomColor()}'),
                            ('Team Sync', 'Daily standup meeting', '10:00', 'open', '${getRandomColor()}')`);
                    }
                });

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Function to update configuration
function updateConfig(newConfig) {
    config = { ...config, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
    db,
    config,
    updateConfig,
    initializeDatabase
};
