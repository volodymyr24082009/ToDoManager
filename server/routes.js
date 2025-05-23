const express = require('express');
const router = express.Router();
const db = require('./db');

// Отримання всіх завдань
router.get('/tasks', async (req, res) => {
    try {
        const tasks = await db.getAllTasks();
        res.json(tasks);
    } catch (error) {
        console.error('Помилка при отриманні завдань:', error);
        res.status(500).json({ error: 'Не вдалося отримати завдання' });
    }
});

// Отримання завдання за ID
router.get('/tasks/:id', async (req, res) => {
    try {
        const task = await db.getTaskById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Завдання не знайдено' });
        }
        res.json(task);
    } catch (error) {
        console.error('Помилка при отриманні завдання:', error);
        res.status(500).json({ error: 'Не вдалося отримати завдання' });
    }
});

// Створення нового завдання
router.post('/tasks', async (req, res) => {
    try {
        const { title, description, status, priority, due_date } = req.body;
        
        // Перевірка обов'язкових полів
        if (!title) {
            return res.status(400).json({ error: 'Назва завдання обов\'язкова' });
        }
        
        const taskData = {
            title,
            description: description || '',
            status: status || 'todo',
            priority: priority || 'medium',
            due_date: due_date || null
        };
        
        const newTask = await db.createTask(taskData);
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Помилка при створенні завдання:', error);
        res.status(500).json({ error: 'Не вдалося створити завдання' });
    }
});

// Оновлення завдання
router.put('/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const { title, description, status, priority, due_date } = req.body;
        
        // Перевірка обов'язкових полів
        if (!title) {
            return res.status(400).json({ error: 'Назва завдання обов\'язкова' });
        }
        
        // Перевірка існування завдання
        const existingTask = await db.getTaskById(taskId);
        if (!existingTask) {
            return res.status(404).json({ error: 'Завдання не знайдено' });
        }
        
        const taskData = {
            title,
            description: description || '',
            status: status || existingTask.status,
            priority: priority || existingTask.priority,
            due_date: due_date || existingTask.due_date
        };
        
        const updatedTask = await db.updateTask(taskId, taskData);
        res.json(updatedTask);
    } catch (error) {
        console.error('Помилка при оновленні завдання:', error);
        res.status(500).json({ error: 'Не вдалося оновити завдання' });
    }
});

// Видалення завдання
router.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        
        // Перевірка існування завдання
        const existingTask = await db.getTaskById(taskId);
        if (!existingTask) {
            return res.status(404).json({ error: 'Завдання не знайдено' });
        }
        
        await db.deleteTask(taskId);
        res.json({ message: 'Завдання успішно видалено', id: taskId });
    } catch (error) {
        console.error('Помилка при видаленні завдання:', error);
        res.status(500).json({ error: 'Не вдалося видалити завдання' });
    }
});

module.exports = router;