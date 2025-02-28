const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000; // ⚡ Importante: Usamos el puerto que Render asigne

// 🔥 Middleware de CORS configurado correctamente
const corsOptions = {
    origin: "https://prototipo-votacion-frontend.onrender.com", // Permitir solicitudes solo desde el frontend
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
};
app.use(cors(corsOptions));

app.use(express.json());

// ⚡ Configuración de la conexión a PostgreSQL en Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // ⚡ Importante para conexiones seguras en Render
    },
});

// 📌 Endpoint de prueba para verificar que el backend funciona
app.get("/", (req, res) => {
    res.send("¡El backend está funcionando en Render!");
});

// 📌 Endpoint para obtener la lista de diputados
app.get("/api/diputados", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM diputados");
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No se encontraron diputados" });
        }
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener diputados:", error);
        res.status(500).json({ error: "Error al obtener diputados" });
    }
});

// 📌 Endpoint para registrar una nueva sesión
app.post("/api/sesion", async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) {
            return res.status(400).json({ error: "El nombre de la sesión es obligatorio" });
        }

        const result = await pool.query(
            "INSERT INTO sesiones (nombre, fecha) VALUES ($1, NOW()) RETURNING id",
            [nombre]
        );

        res.status(201).json({ message: "Sesión creada correctamente", sesion_id: result.rows[0].id });
    } catch (error) {
        console.error("Error al registrar la sesión:", error);
        res.status(500).json({ error: "Error al registrar la sesión" });
    }
});

// 📌 Endpoint para obtener todas las sesiones
app.get("/api/sesiones", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM sesiones");
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener sesiones:", error);
        res.status(500).json({ error: "Error al obtener sesiones" });
    }
});

// 📌 Endpoint para registrar un voto
app.post("/api/voto", async (req, res) => {
    try {
        const { diputado_id, voto, asunto, sesion_id } = req.body;

        if (!diputado_id || !voto || !asunto || !sesion_id) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        // 1️⃣ Buscar si el asunto ya existe en la base de datos
        let asuntoQuery = await pool.query(
            "SELECT id FROM asuntos WHERE nombre = $1 AND sesion_id = $2",
            [asunto, sesion_id]
        );

        let asunto_id;

        if (asuntoQuery.rows.length > 0) {
            // Si el asunto ya existe, usar su id
            asunto_id = asuntoQuery.rows[0].id;
        } else {
            // Si no existe, crearlo y obtener su id
            const newAsunto = await pool.query(
                "INSERT INTO asuntos (nombre, sesion_id) VALUES ($1, $2) RETURNING id",
                [asunto, sesion_id]
            );
            asunto_id = newAsunto.rows[0].id;
        }

        // 2️⃣ Insertar el voto en la tabla
        await pool.query(
            "INSERT INTO votos (diputado_id, asunto_id, voto, sesion_id) VALUES ($1, $2, $3, $4)",
            [diputado_id, asunto_id, voto, sesion_id]
        );

        res.status(201).json({ message: "Voto registrado exitosamente" });
    } catch (error) {
        console.error("Error al registrar el voto:", error);
        res.status(500).json({ error: "Error al registrar el voto" });
    }
});

// 📌 Endpoint p
