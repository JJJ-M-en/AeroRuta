// Modelo Vuelo — usado por el módulo "productos" (en AeroRuta, el
// producto que se vende es el tiquete de cada vuelo). Ahora incluye
// inventario de asientos por clase (económica / ejecutiva).
const pool = require("../db/connection");

class Vuelo {
  constructor(fila) {
    this.id = fila.id;
    this.codigo = fila.codigo;
    this.aerolinea = fila.aerolinea;
    this.origen = fila.origen;
    this.destino = fila.destino;
    this.tipo = fila.tipo;
    this.puerta = fila.puerta;
    this.hora = fila.hora;
    this.estado = fila.estado;
    this.precio = fila.precio;
    this.asientos = {
      economica: {
        totales: fila.asientos_totales_economica,
        disponibles: fila.asientos_disponibles_economica,
      },
      ejecutiva: {
        totales: fila.asientos_totales_ejecutiva,
        disponibles: fila.asientos_disponibles_ejecutiva,
      },
    };
  }

  static async listar({ tipo, destino, origen, orden } = {}) {
    let sql = "SELECT * FROM vuelos WHERE 1=1";
    const parametros = [];

    if (tipo && tipo !== "todos") {
      sql += " AND tipo = ?";
      parametros.push(tipo);
    }
    if (destino) {
      sql += " AND destino LIKE ?";
      parametros.push(`%${destino}%`);
    }
    if (origen) {
      sql += " AND origen LIKE ?";
      parametros.push(`%${origen}%`);
    }
    sql += ` ORDER BY precio ${orden === "desc" ? "DESC" : "ASC"}`;

    const [filas] = await pool.query(sql, parametros);
    return filas.map((fila) => new Vuelo(fila));
  }

  static async obtenerPorId(id) {
    const [filas] = await pool.query("SELECT * FROM vuelos WHERE id = ?", [id]);
    return filas.length ? new Vuelo(filas[0]) : null;
  }

  static async crear(datos) {
    const {
      codigo, aerolinea = "AeroRuta", origen, destino, tipo, puerta, hora,
      estado = "atiempo", precio,
      asientosEconomica = 20, asientosEjecutiva = 6,
    } = datos;

    const [resultado] = await pool.query(
      `INSERT INTO vuelos
        (codigo, aerolinea, origen, destino, tipo, puerta, hora, estado, precio,
         asientos_totales_economica, asientos_disponibles_economica,
         asientos_totales_ejecutiva, asientos_disponibles_ejecutiva)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, aerolinea, origen, destino, tipo, puerta, hora, estado, precio,
       asientosEconomica, asientosEconomica, asientosEjecutiva, asientosEjecutiva]
    );
    return Vuelo.obtenerPorId(resultado.insertId);
  }

  static async actualizar(id, datos) {
    const mapaColumnas = {
      codigo: "codigo", aerolinea: "aerolinea", origen: "origen", destino: "destino",
      tipo: "tipo", puerta: "puerta", hora: "hora", estado: "estado", precio: "precio",
    };
    const asignaciones = [];
    const valores = [];

    Object.entries(mapaColumnas).forEach(([campo, columna]) => {
      if (datos[campo] !== undefined) {
        asignaciones.push(`${columna} = ?`);
        valores.push(datos[campo]);
      }
    });

    if (asignaciones.length === 0) return Vuelo.obtenerPorId(id);

    valores.push(id);
    await pool.query(`UPDATE vuelos SET ${asignaciones.join(", ")} WHERE id = ?`, valores);
    return Vuelo.obtenerPorId(id);
  }

  static async eliminar(id) {
    const [resultado] = await pool.query("DELETE FROM vuelos WHERE id = ?", [id]);
    return resultado.affectedRows > 0;
  }
}

module.exports = Vuelo;
