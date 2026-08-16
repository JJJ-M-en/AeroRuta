// Modelo Usuario — encapsula el acceso a datos de la tabla `usuarios`.
// Cada instancia representa un usuario; los métodos estáticos
// funcionan como "repositorio" para consultar/crear/actualizar/borrar.
const bcrypt = require("bcryptjs");
const pool = require("../db/connection");

class Usuario {
  constructor({ id, correo, clave_hash, creado_en }) {
    this.id = id;
    this.correo = correo;
    this.claveHash = clave_hash;
    this.creadoEn = creado_en;
  }

  // Representación segura para enviar por la API (nunca expone el hash)
  paraJSON() {
    return { id: this.id, correo: this.correo, creadoEn: this.creadoEn };
  }

  async verificarClave(claveTexto) {
    return bcrypt.compare(claveTexto, this.claveHash);
  }

  // Hash "señuelo" para comparar contra él cuando el usuario no existe,
  // así el tiempo de respuesta no revela si un correo está registrado.
  static async verificarClaveContraSeñuelo(claveTexto) {
    return bcrypt.compare(claveTexto, "$2a$10$abcdefghijklmnopqrstuv");
  }

  static async listar() {
    const [filas] = await pool.query("SELECT * FROM usuarios ORDER BY id DESC");
    return filas.map((fila) => new Usuario(fila));
  }

  static async obtenerPorId(id) {
    const [filas] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [id]);
    return filas.length ? new Usuario(filas[0]) : null;
  }

  static async obtenerPorCorreo(correo) {
    const [filas] = await pool.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    return filas.length ? new Usuario(filas[0]) : null;
  }

  static async crear({ correo, clave }) {
    const claveHash = await bcrypt.hash(clave, 10);
    const [resultado] = await pool.query(
      "INSERT INTO usuarios (correo, clave_hash) VALUES (?, ?)",
      [correo, claveHash]
    );
    return Usuario.obtenerPorId(resultado.insertId);
  }

  static async actualizar(id, { correo, clave }) {
    if (correo) {
      await pool.query("UPDATE usuarios SET correo = ? WHERE id = ?", [correo, id]);
    }
    if (clave) {
      const claveHash = await bcrypt.hash(clave, 10);
      await pool.query("UPDATE usuarios SET clave_hash = ? WHERE id = ?", [claveHash, id]);
    }
    return Usuario.obtenerPorId(id);
  }

  static async eliminar(id) {
    const [resultado] = await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
    return resultado.affectedRows > 0;
  }
}

module.exports = Usuario;
