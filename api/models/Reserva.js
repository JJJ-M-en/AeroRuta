// Modelo Reserva — usado por el módulo "servicios" (en AeroRuta, el
// servicio que presta la plataforma es la reserva del vuelo).
// Las operaciones que tocan inventario de asientos usan una
// transacción con bloqueo de fila (FOR UPDATE) para que dos
// reservas simultáneas no tomen el mismo cupo.
const pool = require("../db/connection");

const COLUMNA_DISPONIBLES = {
  economica: "asientos_disponibles_economica",
  ejecutiva: "asientos_disponibles_ejecutiva",
};
const COLUMNA_TOTALES = {
  economica: "asientos_totales_economica",
  ejecutiva: "asientos_totales_ejecutiva",
};

/** Convierte un número de asiento ocupado (1, 2, 3...) en una
 *  etiqueta legible tipo "3B". Económica: 4 asientos por fila
 *  (A-D). Ejecutiva: 2 asientos por fila (A-B). */
function generarEtiquetaAsiento(numero, clase) {
  const letras = clase === "ejecutiva" ? ["A", "B"] : ["A", "B", "C", "D"];
  const porFila = letras.length;
  const fila = Math.floor((numero - 1) / porFila) + 1;
  const letra = letras[(numero - 1) % porFila];
  return `${fila}${letra}`;
}

class Reserva {
  constructor(fila) {
    this.id = fila.id;
    this.usuarioId = fila.usuario_id;
    this.vueloId = fila.vuelo_id;
    this.clase = fila.clase;
    this.asiento = fila.asiento;
    this.estado = fila.estado;
    this.nombrePasajero = fila.nombre_pasajero;
    this.fechaViaje = fila.fecha_viaje;
    this.cantidadPasajeros = fila.cantidad_pasajeros;
    this.creadoEn = fila.creado_en;
    this.codigoVuelo = fila.codigo;
    this.destinoVuelo = fila.destino;
    this.precioVuelo = fila.precio;
  }

  static async listarPorUsuario(usuarioId, estado = "todas") {
    let sql = `
      SELECT reservas.*, vuelos.codigo, vuelos.destino, vuelos.precio
      FROM reservas
      JOIN vuelos ON vuelos.id = reservas.vuelo_id
      WHERE reservas.usuario_id = ?`;
    const parametros = [usuarioId];

    if (estado === "activas") {
      sql += " AND reservas.estado = 'activa'";
    } else if (estado === "canceladas") {
      sql += " AND reservas.estado = 'cancelada'";
    }
    sql += " ORDER BY reservas.creado_en DESC";

    const [filas] = await pool.query(sql, parametros);
    return filas.map((fila) => new Reserva(fila));
  }

  static async obtenerPorId(id) {
    const [filas] = await pool.query(
      `SELECT reservas.*, vuelos.codigo, vuelos.destino, vuelos.precio
       FROM reservas JOIN vuelos ON vuelos.id = reservas.vuelo_id
       WHERE reservas.id = ?`,
      [id]
    );
    return filas.length ? new Reserva(filas[0]) : null;
  }

  static async crear({ usuarioId, vueloId, clase = "economica", nombrePasajero, fechaViaje, cantidadPasajeros = 1 }) {
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const columnaDisp = COLUMNA_DISPONIBLES[clase];
      const columnaTot = COLUMNA_TOTALES[clase];

      const [vuelos] = await conexion.query(
        `SELECT id, ${columnaDisp} AS disponibles, ${columnaTot} AS totales
         FROM vuelos WHERE id = ? FOR UPDATE`,
        [vueloId]
      );

      if (vuelos.length === 0) {
        await conexion.rollback();
        const error = new Error("Vuelo no encontrado.");
        error.codigo = "VUELO_NO_ENCONTRADO";
        throw error;
      }

      const { disponibles, totales } = vuelos[0];
      if (disponibles < cantidadPasajeros) {
        await conexion.rollback();
        const error = new Error(`Solo quedan ${disponibles} asiento(s) disponibles en clase ${clase}.`);
        error.codigo = "SIN_CUPO";
        throw error;
      }

      const numeroAsiento = totales - disponibles + 1;
      const etiqueta = generarEtiquetaAsiento(numeroAsiento, clase);

      await conexion.query(`UPDATE vuelos SET ${columnaDisp} = ${columnaDisp} - ? WHERE id = ?`, [cantidadPasajeros, vueloId]);
      const [resultado] = await conexion.query(
        `INSERT INTO reservas
          (usuario_id, vuelo_id, clase, asiento, estado, nombre_pasajero, fecha_viaje, cantidad_pasajeros)
         VALUES (?, ?, ?, ?, 'activa', ?, ?, ?)`,
        [usuarioId, vueloId, clase, etiqueta, nombrePasajero, fechaViaje, cantidadPasajeros]
      );

      await conexion.commit();
      return Reserva.obtenerPorId(resultado.insertId);
    } catch (error) {
      await conexion.rollback().catch(() => {});
      throw error;
    } finally {
      conexion.release();
    }
  }

  static async cambiarClase(id, nuevaClase) {
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [reservas] = await conexion.query("SELECT * FROM reservas WHERE id = ? FOR UPDATE", [id]);
      if (reservas.length === 0) {
        await conexion.rollback();
        const error = new Error("Reserva no encontrada.");
        error.codigo = "RESERVA_NO_ENCONTRADA";
        throw error;
      }
      const reserva = reservas[0];

      if (reserva.clase === nuevaClase) {
        await conexion.rollback();
        return Reserva.obtenerPorId(id);
      }

      const columnaDispNueva = COLUMNA_DISPONIBLES[nuevaClase];
      const columnaTotNueva = COLUMNA_TOTALES[nuevaClase];
      const columnaDispVieja = COLUMNA_DISPONIBLES[reserva.clase];

      const [vuelos] = await conexion.query(
        `SELECT ${columnaDispNueva} AS disponibles, ${columnaTotNueva} AS totales
         FROM vuelos WHERE id = ? FOR UPDATE`,
        [reserva.vuelo_id]
      );
      if (vuelos.length === 0 || vuelos[0].disponibles < reserva.cantidad_pasajeros) {
        await conexion.rollback();
        const error = new Error(`No quedan suficientes asientos disponibles en clase ${nuevaClase}.`);
        error.codigo = "SIN_CUPO";
        throw error;
      }

      const numeroAsiento = vuelos[0].totales - vuelos[0].disponibles + 1;
      const etiqueta = generarEtiquetaAsiento(numeroAsiento, nuevaClase);

      await conexion.query(`UPDATE vuelos SET ${columnaDispVieja} = ${columnaDispVieja} + ? WHERE id = ?`, [reserva.cantidad_pasajeros, reserva.vuelo_id]);
      await conexion.query(`UPDATE vuelos SET ${columnaDispNueva} = ${columnaDispNueva} - ? WHERE id = ?`, [reserva.cantidad_pasajeros, reserva.vuelo_id]);
      await conexion.query("UPDATE reservas SET clase = ?, asiento = ? WHERE id = ?", [nuevaClase, etiqueta, id]);

      await conexion.commit();
      return Reserva.obtenerPorId(id);
    } catch (error) {
      await conexion.rollback().catch(() => {});
      throw error;
    } finally {
      conexion.release();
    }
  }

  static async cancelar(id) {
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [reservas] = await conexion.query("SELECT * FROM reservas WHERE id = ? FOR UPDATE", [id]);
      if (reservas.length === 0) {
        await conexion.rollback();
        return false;
      }
      const reserva = reservas[0];
      if (reserva.estado === "cancelada") {
        await conexion.rollback();
        return true;
      }

      const columnaDisp = COLUMNA_DISPONIBLES[reserva.clase];
      await conexion.query("UPDATE reservas SET estado = 'cancelada' WHERE id = ?", [id]);
      await conexion.query(`UPDATE vuelos SET ${columnaDisp} = ${columnaDisp} + ? WHERE id = ?`, [reserva.cantidad_pasajeros, reserva.vuelo_id]);

      await conexion.commit();
      return true;
    } catch (error) {
      await conexion.rollback().catch(() => {});
      throw error;
    } finally {
      conexion.release();
    }
  }

  static async cancelarTodasDe(usuarioId) {
    const [activas] = await pool.query(
      "SELECT id FROM reservas WHERE usuario_id = ? AND estado = 'activa'",
      [usuarioId]
    );
    for (const fila of activas) {
      await Reserva.cancelar(fila.id);
    }
    return activas.length;
  }
}

module.exports = Reserva;
