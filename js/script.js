/* =====================================================
   AeroRuta — script.js
   Lógica compartida por las tres pantallas del proyecto.
   Consume la API REST (carpeta api/): autenticación (JWT),
   usuarios, productos (vuelos) y servicios (reservas).
   ===================================================== */

// Cambia esta URL si publicas la API en otro servidor.
const API_BASE_URL = "https://aeroruta-production.up.railway.app/api";

const ESTADO_TEXTO = {
  atiempo: "A tiempo",
  embarcando: "Embarcando",
  retrasado: "Retrasado",
};

const CLASE_TEXTO = { economica: "Económica", ejecutiva: "Ejecutiva" };

// Claves usadas en Local Storage del navegador (preferencias locales,
// no reemplazan la base de datos: el token es lo que da acceso real).
const LS_KEYS = {
  correo: "aeroruta_correo",
  token: "aeroruta_token",
};

document.addEventListener("DOMContentLoaded", () => {
  marcarEnlaceActivo();
  actualizarNavSesion();
  inicializarTableroSalidas();
  inicializarBuscadorInicio();
  inicializarLogin();
  inicializarRegistro();
  inicializarVuelos();
});

/* =====================================================
   Utilidades generales
   ===================================================== */

function marcarEnlaceActivo() {
  const pagina = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navbar-aero .nav-link").forEach((enlace) => {
    const href = enlace.getAttribute("href");
    enlace.classList.toggle("active", href === pagina);
  });
}

/** Muestra "Iniciar sesión" o "Cerrar sesión" en el navbar según si
 *  hay un token guardado, y conecta el botón de cerrar sesión. */
function actualizarNavSesion() {
  const itemLogin = document.getElementById("itemLogin");
  const itemLogout = document.getElementById("itemLogout");
  const botonCerrar = document.getElementById("btnCerrarSesion");
  if (!itemLogin || !itemLogout) return;

  const haySesion = Boolean(localStorage.getItem(LS_KEYS.token));
  itemLogin.classList.toggle("d-none", haySesion);
  itemLogout.classList.toggle("d-none", !haySesion);

  botonCerrar?.addEventListener("click", async () => {
    try {
      await apiFetch("/autenticacion/sesion", { method: "DELETE", auth: true });
    } catch {
      // Si falla la llamada igual limpiamos la sesión local.
    }
    localStorage.removeItem(LS_KEYS.token);
    window.location.href = "index.html";
  });
}

/** Envoltorio sobre fetch: arma la URL con la API base, agrega el
 *  token si se pide (auth: true), convierte a JSON y lanza un error
 *  legible si la respuesta falla. */
async function apiFetch(ruta, opciones = {}) {
  const encabezados = { "Content-Type": "application/json" };
  if (opciones.auth) {
    const token = localStorage.getItem(LS_KEYS.token);
    if (token) encabezados["Authorization"] = Bearer ${token};
  }

  const respuesta = await fetch(${API_BASE_URL}${ruta}, {
    ...opciones,
    headers: { ...encabezados, ...(opciones.headers || {}) },
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "Ocurrió un error al conectar con la API.");
  }
  return datos;
}

/* =====================================================
   Pantalla: Inicio — tablero de salidas (GET /productos)
   ===================================================== */
async function inicializarTableroSalidas() {
  const tablero = document.getElementById("flapBoard");
  if (!tablero) return;

  try {
    const vuelos = await apiFetch("/productos");
    vuelos.slice(0, 6).forEach((vuelo, indice) => {
      const fila = document.createElement("div");
      fila.className = "flap-row";
      fila.style.animationDelay = ${indice * 0.08}s;
      fila.innerHTML = `
        <span>${vuelo.codigo}</span>
        <span>${vuelo.destino}</span>
        <span>${vuelo.puerta}</span>
        <span>${vuelo.hora}</span>
        <span class="estado estado-${vuelo.estado}">${ESTADO_TEXTO[vuelo.estado]}</span>
      `;
      tablero.appendChild(fila);
    });
  } catch (error) {
    tablero.innerHTML = <p class="flap-row" style="opacity:1;">No se pudo conectar con la API (${error.message}). Verifica que el servidor esté corriendo en ${API_BASE_URL}.</p>;
  }
}

/* =====================================================
   Pantalla: Inicio — llena Origen/Destino con ciudades reales
   ===================================================== */
async function inicializarBuscadorInicio() {
  const selectOrigen = document.getElementById("origen");
  const selectDestino = document.getElementById("destino");
  if (!selectOrigen || !selectDestino) return;

  try {
    const vuelos = await apiFetch("/productos");
    const origenes = [...new Set(vuelos.map((v) => v.origen))].sort();
    const destinos = [...new Set(vuelos.map((v) => v.destino))].sort();

    origenes.forEach((ciudad) => {
      const opcion = document.createElement("option");
      opcion.value = ciudad;
      opcion.textContent = ciudad;
      selectOrigen.appendChild(opcion);
    });

    destinos.forEach((ciudad) => {
      const opcion = document.createElement("option");
      opcion.value = ciudad;
      opcion.textContent = ciudad;
      selectDestino.appendChild(opcion);
    });
  } catch (error) {
    console.error("No se pudieron cargar las ciudades:", error.message);
  }
}

/* =====================================================
   Pantalla: Iniciar sesión — POST /autenticacion/login
   ===================================================== */
function inicializarLogin() {
  const formulario = document.getElementById("formLogin");
  if (!formulario) return;

  const campoCorreo = document.getElementById("correo");
  const campoClave = document.getElementById("clave");
  const checkRecordar = document.getElementById("recordar");
  const estado = document.getElementById("loginStatus");
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const correoGuardado = localStorage.getItem(LS_KEYS.correo);
  if (correoGuardado) {
    campoCorreo.value = correoGuardado;
    checkRecordar.checked = true;
  }

  function mostrarEstado(mensaje, tipo) {
    estado.textContent = mensaje;
    estado.classList.remove("alert-success", "alert-danger", "ok", "error");
    estado.classList.add(tipo === "ok" ? "alert-success" : "alert-danger", tipo, "show");
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    let esValido = true;

    if (campoCorreo.value.trim() === "" || !regexCorreo.test(campoCorreo.value.trim())) {
      campoCorreo.classList.add("is-invalid-aero");
      esValido = false;
    } else {
      campoCorreo.classList.remove("is-invalid-aero");
    }

    if (campoClave.value.trim() === "" || campoClave.value.trim().length < 8) {
      campoClave.classList.add("is-invalid-aero");
      esValido = false;
    } else {
      campoClave.classList.remove("is-invalid-aero");
    }

    if (!esValido) {
      mostrarEstado("Revisa los campos marcados antes de continuar.", "error");
      return;
    }

    try {
      const respuesta = await apiFetch("/autenticacion/login", {
        method: "POST",
        body: JSON.stringify({ correo: campoCorreo.value.trim(), clave: campoClave.value.trim() }),
      });

      localStorage.setItem(LS_KEYS.token, respuesta.token);
      if (checkRecordar.checked) {
        localStorage.setItem(LS_KEYS.correo, campoCorreo.value.trim());
      } else {
        localStorage.removeItem(LS_KEYS.correo);
      }

      mostrarEstado("Inicio de sesión exitoso. Redirigiendo a tus vuelos...", "ok");
      setTimeout(() => { window.location.href = "vuelos.html"; }, 900);
    } catch (error) {
      mostrarEstado(error.message, "error");
    }
  });

  [campoCorreo, campoClave].forEach((campo) => {
    campo.addEventListener("input", () => campo.classList.remove("is-invalid-aero"));
  });
}

/* =====================================================
   Pantalla: Crear cuenta — POST /autenticacion/registro
   ===================================================== */
function inicializarRegistro() {
  const formulario = document.getElementById("formRegistro");
  if (!formulario) return;

  const campoCorreo = document.getElementById("correo");
  const campoClave = document.getElementById("clave");
  const campoClaveConfirmar = document.getElementById("claveConfirmar");
  const estado = document.getElementById("registroStatus");
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function mostrarEstado(mensaje, tipo) {
    estado.textContent = mensaje;
    estado.classList.remove("alert-success", "alert-danger", "ok", "error");
    estado.classList.add(tipo === "ok" ? "alert-success" : "alert-danger", tipo, "show");
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    let esValido = true;

    if (campoCorreo.value.trim() === "" || !regexCorreo.test(campoCorreo.value.trim())) {
      campoCorreo.classList.add("is-invalid-aero");
      esValido = false;
    } else {
      campoCorreo.classList.remove("is-invalid-aero");
    }

    if (campoClave.value.trim() === "" || campoClave.value.trim().length < 8) {
      campoClave.classList.add("is-invalid-aero");
      esValido = false;
    } else {
      campoClave.classList.remove("is-invalid-aero");
    }

    if (campoClaveConfirmar.value.trim() !== campoClave.value.trim()) {
      campoClaveConfirmar.classList.add("is-invalid-aero");
      esValido = false;
    } else {
      campoClaveConfirmar.classList.remove("is-invalid-aero");
    }

    if (!esValido) {
      mostrarEstado("Revisa los campos marcados antes de continuar.", "error");
      return;
    }

    try {
      const respuesta = await apiFetch("/autenticacion/registro", {
        method: "POST",
        body: JSON.stringify({ correo: campoCorreo.value.trim(), clave: campoClave.value.trim() }),
      });

      localStorage.setItem(LS_KEYS.token, respuesta.token);
      mostrarEstado("Cuenta creada con éxito. Redirigiendo a tus vuelos...", "ok");
      setTimeout(() => { window.location.href = "vuelos.html"; }, 900);
    } catch (error) {
      mostrarEstado(error.message, "error");
    }
  });

  [campoCorreo, campoClave, campoClaveConfirmar].forEach((campo) => {
    campo.addEventListener("input", () => campo.classList.remove("is-invalid-aero"));
  });
}

/* =====================================================
   Pantalla: Vuelos — GET /productos, GET/POST/PUT/DELETE /servicios
   ===================================================== */
function inicializarVuelos() {
  const lista = document.getElementById("listaVuelos");
  if (!lista) return;

  const sinResultados = document.getElementById("sinResultados");
  const botonesFiltro = document.querySelectorAll(".filtro-btn");
  const campoBusqueda = document.getElementById("buscarDestino");
  const botonOrdenar = document.getElementById("btnOrdenar");
  const contenedorAlertas = document.getElementById("alertaContainer");
  const insigniaReservas = document.getElementById("reservasBadge");
  const modalReservasEl = document.getElementById("modalReservas");
  const modalReservarEl = document.getElementById("modalReservar");
  const modalReservas = new bootstrap.Modal(modalReservasEl);
  const modalReservar = new bootstrap.Modal(modalReservarEl);

  let filtroActivo = "todos";
  let filtroOrigen = "";
  let textoBusqueda = "";
  let ordenAscendente = true;
  let vuelosActuales = [];
  let vueloSeleccionadoId = null;

  function haySesion() {
    return Boolean(localStorage.getItem(LS_KEYS.token));
  }

  function mostrarAlerta(mensaje, tipo, autocerrar = true) {
    const alerta = document.createElement("div");
    alerta.className = alert alert-${tipo} alert-dismissible fade show;
    alerta.setAttribute("role", "alert");
    alerta.innerHTML = ${mensaje}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>;
    contenedorAlertas.prepend(alerta);
    if (autocerrar) {
      setTimeout(() => bootstrap.Alert.getOrCreateInstance(alerta).close(), 5000);
    }
  }

  function exigirSesion() {
    if (haySesion()) return true;
    mostrarAlerta('Debes <a href="login.html">iniciar sesión</a> para reservar o ver tus reservas.', "warning", false);
    return false;
  }

  async function actualizarInsigniaReservas() {
    if (!haySesion()) {
      insigniaReservas.textContent = "Inicia sesión para reservar";
      return;
    }
    try {
      const reservas = await apiFetch("/servicios?estado=activas", { auth: true });
      const total = reservas.length;
      insigniaReservas.textContent = ${total} reserva${total === 1 ? "" : "s"} activa${total === 1 ? "" : "s"};
    } catch {
      insigniaReservas.textContent = "Reservas no disponibles";
    }
  }

  /* ---------- Búsqueda que llega desde Inicio ---------- */
  function aplicarBusquedaDesdeURL() {
    const parametros = new URLSearchParams(window.location.search);
    const destino = parametros.get("destino");
    const origen = parametros.get("origen");
    const fecha = parametros.get("fecha");
    if (!destino && !origen) return;

    if (destino) {
      const ciudad = destino.split(" (")[0];
      campoBusqueda.value = ciudad;
      textoBusqueda = ciudad;
    }
    if (origen) {
      filtroOrigen = origen.split(" (")[0];
    }

    const partes = [];
    if (origen) partes.push(desde ${origen});
    if (destino) partes.push(hacia ${destino});
    if (fecha) partes.push(el ${fecha});
    mostrarAlerta(Mostrando vuelos ${partes.join(" ")}. La fecha se usará al confirmar tu reserva., "info", false);

    // Prellena la fecha de viaje del checkout con la que buscaron en Inicio
    if (fecha) document.getElementById("pasajeroFecha").value = fecha;
  }

  /* ---------- Listado principal de vuelos ---------- */
  async function render() {
    const parametros = new URLSearchParams();
    if (filtroActivo !== "todos") parametros.set("tipo", filtroActivo);
    if (textoBusqueda) parametros.set("destino", textoBusqueda);
    if (filtroOrigen) parametros.set("origen", filtroOrigen);
    parametros.set("orden", ordenAscendente ? "asc" : "desc");

    lista.innerHTML = <p class="vuelo-detalle">Cargando vuelos...</p>;

    try {
      vuelosActuales = await apiFetch(/productos?${parametros.toString()});
    } catch (error) {
      lista.innerHTML = "";
      mostrarAlerta(No se pudo conectar con la API: ${error.message}. Verifica que el servidor esté corriendo en ${API_BASE_URL}., "danger", false);
      sinResultados.classList.remove("show");
      return;
    }

    lista.innerHTML = "";
    sinResultados.classList.toggle("show", vuelosActuales.length === 0);

    vuelosActuales.forEach((vuelo) => {
      const totalDisponible = vuelo.asientos.economica.disponibles + vuelo.asientos.ejecutiva.disponibles;
      const tarjeta = document.createElement("article");
      tarjeta.className = "vuelo-card d-flex flex-wrap justify-content-between align-items-center gap-3";
      tarjeta.innerHTML = `
        <div>
          <p class="vuelo-ruta mb-1"><span class="codigo">${vuelo.codigo}</span> · ${vuelo.origen} → ${vuelo.destino}</p>
          <p class="vuelo-detalle mb-0">Puerta ${vuelo.puerta} · Salida ${vuelo.hora} ·
            <span class="estado estado-${vuelo.estado}">${ESTADO_TEXTO[vuelo.estado]}</span>
            · ${totalDisponible} cupo(s) disponibles
          </p>
        </div>
        <div class="d-flex align-items-center gap-3">
          <p class="vuelo-precio mb-0">$${Number(vuelo.precio).toLocaleString("es-CO")}<small>por trayecto</small></p>
          <button class="btn btn-amber" type="button" data-id="${vuelo.id}" ${totalDisponible === 0 ? "disabled" : ""}>
            ${totalDisponible === 0 ? "Sin cupo" : "Reservar"}
          </button>
        </div>
      `;
      lista.appendChild(tarjeta);
    });
  }

  /* ---------- Abrir el checkout de reserva ---------- */
  lista.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-id]");
    if (!boton) return;
    if (!exigirSesion()) return;

    const vuelo = vuelosActuales.find((v) => String(v.id) === String(boton.dataset.id));
    if (!vuelo) return;

    vueloSeleccionadoId = vuelo.id;
    document.getElementById("resumenVuelo").innerHTML =
      <span class="codigo">${vuelo.codigo}</span> · ${vuelo.origen} → ${vuelo.destino} · $${Number(vuelo.precio).toLocaleString("es-CO")} por pasajero;
    modalReservar.show();
  });

  /* ---------- Confirmar la reserva (checkout) ---------- */
  document.getElementById("formReservar").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const nombrePasajero = document.getElementById("pasajeroNombre").value.trim();
    const fechaViaje = document.getElementById("pasajeroFecha").value;
    const cantidadPasajeros = Number(document.getElementById("pasajeroCantidad").value);
    const clase = document.querySelector('input[name="claseReserva"]:checked').value;

    try {
      const reserva = await apiFetch("/servicios", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ vueloId: vueloSeleccionadoId, clase, nombrePasajero, fechaViaje, cantidadPasajeros }),
      });

      modalReservar.hide();
      document.getElementById("formReservar").reset();
      await actualizarInsigniaReservas();
      await render(); // refresca los cupos disponibles en las tarjetas
      mostrarAlerta(
        Reserva confirmada para <strong>${nombrePasajero}</strong> — vuelo ${reserva.codigoVuelo}, asiento ${reserva.asiento} (${CLASE_TEXTO[reserva.clase]}).,
        "success"
      );
    } catch (error) {
      mostrarAlerta(No se pudo reservar: ${error.message}, "danger");
    }
  });

  /* ---------- Modal: Mis reservas ---------- */
  async function renderModalReservas() {
    const listaReservas = document.getElementById("listaReservas");
    const sinReservas = document.getElementById("sinReservas");

    try {
      const reservas = await apiFetch("/servicios?estado=activas", { auth: true });
      listaReservas.innerHTML = "";
      sinReservas.classList.toggle("show", reservas.length === 0);

      reservas.forEach((reserva) => {
        const item = document.createElement("li");
        item.innerHTML = `
          <span>
            <span class="codigo-reserva">${reserva.codigoVuelo}</span> · ${reserva.destinoVuelo}<br>
            <span class="fecha-reserva">${reserva.nombrePasajero} · ${reserva.cantidadPasajeros} pasajero(s) · ${CLASE_TEXTO[reserva.clase]} · viaja ${reserva.fechaViaje}</span>
          </span>
          <button type="button" class="btn btn-sm btn-outline-aero" data-cancelar="${reserva.id}">Cancelar</button>
        `;
        listaReservas.appendChild(item);
      });
    } catch (error) {
      listaReservas.innerHTML = <li>No se pudo cargar el historial: ${error.message}</li>;
    }
  }

  document.getElementById("listaReservas").addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-cancelar]");
    if (!boton) return;
    try {
      await apiFetch(/servicios/${boton.dataset.cancelar}, { method: "DELETE", auth: true });
      await actualizarInsigniaReservas();
      await renderModalReservas();
      await render();
    } catch (error) {
      mostrarAlerta(No se pudo cancelar la reserva: ${error.message}, "danger");
    }
  });

  insigniaReservas.addEventListener("click", () => {
    if (!exigirSesion()) return;
    modalReservas.show();
  });
  modalReservasEl.addEventListener("show.bs.modal", renderModalReservas);

  document.getElementById("btnVaciarReservas").addEventListener("click", async () => {
    try {
      await apiFetch("/servicios", { method: "DELETE", auth: true });
      await actualizarInsigniaReservas();
      await renderModalReservas();
      await render();
    } catch (error) {
      mostrarAlerta(No se pudieron cancelar las reservas: ${error.message}, "danger");
    }
  });

  /* ---------- Filtros, búsqueda y orden ---------- */
  botonesFiltro.forEach((boton) => {
    boton.addEventListener("click", () => {
      botonesFiltro.forEach((b) => b.classList.remove("active"));
      boton.classList.add("active");
      filtroActivo = boton.dataset.filtro;
      render();
    });
  });

  let temporizadorBusqueda;
  campoBusqueda.addEventListener("input", (evento) => {
    textoBusqueda = evento.target.value;
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(render, 300);
  });

  botonOrdenar.addEventListener("click", () => {
    ordenAscendente = !ordenAscendente;
    botonOrdenar.textContent = ordenAscendente ? "Ordenar por precio ▲" : "Ordenar por precio ▼";
    render();
  });

  actualizarInsigniaReservas();
  aplicarBusquedaDesdeURL();
  render();
}
