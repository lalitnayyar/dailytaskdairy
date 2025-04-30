// Update clock
function updateClock() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

setInterval(updateClock, 1000);
updateClock();

// Task Modal Management
let currentTaskType = null;
let currentTaskId = null;
let currentHour = null;
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const reminderModal = new bootstrap.Modal(document.getElementById('reminderModal'));

// Get current date from URL or use today
function getCurrentDate() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('date') || new Date().toISOString().split('T')[0];
}

// Schedule Task Functions
function addScheduleTask(hour) {
    currentTaskType = 'schedule';
    currentHour = hour;
    currentTaskId = null;
    document.querySelector('.modal-title').textContent = `Add Task for ${hour}:00`;
    document.getElementById('taskTitle').style.display = 'none';
    document.getElementById('taskTitle').parentElement.style.display = 'none';
    document.getElementById('taskDueTime').parentElement.style.display = 'none';
    taskModal.show();
}

function editScheduleTask(id, hour, description) {
    currentTaskType = 'schedule';
    currentTaskId = id;
    currentHour = hour;
    document.querySelector('.modal-title').textContent = `Edit Task for ${hour}:00`;
    document.getElementById('taskTitle').style.display = 'none';
    document.getElementById('taskTitle').parentElement.style.display = 'none';
    document.getElementById('taskDueTime').parentElement.style.display = 'none';
    document.getElementById('taskDescription').value = description;
    taskModal.show();
}

function deleteScheduleTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        fetch(`/api/tasks/${id}`, {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                location.reload();
            }
        });
    }
}

// Important Task Functions
function showAddImportantTask() {
    currentTaskType = 'important';
    currentTaskId = null;
    document.querySelector('.modal-title').textContent = 'Add Important Task';
    document.getElementById('taskTitle').style.display = '';
    document.getElementById('taskTitle').parentElement.style.display = '';
    document.getElementById('taskDueTime').parentElement.style.display = 'none';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    taskModal.show();
}

function editImportantTask(id) {
    currentTaskType = 'important';
    currentTaskId = id;
    document.querySelector('.modal-title').textContent = 'Edit Important Task';
    document.getElementById('taskTitle').style.display = '';
    document.getElementById('taskTitle').parentElement.style.display = '';
    document.getElementById('taskDueTime').parentElement.style.display = 'none';
    
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    document.getElementById('taskTitle').value = taskElement.querySelector('h6').textContent;
    document.getElementById('taskDescription').value = taskElement.querySelector('p').textContent;
    taskModal.show();
}

function deleteImportantTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        fetch(`/api/important-tasks/${id}`, {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                location.reload();
            }
        });
    }
}

// Todo Functions
function showAddTodo() {
    currentTaskType = 'todo';
    currentTaskId = null;
    document.querySelector('.modal-title').textContent = 'Add Todo';
    document.getElementById('taskTitle').style.display = '';
    document.getElementById('taskTitle').parentElement.style.display = '';
    document.getElementById('taskDueTime').parentElement.style.display = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskDueTime').value = '';
    taskModal.show();
}

function editTodo(id) {
    currentTaskType = 'todo';
    currentTaskId = id;
    document.querySelector('.modal-title').textContent = 'Edit Todo';
    document.getElementById('taskTitle').style.display = '';
    document.getElementById('taskTitle').parentElement.style.display = '';
    document.getElementById('taskDueTime').parentElement.style.display = '';
    
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    document.getElementById('taskTitle').value = taskElement.querySelector('h6').textContent;
    document.getElementById('taskDescription').value = taskElement.querySelector('p').textContent;
    document.getElementById('taskDueTime').value = taskElement.querySelector('small').textContent.replace('Due: ', '');
    taskModal.show();
}

function deleteTodo(id) {
    if (confirm('Are you sure you want to delete this todo?')) {
        fetch(`/api/todos/${id}`, {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                location.reload();
            }
        });
    }
}

async function saveTask() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const dueTime = document.getElementById('taskDueTime').value;
    const date = getCurrentDate();

    let endpoint = '';
    let method = 'POST';
    let data = {};

    switch (currentTaskType) {
        case 'schedule':
            endpoint = currentTaskId ? `/api/tasks/${currentTaskId}` : '/api/tasks';
            method = currentTaskId ? 'PUT' : 'POST';
            data = { 
                date, 
                hour: currentHour, 
                description 
            };
            break;
        case 'important':
            endpoint = currentTaskId ? `/api/important-tasks/${currentTaskId}` : '/api/important-tasks';
            method = currentTaskId ? 'PUT' : 'POST';
            data = { 
                date, 
                title, 
                description,
                status: 'open'
            };
            break;
        case 'todo':
            endpoint = currentTaskId ? `/api/todos/${currentTaskId}` : '/api/todos';
            method = currentTaskId ? 'PUT' : 'POST';
            data = { 
                date, 
                title, 
                description, 
                due_time: dueTime,
                status: 'open'
            };
            break;
    }

    try {
        const response = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            location.reload();
        }
    } catch (error) {
        console.error('Error saving task:', error);
    }
}

async function updateTaskStatus(type, id, status) {
    try {
        const response = await fetch(`/api/${type}/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            if (status === 'closed') {
                const taskElement = document.querySelector(`[data-task-id="${id}"]`);
                if (taskElement) {
                    taskElement.style.animation = 'fadeOut 0.5s';
                    setTimeout(() => {
                        taskElement.remove();
                    }, 500);
                }
            }
        }
    } catch (error) {
        console.error('Error updating task status:', error);
    }
}

// Check for reminders
async function checkReminders() {
    try {
        const response = await fetch('/api/reminders');
        const reminders = await response.json();

        if (reminders.length > 0) {
            const reminderText = reminders.map(r => `${r.title} - Due at ${r.due_time}`).join('\n');
            document.getElementById('reminderText').textContent = reminderText;
            reminderModal.show();
        }
    } catch (error) {
        console.error('Error checking reminders:', error);
    }
}

// Check reminders every minute
setInterval(checkReminders, 60000);
checkReminders();
