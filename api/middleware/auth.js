// middleware/auth.js
// Verifica el JWT en el header Authorization: Bearer <token>.
// También rechaza tokens que fueron cerrados con DELETE /autenticacion/sesion.
const jwt = require("jsonwebtoken");
const pool = require("../db/connection");

const JWT_SECRET = process.env.JWT_SECRET || "cambia-este-secreto-en-produccion";

async function verificarToken(req, res, next) {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ ok: false, mensaje: "Token requerido." });
  }

  try {
    const [revocados] = await pool.query("SELECT id FROM tokens_revocados WHERE token = ?", [token]);
    if (revocados.length > 0) {
      return res.status(401).json({ ok: false, mensaje: "La sesión fue cerrada. Inicia sesión de nuevo." });
    }

    jwt.verify(token, JWT_SECRET, (error, payload) => {
      if (error) return res.status(403).json({ ok: false, mensaje: "Token inválido o expirado." });
      req.usuario = payload; // { usuarioId, correo }
      req.token = token;
      next();
    });
  } catch (error) {
    console.error("Error al verificar token:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al verificar la sesión." });
  }
}

module.exports = { verificarToken, JWT_SECRET };
