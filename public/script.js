// Глобальні змінні
let tasks = [];
let currentEditingTask = null;
let timerInterval = null;
let timerMinutes = 25;
let timerSeconds = 0;
let timerRunning = false;

// DOM елементи
const taskForm = document.getElementById('task-form');
const taskList = document.querySelectorAll('.task-list');
const themeToggle = document.getElementById('theme-toggle');
const pomodoroBtn = document.getElementById('pomodoro-btn');
const pomodoroModal = document.getElementById('pomodoro-modal');
const editModal = document.getElementById('edit-modal');
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const pomodoroModeBtn = document.getElementById('pomodoro-mode');
const shortBreakModeBtn = document.getElementById('short-break-mode');
const longBreakModeBtn = document.getElementById('long-break-mode');
const editForm = document.getElementById('edit-form');
const cancelEditBtn = document.getElementById('cancel-edit');

// Ініціалізація додатку
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    fetchTasks();
    setupEventListeners();
});

// Налаштування обробників подій
function setupEventListeners() {
    // Форма додавання завдання
    taskForm.addEventListener('submit', handleTaskFormSubmit);
    
    // Перемикач теми
    themeToggle.addEventListener('click', toggleTheme);
    
    // Кнопка Pomodoro
    pomodoroBtn.addEventListener('click', () => {
        pomodoroModal.style.display = 'block';
    });
    
    // Закриття модальних вікон
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Закриття модальних вікон при кліку поза ними
    window.addEventListener('click', (e) => {
        if (e.target === pomodoroModal) {
            pomodoroModal.style.display = 'none';
        }
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });
    
    // Кнопки Pomodoro таймера
    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);
    
    // Режими Pomodoro
    pomodoroModeBtn.addEventListener('click', () => setTimerMode('pomodoro'));
    shortBreakModeBtn.addEventListener('click', () => setTimerMode('shortBreak'));
    longBreakModeBtn.addEventListener('click', () => setTimerMode('longBreak'));
    
    // Форма редагування
    editForm.addEventListener('submit', handleEditFormSubmit);
    
    // Кнопка скасування редагування
    cancelEditBtn.addEventListener('click', () => {
        currentEditingTask = null;
        taskForm.reset();
        document.getElementById('task-id').value = '';
        document.querySelector('.btn-primary').textContent = 'Додати завдання';
        cancelEditBtn.style.display = 'none';
    });
}

// Завантаження завдань з сервера
async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) {
            throw new Error('Не вдалося завантажити завдання');
        }
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Помилка при завантаженні завдань:', error);
        showNotification('Помилка при завантаженні завдань', 'error');
    }
}

// Відображення завдань
function renderTasks() {
    // Очищення списків завдань
    document.querySelectorAll('.task-list').forEach(list => {
        list.innerHTML = '';
    });
    
    // Розподіл завдань за статусами
    const todoTasks = tasks.filter(task => task.status === 'todo');
    const inprogressTasks = tasks.filter(task => task.status === 'inprogress');
    const doneTasks = tasks.filter(task => task.status === 'done');
    
    // Відображення завдань у відповідних колонках
    renderTasksInColumn(todoTasks, 'todo');
    renderTasksInColumn(inprogressTasks, 'inprogress');
    renderTasksInColumn(doneTasks, 'done');
}

// Відображення завдань у колонці
function renderTasksInColumn(tasks, columnId) {
    const column = document.querySelector(`.task-list[data-status="${columnId}"]`);
    
    tasks.forEach(task => {
        const taskCard = createTaskCard(task);
        column.appendChild(taskCard);
    });
}

// Створення картки завдання
function createTaskCard(task) {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.draggable = true;
    taskCard.id = `task-${task.id}`;
    taskCard.dataset.id = task.id;
    
    // Встановлення обробників подій для перетягування
    taskCard.addEventListener('dragstart', dragStart);
    taskCard.addEventListener('dragend', dragEnd);
    
    // Форматування дати
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('uk-UA') : 'Без терміну';
    
    // HTML-структура картки
    taskCard.innerHTML = `
        <h3>${task.title}</h3>
        <p>${task.description || 'Без опису'}</p>
        <div class="due-date">Термін: ${dueDate}</div>
        <div class="priority priority-${task.priority}">${getPriorityText(task.priority)}</div>
        <div class="task-actions">
            <button type="button" class="edit-task" onclick="editTask(${task.id})">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button type="button" class="delete-task" onclick="deleteTask(${task.id})">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;
    
    return taskCard;
}

// Отримання текстового представлення пріоритету
function getPriorityText(priority) {
    switch (priority) {
        case 'low': return 'Низький';
        case 'medium': return 'Середній';
        case 'high': return 'Високий';
        default: return 'Середній';
    }
}

// Обробка відправки форми додавання завдання
async function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.getElementById('task-priority').value;
    const taskId = document.getElementById('task-id').value;
    
    const taskData = {
        title,
        description,
        due_date: dueDate,
        priority,
        status: 'todo'
    };
    
    try {
        let response;
        
        if (taskId) {
            // Оновлення існуючого завдання
            taskData.status = currentEditingTask.status;
            response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
            
            if (!response.ok) {
                throw new Error('Не вдалося оновити завдання');
            }
            
            // Оновлення завдання в масиві
            const index = tasks.findIndex(task => task.id == taskId);
            if (index !== -1) {
                tasks[index] = { ...tasks[index], ...taskData, id: taskId };
            }
            
            showNotification('Завдання оновлено', 'success');
        } else {
            // Створення нового завдання
            response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
            
            if (!response.ok) {
                throw new Error('Не вдалося створити завдання');
            }
            
            const newTask = await response.json();
            tasks.push(newTask);
            
            showNotification('Завдання додано', 'success');
        }
        
        // Скидання форми та оновлення відображення
        taskForm.reset();
        document.getElementById('task-id').value = '';
        document.querySelector('.btn-primary').textContent = 'Додати завдання';
        cancelEditBtn.style.display = 'none';
        currentEditingTask = null;
        
        renderTasks();
    } catch (error) {
        console.error('Помилка:', error);
        showNotification(error.message, 'error');
    }
}

// Редагування завдання
function editTask(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;
    
    currentEditingTask = task;
    
    // Заповнення форми даними завдання
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-due-date').value = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-id').value = task.id;
    
    // Зміна тексту кнопки та відображення кнопки скасування
    document.querySelector('.btn-primary').textContent = 'Оновити завдання';
    cancelEditBtn.style.display = 'block';
    
    // Прокрутка до форми
    document.querySelector('.task-form-container').scrollIntoView({ behavior: 'smooth' });
}

// Обробка відправки форми редагування
async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('edit-id').value;
    const title = document.getElementById('edit-title').value;
    const description = document.getElementById('edit-description').value;
    const dueDate = document.getElementById('edit-due-date').value;
    const priority = document.getElementById('edit-priority').value;
    const status = document.getElementById('edit-status').value;
    
    const taskData = {
        title,
        description,
        due_date: dueDate,
        priority,
        status
    };
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            throw new Error('Не вдалося оновити завдання');
        }
        
        // Оновлення завдання в масиві
        const index = tasks.findIndex(task => task.id == taskId);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...taskData };
        }
        
        // Закриття модального вікна та оновлення відображення
        editModal.style.display = 'none';
        renderTasks();
        
        showNotification('Завдання оновлено', 'success');
    } catch (error) {
        console.error('Помилка:', error);
        showNotification(error.message, 'error');
    }
}

// Видалення завдання
async function deleteTask(taskId) {
    if (!confirm('Ви впевнені, що хочете видалити це завдання?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Не вдалося видалити завдання');
        }
        
        // Видалення завдання з масиву
        tasks = tasks.filter(task => task.id != taskId);
        renderTasks();
        
        showNotification('Завдання видалено', 'success');
    } catch (error) {
        console.error('Помилка:', error);
        showNotification(error.message, 'error');
    }
}

// Функції для перетягування (Drag & Drop)
function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.target.classList.add('dragging');
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

async function drop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.currentTarget.dataset.status;
    
    // Знаходження завдання
    const task = tasks.find(t => t.id == taskId);
    if (!task || task.status === newStatus) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...task, status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Не вдалося оновити статус завдання');
        }
        
        // Оновлення статусу в масиві
        task.status = newStatus;
        renderTasks();
        
        showNotification('Статус завдання оновлено', 'success');
    } catch (error) {
        console.error('Помилка:', error);
        showNotification(error.message, 'error');
    }
}

// Функції для Pomodoro таймера
function startTimer() {
    if (timerRunning) return;
    
    timerRunning = true;
    startTimerBtn.disabled = true;
    pauseTimerBtn.disabled = false;
    
    timerInterval = setInterval(() => {
        if (timerSeconds === 0) {
            if (timerMinutes === 0) {
                // Таймер завершено
                clearInterval(timerInterval);
                timerRunning = false;
                startTimerBtn.disabled = false;
                pauseTimerBtn.disabled = true;
                
                // Звукове сповіщення
                const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
                audio.play();
                
                showNotification('Час вийшов!', 'info');
                return;
            }
            timerMinutes--;
            timerSeconds = 59;
        } else {
            timerSeconds--;
        }
        
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
    
    // Встановлення часу відповідно до активного режиму
    if (pomodoroModeBtn.classList.contains('active')) {
        timerMinutes = 25;
    } else if (shortBreakModeBtn.classList.contains('active')) {
        timerMinutes = 5;
    } else {
        timerMinutes = 15;
    }
    
    timerSeconds = 0;
    updateTimerDisplay();
}

function setTimerMode(mode) {
    // Видалення активного класу з усіх кнопок
    pomodoroModeBtn.classList.remove('active');
    shortBreakModeBtn.classList.remove('active');
    longBreakModeBtn.classList.remove('active');
    
    // Встановлення часу відповідно до вибраного режиму
    switch (mode) {
        case 'pomodoro':
            timerMinutes = 25;
            pomodoroModeBtn.classList.add('active');
            break;
        case 'shortBreak':
            timerMinutes = 5;
            shortBreakModeBtn.classList.add('active');
            break;
        case 'longBreak':
            timerMinutes = 15;
            longBreakModeBtn.classList.add('active');
            break;
    }
    
    timerSeconds = 0;
    updateTimerDisplay();
    
    // Скидання таймера, якщо він запущений
    if (timerRunning) {
        pauseTimer();
        resetTimer();
    }
}

function updateTimerDisplay() {
    minutesDisplay.textContent = timerMinutes.toString().padStart(2, '0');
    secondsDisplay.textContent = timerSeconds.toString().padStart(2, '0');
}

// Функції для роботи з темою
function toggleTheme() {
    const body = document.body;
    const isDarkTheme = body.classList.contains('dark-theme');
    
    if (isDarkTheme) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeToggle.innerHTML = '<span class="material-symbols-outlined">dark_mode</span>';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeToggle.innerHTML = '<span class="material-symbols-outlined">light_mode</span>';
        localStorage.setItem('theme', 'dark');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    
    if (savedTheme === 'dark') {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeToggle.innerHTML = '<span class="material-symbols-outlined">light_mode</span>';
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeToggle.innerHTML = '<span class="material-symbols-outlined">dark_mode</span>';
    }
}

// Функція для відображення сповіщень
function showNotification(message, type = 'info') {
    // Створення елемента сповіщення
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Додавання до DOM
    document.body.appendChild(notification);
    
    // Анімація появи
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Автоматичне закриття
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Додавання стилів для сповіщень
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s, transform 0.3s;
        z-index: 1001;
    }
    
    .notification.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .notification.success {
        background-color: var(--success-color);
    }
    
    .notification.error {
        background-color: var(--danger-color);
    }
    
    .notification.info {
        background-color: var(--primary-color);
    }
`;
document.head.appendChild(notificationStyles);