// AeroRuta API — servidor principal.
// Expone 4 módulos REST: autenticación, usuarios, productos (vuelos)
// y servicios (reservas), cada uno con GET/POST/PUT/DELETE.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const rutasAutenticacion = require("./routes/autenticacion");
const rutasUsuarios = require("./routes/usuarios");
const rutasProductos = require("./routes/productos");
const rutasServicios = require("./routes/servicios");

const app = express();

app.use(cors()); // permite que el frontend (Live Server / Acode) consuma la API
app.use(express.json());

// Límite general para toda la API (protección básica ante abuso)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get("/api", (_req, res) => {
  res.json({
    nombre: "AeroRuta API",
    modulos: ["autenticacion", "usuarios", "productos", "servicios"],
  });
});

app.use("/api/autenticacion", rutasAutenticacion);
app.use("/api/usuarios", rutasUsuarios);
app.use("/api/productos", rutasProductos);
app.use("/api/servicios", rutasServicios);

app.use((_req, res) => {
  res.status(404).json({ ok: false, mensaje: "Ruta no encontrada." });
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
  console.log(`AeroRuta API escuchando en http://localhost:${PUERTO}`);
});
