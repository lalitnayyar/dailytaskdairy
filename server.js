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

// Main route with date parameter
app.get('/', async (req, res) => {
    const targetDate = req.query.date || moment().format('YYYY-MM-DD');
    const currentDate = moment().format('YYYY-MM-DD');
    
    try {
        // Get all data for the target date using promises
        const getTasks = () => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM tasks WHERE date = ? ORDER BY hour`, [targetDate], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        };

        const getImportantTasks = () => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM important_tasks WHERE date = ? AND status != 'closed'`, [currentDate], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        };

        const getTodos = () => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM todos WHERE date = ? AND status != 'closed'`, [currentDate], (err, rows) => {
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

        // Render the template with the data
        res.render('index', {
            tasks: tasks,
            importantTasks: importantTasks,
            todos: todos,
            moment: moment,
            config: config,
            targetDate: targetDate,
            currentDate: currentDate
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).render('index', {
            tasks: [],
            importantTasks: [],
            todos: [],
            moment: moment,
            error: 'An error occurred while loading the data',
            config: config,
            targetDate: targetDate,
            currentDate: currentDate
        });
    }
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
app.get('/reports', (req, res) => {
    const query = `
        SELECT 
            'important' as type,
            title,
            description,
            status,
            created_at,
            completed_at,
            NULL as due_time,
            date
        FROM important_tasks
        UNION ALL
        SELECT 
            'todo' as type,
            title,
            description,
            status,
            created_at,
            completed_at,
            due_time,
            date
        FROM todos
        ORDER BY created_at DESC
    `;
    
    db.all(query, [], (err, tasks) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).render('reports', { tasks: [] });
        }
        res.render('reports', { tasks: tasks || [] });
    });
});

// Reports API
app.get('/api/reports', (req, res) => {
    const { type, status, dateFrom, dateTo, search } = req.query;
    let query = '';
    const params = [];
    
    // Build the query based on filters
    if (type === 'important' || type === 'all') {
        query += `
            SELECT 
                'important' as type,
                title,
                description,
                status,
                created_at,
                completed_at,
                NULL as due_time,
                date
            FROM important_tasks
            WHERE 1=1
        `;
        if (status && status !== 'all') {
            query += ` AND status = ?`;
            params.push(status);
        }
        if (dateFrom) {
            query += ` AND date >= ?`;
            params.push(dateFrom);
        }
        if (dateTo) {
            query += ` AND date <= ?`;
            params.push(dateTo);
        }
        if (search) {
            query += ` AND (title LIKE ? OR description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
    }
    
    if (type === 'todo' || type === 'all') {
        if (type === 'all') query += ' UNION ALL ';
        query += `
            SELECT 
                'todo' as type,
                title,
                description,
                status,
                created_at,
                completed_at,
                due_time,
                date
            FROM todos
            WHERE 1=1
        `;
        if (status && status !== 'all') {
            query += ` AND status = ?`;
            params.push(status);
        }
        if (dateFrom) {
            query += ` AND date >= ?`;
            params.push(dateFrom);
        }
        if (dateTo) {
            query += ` AND date <= ?`;
            params.push(dateTo);
        }
        if (search) {
            query += ` AND (title LIKE ? OR description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, tasks) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(tasks || []);
    });
});

// Update task status
app.put('/api/:type/:id/status', (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body;
    const table = type === 'todo' ? 'todos' : 'important_tasks';
    const completed_at = status === 'closed' ? moment().format('YYYY-MM-DD HH:mm:ss') : null;
    
    db.run(
        `UPDATE ${table} SET status = ?, completed_at = ? WHERE id = ?`,
        [status, completed_at, id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        }
    );
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
    
    db.all(`SELECT * FROM todos 
            WHERE date = ? 
            AND reminder_time = ? 
            AND status != 'closed'`,
        [currentDate, currentTime],
        (err, reminders) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(reminders || []);
        });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
