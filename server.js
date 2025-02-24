const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware para permitir solicitudes CORS y manejar JSON
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde el frontend
app.use(express.static(path.join(__dirname, '../Frontend')));

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Votacion_db',
    password: 'congreso28',
    port: 5432,
});

// 📌 Ruta para servir index.html cuando se accede a /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// 📌 Endpoint para obtener la lista de diputados
app.get('/api/diputados', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM diputados');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener diputados');
    }
});

// 📌 Endpoint para registrar una nueva sesión
app.post('/api/sesion', async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la sesión es obligatorio' });
        }

        const result = await pool.query(
            'INSERT INTO sesiones (nombre, fecha) VALUES ($1, NOW()) RETURNING id',
            [nombre]
        );

        res.status(201).json({ message: 'Sesión creada correctamente', sesion_id: result.rows[0].id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar la sesión' });
    }
});

// 📌 Endpoint para obtener todas las sesiones
app.get('/api/sesiones', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sesiones');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener sesiones:', error);
        res.status(500).json({ error: 'Error al obtener sesiones' });
    }
});

// 📌 Endpoint para registrar un voto
app.post('/api/voto', async (req, res) => {
    try {
        const { diputado_id, voto, asunto, sesion_id } = req.body;

        if (!diputado_id || !voto || !sesion_id) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        await pool.query(
            'INSERT INTO votos (diputado_id, voto, asunto, sesion_id) VALUES ($1, $2, $3, $4)',
            [diputado_id, voto, asunto, sesion_id]
        );

        res.status(201).json({ message: 'Voto registrado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al registrar el voto');
    }
});

// 📌 Endpoint para obtener resultados de la votación
app.get('/api/resultados', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.nombre,
                   SUM(CASE WHEN v.voto = 'a favor' THEN 1 ELSE 0 END) AS a_favor,
                   SUM(CASE WHEN v.voto = 'en contra' THEN 1 ELSE 0 END) AS en_contra,
                   SUM(CASE WHEN v.voto = 'abstenciones' THEN 1 ELSE 0 END) AS abstenciones,
                   SUM(CASE WHEN v.voto = 'ausente' THEN 1 ELSE 0 END) AS ausente
            FROM votos v
            JOIN diputados d ON v.diputado_id = d.id
            GROUP BY d.nombre
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener resultados');
    }
});

//  Iniciamos el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});


