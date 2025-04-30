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

// Update current time
function updateTime() {
    const now = new Date();
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    const timeIconElement = document.getElementById('time-icon');

    // Format time in 24-hour format
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;

    // Format date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('en-US', options);

    // Update time icon based on hour
    let iconClass = '';
    if (hours >= 6 && hours < 12) {
        // Morning: 06:00 - 11:59
        iconClass = 'bi-sun morning';
    } else if (hours >= 12 && hours < 18) {
        // Afternoon: 12:00 - 17:59
        iconClass = 'bi-sun-fill afternoon';
    } else {
        // Night: 18:00 - 05:59
        iconClass = 'bi-moon-stars night';
    }
    timeIconElement.className = `bi ${iconClass} time-icon`;
}

setInterval(updateClock, 1000);
updateClock();

setInterval(updateTime, 1000);
updateTime();

// Task Modal Management
let currentTaskType = null;
let currentTaskId = null;
let currentHour = null;
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const reminderModal = new bootstrap.Modal(document.getElementById('reminderModal'));
const addImportantTaskModal = new bootstrap.Modal(document.getElementById('addImportantTaskModal'));
const addTodoModal = new bootstrap.Modal(document.getElementById('addTodoModal'));

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
    const modal = new bootstrap.Modal(document.getElementById('addImportantTaskModal'));
    // Clear form fields
    document.getElementById('important-task-title').value = '';
    document.getElementById('important-task-description').value = '';
    modal.show();
}

async function editImportantTask(id) {
    try {
        const response = await fetch(`/api/tasks/important_tasks/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch task details');
        }
        
        const task = await response.json();
        
        // Create edit form HTML
        const formHtml = `
            <form id="editTaskForm">
                <div class="mb-3">
                    <label class="form-label">Title</label>
                    <input type="text" class="form-control" id="edit-title" value="${task.title}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" id="edit-description" rows="3">${task.description || ''}</textarea>
                </div>
            </form>
        `;
        
        // Show edit modal
        const modalHtml = `
            <div class="modal fade" id="editTaskModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Important Task</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${formHtml}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="updateTask(${id}, 'important_tasks')">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if it exists
        const existingModal = document.getElementById('editTaskModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to document
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
        modal.show();
        
        // Remove modal from DOM when hidden
        document.getElementById('editTaskModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load task details');
    }
}

function showAddTodo() {
    const modal = new bootstrap.Modal(document.getElementById('addTodoModal'));
    // Clear form fields
    document.getElementById('todo-title').value = '';
    document.getElementById('todo-description').value = '';
    document.getElementById('todo-due-time').value = '';
    document.getElementById('todo-reminder-time').value = '';
    modal.show();
}

async function editTodo(id) {
    try {
        const response = await fetch(`/api/tasks/todos/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch todo details');
        }
        
        const todo = await response.json();
        
        // Create edit form HTML
        const formHtml = `
            <form id="editTodoForm">
                <div class="mb-3">
                    <label class="form-label">Title</label>
                    <input type="text" class="form-control" id="edit-title" value="${todo.title}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" id="edit-description" rows="3">${todo.description || ''}</textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Due Time</label>
                    <input type="time" class="form-control" id="edit-due-time" value="${todo.due_time || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Reminder Time</label>
                    <input type="time" class="form-control" id="edit-reminder-time" value="${todo.reminder_time || ''}">
                </div>
            </form>
        `;
        
        // Show edit modal
        const modalHtml = `
            <div class="modal fade" id="editTodoModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Todo</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${formHtml}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="updateTask(${id}, 'todos')">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if it exists
        const existingModal = document.getElementById('editTodoModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to document
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editTodoModal'));
        modal.show();
        
        // Remove modal from DOM when hidden
        document.getElementById('editTodoModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load todo details');
    }
}

async function deleteImportantTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`/api/tasks/important_tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete task');
        }

        // Remove the task element from DOM with animation
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.style.animation = 'fadeOut 0.3s';
            setTimeout(() => {
                taskElement.remove();
            }, 300);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete task');
    }
}

async function deleteTodo(todoId) {
    if (!confirm('Are you sure you want to delete this todo?')) {
        return;
    }

    try {
        const response = await fetch(`/api/tasks/todos/${todoId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete todo');
        }

        // Remove the todo element from DOM with animation
        const todoElement = document.querySelector(`[data-task-id="${todoId}"]`);
        if (todoElement) {
            todoElement.style.animation = 'fadeOut 0.3s';
            setTimeout(() => {
                todoElement.remove();
            }, 300);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete todo');
    }
}

// Update task
async function updateTask(taskId, type) {
    try {
        const title = document.getElementById('edit-title').value;
        const description = document.getElementById('edit-description').value;
        const dueTime = document.getElementById('edit-due-time')?.value;
        const reminderTime = document.getElementById('edit-reminder-time')?.value;

        if (!title) {
            alert('Title is required');
            return;
        }

        const response = await fetch(`/api/tasks/${type}/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                due_time: dueTime,
                reminder_time: reminderTime
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update task');
        }

        // Close the modal and refresh the page
        const modal = bootstrap.Modal.getInstance(document.getElementById(`edit${type === 'important_tasks' ? 'Task' : 'Todo'}Modal`));
        modal.hide();
        window.location.reload();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update task');
    }
}

async function addTask(type) {
    try {
        // Map type to form field IDs
        const fieldIds = {
            important_tasks: {
                title: 'important-task-title',
                description: 'important-task-description'
            },
            todos: {
                title: 'todo-title',
                description: 'todo-description',
                dueTime: 'todo-due-time',
                reminderTime: 'todo-reminder-time'
            }
        };

        const ids = fieldIds[type];
        if (!ids) {
            console.error(`Invalid task type: ${type}`);
            alert('Error: Invalid task type');
            return;
        }

        // Get form fields
        const titleField = document.getElementById(ids.title);
        const descriptionField = document.getElementById(ids.description);
        const dueTimeField = type === 'todos' ? document.getElementById(ids.dueTime) : null;
        const reminderTimeField = type === 'todos' ? document.getElementById(ids.reminderTime) : null;

        if (!titleField) {
            console.error(`Title field not found. ID: ${ids.title}`);
            alert('Error: Form field not found');
            return;
        }

        const title = titleField.value.trim();
        const description = descriptionField ? descriptionField.value.trim() : '';
        const dueTime = dueTimeField ? dueTimeField.value : null;
        const reminderTime = reminderTimeField ? reminderTimeField.value : null;

        if (!title) {
            alert('Title is required');
            titleField.focus();
            return;
        }

        const response = await fetch(`/api/tasks/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                due_time: dueTime,
                reminder_time: reminderTime,
                color: getRandomColor()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create task');
        }

        // Close the modal and refresh the page
        const modalId = type === 'important_tasks' ? 'addImportantTaskModal' : 'addTodoModal';
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) {
            modal.hide();
            // Clear form fields
            titleField.value = '';
            if (descriptionField) descriptionField.value = '';
            if (dueTimeField) dueTimeField.value = '';
            if (reminderTimeField) reminderTimeField.value = '';
        }
        window.location.reload();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Failed to create task');
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

async function updateTaskStatus(id, status, type) {
    try {
        const response = await fetch(`/api/tasks/${type}/${id}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update task status');
        }

        // If task is marked as done, remove it from the UI
        if (status === 'closed') {
            const taskCard = document.querySelector(`[data-task-id="${id}"]`);
            if (taskCard) {
                taskCard.remove();
            }
        } else {
            // Refresh the page to show updated status
            window.location.reload();
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Failed to update task status');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Initialize all modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modalEl => {
        new bootstrap.Modal(modalEl);
    });

    // Add animation class to new tasks
    document.querySelectorAll('.task-card').forEach(card => {
        card.classList.add('new');
    });
});

// Color utilities
const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
    '#F1C40F', '#E74C3C', '#1ABC9C', '#9B59B6', '#34495E'
];

function getRandomColor() {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
}

// Store task colors
const taskColors = new Map();

function getTaskColor(id) {
    if (!taskColors.has(id)) {
        taskColors.set(id, getRandomColor());
    }
    return taskColors.get(id);
}

// Check for reminders
function checkReminders() {
    fetch('/api/check-reminders')
        .then(response => response.json())
        .then(tasks => {
            tasks.forEach(task => {
                if (!shownReminders.has(task.id)) {
                    showReminderNotification(task);
                    shownReminders.add(task.id);
                }
            });
        })
        .catch(error => console.error('Error checking reminders:', error));
}

// Show reminder notification
function showReminderNotification(task) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="toast-header">
            <i class="bi bi-bell-fill me-2"></i>
            <strong class="me-auto">Reminder</strong>
            <small>${moment().format('HH:mm')}</small>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            <strong>${task.title}</strong><br>
            ${task.description || ''}
        </div>
    `;

    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    document.getElementById('toast-container').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Play notification sound
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.log('Error playing sound:', e));
}

// Initialize reminder checking
const shownReminders = new Set();
setInterval(checkReminders, 60000); // Check every minute
checkReminders(); // Initial check
