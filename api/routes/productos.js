// Módulo: Productos (en AeroRuta, el producto es el vuelo/tiquete).
// La consulta es pública; crear/editar/borrar vuelos requiere sesión
// (en un sistema real, además se exigiría un rol de administrador).
const express = require("express");
const Vuelo = require("../models/Vuelo");
const { verificarToken } = require("../middleware/auth");

const router = express.Router();

// GET /api/productos?tipo=nacional&destino=cartagena&origen=bogota&orden=asc|desc
router.get("/", async (req, res) => {
  try {
    const vuelos = await Vuelo.listar(req.query);
    res.json(vuelos);
  } catch (error) {
    console.error("Error al listar productos:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al listar los vuelos." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const vuelo = await Vuelo.obtenerPorId(req.params.id);
    if (!vuelo) return res.status(404).json({ ok: false, mensaje: "Vuelo no encontrado." });
    res.json(vuelo);
  } catch (error) {
    console.error("Error al consultar producto:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al consultar el vuelo." });
  }
});

router.post("/", verificarToken, async (req, res) => {
  try {
    const { codigo, origen, destino, tipo, precio } = req.body;
    if (!codigo || !origen || !destino || !tipo || !precio) {
      return res.status(400).json({ ok: false, mensaje: "codigo, origen, destino, tipo y precio son obligatorios." });
    }
    const vuelo = await Vuelo.crear(req.body);
    res.status(201).json(vuelo);
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al crear el vuelo." });
  }
});

router.put("/:id", verificarToken, async (req, res) => {
  try {
    const vuelo = await Vuelo.obtenerPorId(req.params.id);
    if (!vuelo) return res.status(404).json({ ok: false, mensaje: "Vuelo no encontrado." });

    const actualizado = await Vuelo.actualizar(req.params.id, req.body);
    res.json(actualizado);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al actualizar el vuelo." });
  }
});

router.delete("/:id", verificarToken, async (req, res) => {
  try {
    const eliminado = await Vuelo.eliminar(req.params.id);
    if (!eliminado) return res.status(404).json({ ok: false, mensaje: "Vuelo no encontrado." });
    res.json({ ok: true, mensaje: "Vuelo eliminado." });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al eliminar el vuelo." });
  }
});

module.exports = router;
