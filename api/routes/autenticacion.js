// Módulo: Autenticación (con JWT)
// POST   /api/autenticacion/registro      → crea una cuenta
// POST   /api/autenticacion/login         → valida credenciales, entrega un JWT
// GET    /api/autenticacion/sesion        → valida el token enviado (requiere Authorization)
// PUT    /api/autenticacion/clave         → cambia la contraseña (requiere Authorization)
// DELETE /api/autenticacion/sesion        → cierra sesión, revoca el token (requiere Authorization)
const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const Usuario = require("../models/Usuario");
const pool = require("../db/connection");
const { verificarToken, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Límite de intentos: máximo 10 intentos de login cada 15 minutos
// por IP, para dificultar ataques de fuerza bruta.
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, mensaje: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
});

function generarToken(usuario) {
  return jwt.sign({ usuarioId: usuario.id, correo: usuario.correo }, JWT_SECRET, { expiresIn: "2h" });
}

router.post("/registro", async (req, res) => {
  try {
    const { correo, clave } = req.body;
    if (!correo || !clave || clave.length < 8) {
      return res.status(400).json({ ok: false, mensaje: "Correo válido y contraseña de mínimo 8 caracteres." });
    }

    const existente = await Usuario.obtenerPorCorreo(correo);
    if (existente) return res.status(409).json({ ok: false, mensaje: "Ese correo ya está registrado." });

    const usuario = await Usuario.crear({ correo, clave });
    const token = generarToken(usuario);
    res.status(201).json({ ok: true, token, usuario: usuario.paraJSON() });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al registrar." });
  }
});

router.post("/login", limitadorLogin, async (req, res) => {
  try {
    const { correo, clave } = req.body;
    if (!correo || !clave) {
      return res.status(400).json({ ok: false, mensaje: "Correo y contraseña son obligatorios." });
    }

    const usuario = await Usuario.obtenerPorCorreo(correo);

    // Comparación a tiempo constante: si el usuario no existe, igual
    // se compara contra un hash señuelo para que el tiempo de
    // respuesta no delate si el correo está registrado o no.
    const coincide = usuario
      ? await usuario.verificarClave(clave)
      : await Usuario.verificarClaveContraSeñuelo(clave);

    if (!usuario || !coincide) {
      return res.status(401).json({ ok: false, mensaje: "Correo o contraseña incorrectos." });
    }

    const token = generarToken(usuario);
    res.json({ ok: true, token, usuario: usuario.paraJSON() });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al iniciar sesión." });
  }
});

router.get("/sesion", verificarToken, (req, res) => {
  // Si llegó hasta aquí, verificarToken ya validó el JWT.
  res.json({ ok: true, usuario: { id: req.usuario.usuarioId, correo: req.usuario.correo } });
});

router.put("/clave", verificarToken, async (req, res) => {
  try {
    const { claveActual, claveNueva } = req.body;
    if (!claveActual || !claveNueva || claveNueva.length < 8) {
      return res.status(400).json({ ok: false, mensaje: "Clave actual y clave nueva (mínimo 8 caracteres) son obligatorias." });
    }

    const usuario = await Usuario.obtenerPorId(req.usuario.usuarioId);
    if (!usuario || !(await usuario.verificarClave(claveActual))) {
      return res.status(401).json({ ok: false, mensaje: "La contraseña actual no es correcta." });
    }

    await Usuario.actualizar(usuario.id, { clave: claveNueva });
    res.json({ ok: true, mensaje: "Contraseña actualizada." });
  } catch (error) {
    console.error("Error al cambiar clave:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al cambiar la contraseña." });
  }
});

router.delete("/sesion", verificarToken, async (req, res) => {
  try {
    await pool.query("INSERT IGNORE INTO tokens_revocados (token) VALUES (?)", [req.token]);
    res.json({ ok: true, mensaje: "Sesión cerrada." });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al cerrar sesión." });
  }
});

module.exports = router;
