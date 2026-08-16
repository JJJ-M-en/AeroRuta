-- =====================================================
-- AeroRuta — esquema de base de datos (MySQL) v2
-- Incluye: usuarios, vuelos con asientos por clase
-- (económica/ejecutiva), reservas con estado, y una tabla
-- de tokens revocados para poder cerrar sesión con JWT.
--
-- Ejecutar en phpMyAdmin (pestaña SQL) o con:
--   mysql -u root -p < db/schema.sql
-- =====================================================

CREATE DATABASE IF NOT EXISTS aeroruta
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE aeroruta;

-- ---------- Usuarios ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  correo     VARCHAR(150) NOT NULL UNIQUE,
  clave_hash VARCHAR(255) NOT NULL,
  creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Vuelos (módulo "productos") ----------
-- Los asientos se controlan por separado en cada clase, para poder
-- descontar/liberar cupos al reservar o cancelar.
CREATE TABLE IF NOT EXISTS vuelos (
  id                              INT AUTO_INCREMENT PRIMARY KEY,
  codigo                          VARCHAR(10)  NOT NULL UNIQUE,
  aerolinea                       VARCHAR(60)  NOT NULL DEFAULT 'AeroRuta',
  origen                          VARCHAR(100) NOT NULL,
  destino                         VARCHAR(100) NOT NULL,
  tipo                            ENUM('nacional', 'internacional') NOT NULL,
  puerta                          VARCHAR(10),
  hora                            VARCHAR(10),
  estado                          ENUM('atiempo', 'embarcando', 'retrasado') NOT NULL DEFAULT 'atiempo',
  precio                          INT NOT NULL,
  asientos_totales_economica      INT NOT NULL DEFAULT 20,
  asientos_disponibles_economica  INT NOT NULL DEFAULT 20,
  asientos_totales_ejecutiva      INT NOT NULL DEFAULT 6,
  asientos_disponibles_ejecutiva  INT NOT NULL DEFAULT 6
);

-- ---------- Reservas (módulo "servicios") ----------
-- Ahora ligadas a un usuario real (usuario_id, vía JWT) en vez de
-- un identificador de navegador. "Estado" permite cancelar sin
-- borrar el historial.
CREATE TABLE IF NOT EXISTS reservas (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id          INT NOT NULL,
  vuelo_id            INT NOT NULL,
  clase               ENUM('economica', 'ejecutiva') NOT NULL DEFAULT 'economica',
  asiento             VARCHAR(10),
  estado              ENUM('activa', 'cancelada') NOT NULL DEFAULT 'activa',
  nombre_pasajero     VARCHAR(150) NOT NULL,
  fecha_viaje         DATE NOT NULL,
  cantidad_pasajeros  INT NOT NULL DEFAULT 1,
  creado_en           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (vuelo_id)   REFERENCES vuelos(id)   ON DELETE CASCADE
);

-- ---------- Tokens revocados ----------
-- Con JWT no hay sesión guardada en el servidor; para que "cerrar
-- sesión" (DELETE) tenga un efecto real, se guarda aquí el token
-- hasta que expire por su cuenta.
CREATE TABLE IF NOT EXISTS tokens_revocados (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  token       VARCHAR(500) NOT NULL UNIQUE,
  revocado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
