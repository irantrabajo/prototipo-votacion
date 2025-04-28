const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// 🔥 Configuración de CORS para aceptar solo tu frontend
const corsOptions = {
    origin: "https://prototipo-votacion-frontend.onrender.com",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
};
app.use(cors(corsOptions));
app.use(express.json());

// ⚡ Conexión directa a tu base de datos Votacion-db en Render
const pool = new Pool({
    connectionString: "postgresql://prototipo_user:K0AhyZBlTOI32dGGkxb8jKRK4fk5jhxn@dpg-d07tbrer433s73bkcarg-a.oregon-postgres.render.com/prototipo_votacion",
    ssl: { rejectUnauthorized: false },
});

// 📌 Rutas API

// Prueba de que backend está vivo
app.get("/", (req, res) => {
    res.send("¡Backend corriendo exitosamente en Render!");
});

// Obtener lista de diputados
app.get("/api/diputados", async (req, res) => {
    try {
        const result = await pool.query("SELECT id, nombre, partido, foto FROM diputados");
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener diputados:", error);
        res.status(500).json({ error: "Error al obtener diputados" });
    }
});

// Registrar una nueva sesión
app.post("/api/sesion", async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: "Nombre de la sesión obligatorio" });

        const result = await pool.query(
            "INSERT INTO sesiones (nombre, fecha) VALUES ($1, NOW()) RETURNING id",
            [nombre]
        );
        res.status(201).json({ message: "Sesión creada", sesion_id: result.rows[0].id });
    } catch (error) {
        console.error("Error al registrar sesión:", error);
        res.status(500).json({ error: "Error al registrar sesión" });
    }
});

// Obtener todas las sesiones
app.get("/api/sesiones", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM sesiones");
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener sesiones:", error);
        res.status(500).json({ error: "Error al obtener sesiones" });
    }
});

// Registrar un voto
app.post("/api/voto", async (req, res) => {
    try {
        const { diputado_id, voto, asunto_id } = req.body;
        if (!diputado_id || !voto || !asunto_id)
            return res.status(400).json({ error: "Datos incompletos" });

        await pool.query(
            "INSERT INTO votos (diputado_id, asunto_id, voto) VALUES ($1, $2, $3)",
            [diputado_id, asunto_id, voto]
        );
        res.status(201).json({ message: "Voto registrado exitosamente" });
    } catch (error) {
        console.error("Error al registrar voto:", error);
        res.status(500).json({ error: "Error al registrar voto" });
    }
});

// Obtener resultados de la votación
app.get("/api/resultados", async (req, res) => {
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
        console.error("Error al obtener resultados:", error);
        res.status(500).json({ error: "Error al obtener resultados" });
    }
});

// 🚀 Iniciar servidor
app.listen(port, "0.0.0.0", () => {
    console.log(`🔥 Servidor corriendo en puerto ${port}`);
});
