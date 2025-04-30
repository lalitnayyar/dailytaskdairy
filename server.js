const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');
const { db, updateConfig, initializeDatabase, config } = require('./database');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Initialize database
db.serialize(() => {
    // Create tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        hour INTEGER NOT NULL,
        description TEXT
    )`);

    // Create important_tasks table
    db.run(`CREATE TABLE IF NOT EXISTS important_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        completed_at TEXT NULL,
        color TEXT
    )`);

    // Create todos table
    db.run(`CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        completed_at TEXT NULL,
        due_time TEXT,
        reminder_time TEXT,
        color TEXT
    )`);
});

// Main route with date parameter
app.get('/', async (req, res) => {
    const targetDate = req.query.date || moment().format('YYYY-MM-DD');
    const currentDate = moment().format('YYYY-MM-DD');
    
    try {
        // Get all data for the target date using promises
        const getTasks = () => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM tasks WHERE strftime('%Y-%m-%d', created_at) = ? ORDER BY hour`, [targetDate], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        };

        const getImportantTasks = () => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM important_tasks WHERE status != 'completed' ORDER BY created_at DESC`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        };

        const getTodos = () => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM todos WHERE status != 'completed' ORDER BY created_at DESC`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        };

        // Wait for all queries to complete
        const [tasks, importantTasks, todos] = await Promise.all([
            getTasks(),
            getImportantTasks(),
            getTodos()
        ]);

        res.render('index', {
            targetDate,
            currentDate,
            tasks,
            importantTasks,
            todos,
            moment
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('index', { error: 'Failed to load data' });
    }
});

// API Routes for tasks
app.post('/api/tasks/:type', (req, res) => {
    const { type } = req.params;
    const { title, description, due_time, reminder_time, color } = req.body;
    const created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    const status = 'open';

    let query;
    let params;

    switch (type) {
        case 'tasks':
            query = `INSERT INTO tasks (description, hour, created_at) VALUES (?, ?, ?)`;
            params = [description, parseInt(title), created_at];
            break;
        case 'important_tasks':
            query = `INSERT INTO important_tasks (title, description, status, created_at, color) VALUES (?, ?, ?, ?, ?)`;
            params = [title, description || '', status, created_at, color || '#3498db'];
            break;
        case 'todos':
            query = `INSERT INTO todos (title, description, due_time, reminder_time, status, created_at, color) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            params = [title, description || '', due_time || null, reminder_time || null, status, created_at, color || '#2ecc71'];
            break;
        default:
            return res.status(400).json({ error: 'Invalid task type' });
    }

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error creating task:', err);
            return res.status(500).json({ error: 'Failed to create task' });
        }
        res.json({ id: this.lastID });
    });
});

// Get task by ID
app.get('/api/tasks/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const table = type === 'important_tasks' ? 'important_tasks' : 'todos';
    
    db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Failed to fetch task' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(row);
    });
});

// Update task
app.put('/api/tasks/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const { title, description, due_time, reminder_time } = req.body;
    
    let query;
    let params;

    switch (type) {
        case 'important_tasks':
            query = `UPDATE important_tasks SET title = ?, description = ? WHERE id = ?`;
            params = [title, description, id];
            break;
        case 'todos':
            query = `UPDATE todos SET title = ?, description = ?, due_time = ?, reminder_time = ? WHERE id = ?`;
            params = [title, description, due_time, reminder_time, id];
            break;
        default:
            return res.status(400).json({ error: 'Invalid task type' });
    }

    db.run(query, params, (err) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Failed to update task' });
        }
        res.json({ success: true });
    });
});

// Delete task
app.delete('/api/tasks/:type/:id', (req, res) => {
    const { type, id } = req.params;
    let table;

    switch (type) {
        case 'tasks':
            table = 'tasks';
            break;
        case 'important_tasks':
            table = 'important_tasks';
            break;
        case 'todos':
            table = 'todos';
            break;
        default:
            return res.status(400).json({ error: 'Invalid task type' });
    }

    db.run(`DELETE FROM ${table} WHERE id = ?`, [id], (err) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Failed to delete task' });
        }
        res.json({ success: true });
    });
});

// Update task status
app.post('/api/tasks/:type/:id/status', (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body;
    const completed_at = status === 'closed' ? moment().format('YYYY-MM-DD HH:mm:ss') : null;
    
    let table;
    switch (type) {
        case 'important_tasks':
            table = 'important_tasks';
            break;
        case 'todos':
            table = 'todos';
            break;
        default:
            return res.status(400).json({ error: 'Invalid task type' });
    }

    // Update task status and completed_at
    db.run(
        `UPDATE ${table} SET status = ?, completed_at = ? WHERE id = ?`,
        [status, completed_at, id],
        (err) => {
            if (err) {
                console.error('Error updating task status:', err);
                return res.status(500).json({ error: 'Failed to update task status' });
            }
            res.json({ success: true });
        }
    );
});

// Settings route
app.get('/settings', (req, res) => {
    res.render('settings', { config });
});

// Update settings
app.post('/api/settings', (req, res) => {
    try {
        const newConfig = updateConfig(req.body);
        if (req.body.resetDataOnStart !== undefined) {
            initializeDatabase(req.body.resetDataOnStart);
        }
        res.json({ success: true, config: newConfig });
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reports route
app.get('/api/reports', (req, res) => {
    const query = `
        SELECT 
            'important' as type,
            id,
            title,
            description,
            status,
            created_at,
            completed_at,
            NULL as due_time,
            NULL as reminder_time,
            strftime('%Y-%m-%d', created_at) as task_date
        FROM important_tasks
        UNION ALL
        SELECT 
            'todo' as type,
            id,
            title,
            description,
            status,
            created_at,
            completed_at,
            due_time,
            reminder_time,
            strftime('%Y-%m-%d', created_at) as task_date
        FROM todos
        ORDER BY created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }

        // Group tasks by date
        const tasksByDate = {};
        rows.forEach(task => {
            const date = task.task_date;
            if (!tasksByDate[date]) {
                tasksByDate[date] = {
                    date: date,
                    important: [],
                    todos: []
                };
            }
            if (task.type === 'important') {
                tasksByDate[date].important.push(task);
            } else {
                tasksByDate[date].todos.push(task);
            }
        });

        // Convert to array and sort by date
        const report = Object.values(tasksByDate).sort((a, b) => 
            moment(b.date).valueOf() - moment(a.date).valueOf()
        );

        res.json(report);
    });
});

// Get filtered task reports
app.get('/api/reports/filter', (req, res) => {
    const { status, startDate, endDate } = req.query;
    let query = `
            SELECT 
                'important' as type,
                id,
                title,
                description,
                status,
                created_at,
                completed_at,
                NULL as due_time,
                NULL as reminder_time,
                strftime('%Y-%m-%d', created_at) as task_date
            FROM important_tasks
            WHERE 1=1
    `;

    const params = [];
    if (status) {
        query += ` AND status = ? `;
        params.push(status);
    }
    if (startDate) {
        query += ` AND strftime('%Y-%m-%d', created_at) >= ? `;
        params.push(startDate);
    }
    if (endDate) {
        query += ` AND strftime('%Y-%m-%d', created_at) <= ? `;
        params.push(endDate);
    }

    query += ` UNION ALL 
            SELECT 
                'todo' as type,
                id,
                title,
                description,
                status,
                created_at,
                completed_at,
                due_time,
                reminder_time,
                strftime('%Y-%m-%d', created_at) as task_date
            FROM todos
            WHERE 1=1
    `;

    if (status) {
        query += ` AND status = ? `;
        params.push(status);
    }
    if (startDate) {
        query += ` AND strftime('%Y-%m-%d', created_at) >= ? `;
        params.push(startDate);
    }
    if (endDate) {
        query += ` AND strftime('%Y-%m-%d', created_at) <= ? `;
        params.push(endDate);
    }

    query += ` ORDER BY created_at DESC`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }

        // Group tasks by date
        const tasksByDate = {};
        rows.forEach(task => {
            const date = task.task_date;
            if (!tasksByDate[date]) {
                tasksByDate[date] = {
                    date: date,
                    important: [],
                    todos: []
                };
            }
            if (task.type === 'important') {
                tasksByDate[date].important.push(task);
            } else {
                tasksByDate[date].todos.push(task);
            }
        });

        // Convert to array and sort by date
        const report = Object.values(tasksByDate).sort((a, b) => 
            moment(b.date).valueOf() - moment(a.date).valueOf()
        );

        res.json(report);
    });
});

// Reports HTML route
app.get('/reports', (req, res) => {
    const query = `
        SELECT 
            'important' as type,
            id,
            title,
            description,
            status,
            created_at,
            completed_at,
            NULL as due_time,
            NULL as reminder_time,
            strftime('%Y-%m-%d', created_at) as task_date
        FROM important_tasks
        UNION ALL
        SELECT 
            'todo' as type,
            id,
            title,
            description,
            status,
            created_at,
            completed_at,
            due_time,
            reminder_time,
            strftime('%Y-%m-%d', created_at) as task_date
        FROM todos
        ORDER BY created_at DESC
    `;
    
    db.all(query, [], (err, tasks) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).render('reports', { tasks: [] });
        }

        // Group tasks by date
        const tasksByDate = {};
        tasks.forEach(task => {
            const date = task.task_date;
            if (!tasksByDate[date]) {
                tasksByDate[date] = {
                    date: date,
                    important: [],
                    todos: []
                };
            }
            if (task.type === 'important') {
                tasksByDate[date].important.push(task);
            } else {
                tasksByDate[date].todos.push(task);
            }
        });

        // Convert to array and sort by date
        const report = Object.values(tasksByDate).sort((a, b) => 
            moment(b.date).valueOf() - moment(a.date).valueOf()
        );

        res.render('reports', { tasks: report });
    });
});

// Schedule Tasks API
app.post('/api/tasks', (req, res) => {
    const { date, hour, description } = req.body;
    db.run(`INSERT INTO tasks (date, hour, description) VALUES (?, ?, ?)`,
        [date, hour, description],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { description } = req.body;
    db.run(`UPDATE tasks SET description = ? WHERE id = ?`,
        [description, id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM tasks WHERE id = ?`, [id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

// Important Tasks API
app.post('/api/important-tasks', (req, res) => {
    const { date, title, description } = req.body;
    db.run(`INSERT INTO important_tasks (date, title, description) VALUES (?, ?, ?)`,
        [date, title, description],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

app.put('/api/important-tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    db.run(`UPDATE important_tasks SET title = ?, description = ? WHERE id = ?`,
        [title, description, id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

app.delete('/api/important-tasks/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM important_tasks WHERE id = ?`, [id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

// Todos API
app.post('/api/todos', (req, res) => {
    const { date, title, description, due_time } = req.body;
    const reminder_time = moment(due_time, 'HH:mm').subtract(15, 'minutes').format('HH:mm');
    
    db.run(`INSERT INTO todos (date, title, description, due_time, reminder_time) VALUES (?, ?, ?, ?, ?)`,
        [date, title, description, due_time, reminder_time],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, due_time } = req.body;
    const reminder_time = moment(due_time, 'HH:mm').subtract(15, 'minutes').format('HH:mm');
    
    db.run(`UPDATE todos SET title = ?, description = ?, due_time = ?, reminder_time = ? WHERE id = ?`,
        [title, description, due_time, reminder_time, id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM todos WHERE id = ?`, [id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

// Update completion status
app.put('/api/todos/:id/complete', (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    
    db.run(`UPDATE todos SET completed = ? WHERE id = ?`, [completed, id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

// Get pending reminders
app.get('/api/reminders', (req, res) => {
    const currentDate = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm');
    
    const query = `
        SELECT * FROM todos 
        WHERE strftime('%Y-%m-%d', created_at) = ? 
        AND reminder_time = ? 
        AND status != 'completed'
    `;
    
    db.all(query, [currentDate, currentTime], (err, reminders) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(reminders || []);
    });
});

// Check reminders
app.get('/api/check-reminders', (req, res) => {
    const now = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm');
    
    const query = `
        SELECT * FROM todos 
        WHERE strftime('%Y-%m-%d', created_at) = ? 
        AND reminder_time = ? 
        AND status != 'completed'
    `;
    
    db.all(query, [now, currentTime], (err, tasks) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(tasks);
    });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
    const status = req.query.status;
    let query = `
            SELECT 
                'important' as type,
                id,
                title,
                description,
                status,
                created_at,
                completed_at,
                NULL as due_time,
                NULL as reminder_time
            FROM important_tasks
            WHERE 1=1
    `;

    if (status) {
        query += ` AND status = ? `;
    }

    query += ` UNION ALL 
            SELECT 
                'todo' as type,
                id,
                title,
                description,
                status,
                created_at,
                completed_at,
                due_time,
                reminder_time
            FROM todos
            WHERE 1=1
    `;

    if (status) {
        query += ` AND status = ? `;
    }

    query += ` ORDER BY created_at DESC`;

    const params = status ? [status, status] : [];

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(rows);
    });
});

// Get tasks by date
app.get('/api/tasks/:date', (req, res) => {
    const date = req.params.date;
    
    db.all(`
        SELECT 
            'important' as type,
            id,
            title,
            description,
            status,
            created_at,
            completed_at,
            NULL as due_time,
            NULL as reminder_time
        FROM important_tasks
        WHERE strftime('%Y-%m-%d', created_at) = ?
        UNION ALL
        SELECT 
            'todo' as type,
            id,
            title,
            description,
            status,
            created_at,
            completed_at,
            due_time,
            reminder_time
        FROM todos
        WHERE strftime('%Y-%m-%d', created_at) = ?
        ORDER BY created_at DESC
    `, [date, date], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(rows);
    });
});

// Initialize database and start server
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
});
