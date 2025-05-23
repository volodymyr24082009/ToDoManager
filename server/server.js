const express = require('express');
const path = require('path');
const cors = require('cors');
const routes = require('./routes');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статичні файли
app.use(express.static(path.join(__dirname, '../public')));

// API маршрути
app.use('/api', routes);

// Маршрут для головної сторінки
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Обробка помилок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Щось пішло не так!' });
});

// Ініціалізація бази даних та запуск сервера
async function startServer() {
    try {
        await db.initDatabase();
        app.listen(PORT, () => {
            console.log(`Сервер запущено на порту ${PORT}`);
            console.log(`Відкрийте http://localhost:${PORT} у вашому браузері`);
        });
    } catch (error) {
        console.error('Не вдалося запустити сервер:', error);
        process.exit(1);
    }
}

startServer();