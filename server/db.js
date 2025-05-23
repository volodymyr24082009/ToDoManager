const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Шлях до файлу бази даних
const dbPath = path.join(__dirname, '../database.sqlite');

// Перевірка наявності директорії для бази даних
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log('Шлях до бази даних SQLite:', dbPath);

// Створення з'єднання з базою даних
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Помилка при підключенні до бази даних SQLite:', err.message);
    } else {
        console.log('Підключено до бази даних SQLite');
    }
});

// Обгортка для запитів, що повертає Promise
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// Обгортка для запитів, що повертають дані
function getAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

// Обгортка для запитів, що повертають один рядок
function getOne(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

// Ініціалізація бази даних
async function initDatabase() {
    try {
        // Створення таблиці завдань, якщо вона не існує
        await runQuery(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'todo',
                priority TEXT DEFAULT 'medium',
                due_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Таблиця завдань готова');
        return true;
    } catch (error) {
        console.error('Помилка при ініціалізації бази даних:', error);
        throw error;
    }
}

// Отримання всіх завдань
async function getAllTasks() {
    try {
        const rows = await getAll('SELECT * FROM tasks ORDER BY created_at DESC');
        return rows;
    } catch (error) {
        console.error('Помилка при отриманні завдань:', error);
        throw error;
    }
}

// Отримання завдання за ID
async function getTaskById(id) {
    try {
        const row = await getOne('SELECT * FROM tasks WHERE id = ?', [id]);
        return row;
    } catch (error) {
        console.error('Помилка при отриманні завдання:', error);
        throw error;
    }
}

// Створення нового завдання
async function createTask(taskData) {
    try {
        const { title, description, status, priority, due_date } = taskData;
        const result = await runQuery(
            'INSERT INTO tasks (title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?)',
            [title, description, status, priority, due_date]
        );
        
        const newTask = await getTaskById(result.lastID);
        return newTask;
    } catch (error) {
        console.error('Помилка при створенні завдання:', error);
        throw error;
    }
}

// Оновлення завдання
async function updateTask(id, taskData) {
    try {
        const { title, description, status, priority, due_date } = taskData;
        await runQuery(
            'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, description, status, priority, due_date, id]
        );
        
        const updatedTask = await getTaskById(id);
        return updatedTask;
    } catch (error) {
        console.error('Помилка при оновленні завдання:', error);
        throw error;
    }
}

// Видалення завдання
async function deleteTask(id) {
    try {
        await runQuery('DELETE FROM tasks WHERE id = ?', [id]);
        return { id };
    } catch (error) {
        console.error('Помилка при видаленні завдання:', error);
        throw error;
    }
}

module.exports = {
    initDatabase,
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};