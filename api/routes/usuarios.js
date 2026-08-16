// Módulo: Usuarios (CRUD de cuentas). Consultar el listado completo
// y modificar/eliminar cuentas requiere estar autenticado.
const express = require("express");
const Usuario = require("../models/Usuario");
const { verificarToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", verificarToken, async (_req, res) => {
  try {
    const usuarios = await Usuario.listar();
    res.json(usuarios.map((u) => u.paraJSON()));
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al listar usuarios." });
  }
});

router.get("/:id", verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.obtenerPorId(req.params.id);
    if (!usuario) return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado." });
    res.json(usuario.paraJSON());
  } catch (error) {
    console.error("Error al consultar usuario:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al consultar el usuario." });
  }
});

// Crear cuenta también existe aquí (alias de /autenticacion/registro)
// para que el módulo de usuarios tenga su CRUD completo.
router.post("/", async (req, res) => {
  try {
    const { correo, clave } = req.body;
    if (!correo || !clave || clave.length < 8) {
      return res.status(400).json({ ok: false, mensaje: "Correo válido y contraseña de mínimo 8 caracteres." });
    }

    const existente = await Usuario.obtenerPorCorreo(correo);
    if (existente) return res.status(409).json({ ok: false, mensaje: "Ese correo ya está registrado." });

    const usuario = await Usuario.crear({ correo, clave });
    res.status(201).json(usuario.paraJSON());
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al crear el usuario." });
  }
});

router.put("/:id", verificarToken, async (req, res) => {
  try {
    if (String(req.usuario.usuarioId) !== String(req.params.id)) {
      return res.status(403).json({ ok: false, mensaje: "Solo puedes modificar tu propia cuenta." });
    }
    const usuario = await Usuario.obtenerPorId(req.params.id);
    if (!usuario) return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado." });

    const actualizado = await Usuario.actualizar(req.params.id, req.body);
    res.json(actualizado.paraJSON());
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al actualizar el usuario." });
  }
});

router.delete("/:id", verificarToken, async (req, res) => {
  try {
    if (String(req.usuario.usuarioId) !== String(req.params.id)) {
      return res.status(403).json({ ok: false, mensaje: "Solo puedes eliminar tu propia cuenta." });
    }
    const eliminado = await Usuario.eliminar(req.params.id);
    if (!eliminado) return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado." });
    res.json({ ok: true, mensaje: "Usuario eliminado." });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al eliminar el usuario." });
  }
});

module.exports = router;
