// Módulo: Servicios (en AeroRuta, el servicio prestado es la reserva
// de un vuelo). Todo el módulo requiere sesión: las reservas
// pertenecen al usuario autenticado, no a un identificador anónimo.
const express = require("express");
const Reserva = require("../models/Reserva");
const { verificarToken } = require("../middleware/auth");

const router = express.Router();
router.use(verificarToken);

// GET /api/servicios?estado=activas|canceladas|todas
router.get("/", async (req, res) => {
  try {
    const reservas = await Reserva.listarPorUsuario(req.usuario.usuarioId, req.query.estado || "todas");
    res.json(reservas);
  } catch (error) {
    console.error("Error al listar servicios:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al listar las reservas." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const reserva = await Reserva.obtenerPorId(req.params.id);
    if (!reserva || reserva.usuarioId !== req.usuario.usuarioId) {
      return res.status(404).json({ ok: false, mensaje: "Reserva no encontrada." });
    }
    res.json(reserva);
  } catch (error) {
    console.error("Error al consultar servicio:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al consultar la reserva." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { vueloId, clase, nombrePasajero, fechaViaje, cantidadPasajeros } = req.body;
    if (!vueloId || !nombrePasajero || !fechaViaje || !cantidadPasajeros) {
      return res.status(400).json({
        ok: false,
        mensaje: "vueloId, nombrePasajero, fechaViaje y cantidadPasajeros son obligatorios.",
      });
    }

    const reserva = await Reserva.crear({
      usuarioId: req.usuario.usuarioId,
      vueloId,
      clase: clase === "ejecutiva" ? "ejecutiva" : "economica",
      nombrePasajero,
      fechaViaje,
      cantidadPasajeros,
    });
    res.status(201).json(reserva);
  } catch (error) {
    if (error.codigo === "SIN_CUPO" || error.codigo === "VUELO_NO_ENCONTRADO") {
      return res.status(409).json({ ok: false, mensaje: error.message });
    }
    console.error("Error al crear servicio:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al crear la reserva." });
  }
});

// Cambia la clase de una reserva activa (reasigna asiento e inventario)
router.put("/:id", async (req, res) => {
  try {
    const { clase } = req.body;
    if (clase !== "economica" && clase !== "ejecutiva") {
      return res.status(400).json({ ok: false, mensaje: "clase debe ser 'economica' o 'ejecutiva'." });
    }

    const reserva = await Reserva.obtenerPorId(req.params.id);
    if (!reserva || reserva.usuarioId !== req.usuario.usuarioId) {
      return res.status(404).json({ ok: false, mensaje: "Reserva no encontrada." });
    }

    const actualizada = await Reserva.cambiarClase(req.params.id, clase);
    res.json(actualizada);
  } catch (error) {
    if (error.codigo === "SIN_CUPO" || error.codigo === "RESERVA_NO_ENCONTRADA") {
      return res.status(409).json({ ok: false, mensaje: error.message });
    }
    console.error("Error al actualizar servicio:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al actualizar la reserva." });
  }
});

// Cancela todas las reservas activas del usuario autenticado
router.delete("/", async (req, res) => {
  try {
    const total = await Reserva.cancelarTodasDe(req.usuario.usuarioId);
    res.json({ ok: true, mensaje: `${total} reserva(s) cancelada(s).` });
  } catch (error) {
    console.error("Error al vaciar servicios:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al cancelar las reservas." });
  }
});

// Cancela una reserva puntual
router.delete("/:id", async (req, res) => {
  try {
    const reserva = await Reserva.obtenerPorId(req.params.id);
    if (!reserva || reserva.usuarioId !== req.usuario.usuarioId) {
      return res.status(404).json({ ok: false, mensaje: "Reserva no encontrada." });
    }
    await Reserva.cancelar(req.params.id);
    res.json({ ok: true, mensaje: "Reserva cancelada." });
  } catch (error) {
    console.error("Error al eliminar servicio:", error);
    res.status(500).json({ ok: false, mensaje: "Error del servidor al cancelar la reserva." });
  }
});

module.exports = router;
