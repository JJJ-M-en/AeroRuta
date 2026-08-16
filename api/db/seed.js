// Script de siembra: carga vuelos de ejemplo (ahora con origen y
// cupos por clase) y crea un usuario de prueba.
// Ejecutar una sola vez con:  npm run seed
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./connection");

const VUELOS = [
  { codigo: "AR102", aerolinea: "AeroRuta", origen: "Bogotá (BOG)", destino: "Medellín (MDE)", tipo: "nacional", puerta: "A4", hora: "08:15", estado: "atiempo", precio: 185000, economica: 24, ejecutiva: 6 },
  { codigo: "AR230", aerolinea: "AeroRuta", origen: "Bogotá (BOG)", destino: "Cartagena (CTG)", tipo: "nacional", puerta: "B2", hora: "09:40", estado: "embarcando", precio: 210000, economica: 24, ejecutiva: 6 },
  { codigo: "AR450", aerolinea: "AeroRuta", origen: "Medellín (MDE)", destino: "San Andrés (ADZ)", tipo: "nacional", puerta: "C1", hora: "10:05", estado: "atiempo", precio: 320000, economica: 20, ejecutiva: 4 },
  { codigo: "AR318", aerolinea: "AeroRuta", origen: "Medellín (MDE)", destino: "Cali (CLO)", tipo: "nacional", puerta: "A1", hora: "11:20", estado: "retrasado", precio: 170000, economica: 24, ejecutiva: 6 },
  { codigo: "AR777", aerolinea: "AeroRuta", origen: "Bogotá (BOG)", destino: "Ciudad de Panamá (PTY)", tipo: "internacional", puerta: "D3", hora: "12:50", estado: "atiempo", precio: 480000, economica: 30, ejecutiva: 8 },
  { codigo: "AR512", aerolinea: "AeroRuta", origen: "Cartagena (CTG)", destino: "Bogotá (BOG)", tipo: "nacional", puerta: "B5", hora: "13:30", estado: "embarcando", precio: 165000, economica: 24, ejecutiva: 6 },
  { codigo: "AR890", aerolinea: "AeroRuta", origen: "Bogotá (BOG)", destino: "Miami (MIA)", tipo: "internacional", puerta: "D1", hora: "14:10", estado: "atiempo", precio: 890000, economica: 30, ejecutiva: 8 },
  { codigo: "AR205", aerolinea: "AeroRuta", origen: "Medellín (MDE)", destino: "Cartagena (CTG)", tipo: "nacional", puerta: "B3", hora: "15:45", estado: "atiempo", precio: 225000, economica: 24, ejecutiva: 6 },
];

const USUARIO_PRUEBA = { correo: "piloto@aeroruta.com", clave: "AeroRuta2026" };

async function sembrar() {
  const conexion = await pool.getConnection();
  try {
    const [[{ total }]] = await conexion.query("SELECT COUNT(*) AS total FROM vuelos");
    if (total === 0) {
      for (const v of VUELOS) {
        await conexion.query(
          `INSERT INTO vuelos
            (codigo, aerolinea, origen, destino, tipo, puerta, hora, estado, precio,
             asientos_totales_economica, asientos_disponibles_economica,
             asientos_totales_ejecutiva, asientos_disponibles_ejecutiva)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.codigo, v.aerolinea, v.origen, v.destino, v.tipo, v.puerta, v.hora, v.estado, v.precio,
           v.economica, v.economica, v.ejecutiva, v.ejecutiva]
        );
      }
      console.log(`✔ ${VUELOS.length} vuelos insertados.`);
    } else {
      console.log("↷ La tabla vuelos ya tiene datos, no se insertó nada.");
    }

    const [usuarios] = await conexion.query("SELECT id FROM usuarios WHERE correo = ?", [USUARIO_PRUEBA.correo]);
    if (usuarios.length === 0) {
      const claveHash = await bcrypt.hash(USUARIO_PRUEBA.clave, 10);
      await conexion.query("INSERT INTO usuarios (correo, clave_hash) VALUES (?, ?)", [USUARIO_PRUEBA.correo, claveHash]);
      console.log(`✔ Usuario de prueba creado: ${USUARIO_PRUEBA.correo} / ${USUARIO_PRUEBA.clave}`);
    } else {
      console.log("↷ El usuario de prueba ya existe.");
    }
  } finally {
    conexion.release();
    await pool.end();
  }
}

sembrar().catch((error) => {
  console.error("Error al sembrar la base de datos:", error);
  process.exit(1);
});
