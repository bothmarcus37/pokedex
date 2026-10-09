/* =========================================================
   POKÉDEX INTERACTIVA
   =========================================================
   Consumo de PokeAPI utilizando fetch().
   HTML + PHP + CSS + JavaScript
   ========================================================= */


/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const API_BASE = CONFIG.apiBase;
const LIMIT = CONFIG.porPagina;


/* =========================================================
   ESTADO DE LA APLICACIÓN
   ========================================================= */

let offset = 0;
let hayMasPokemon = true;
let tipoSeleccionado = null;
let cargando = false;

// Con un filtro activo: lista completa de Pokémon de ese tipo (nombre + url)
let listaDelTipo = [];

// Cada vez que se reinicia el listado sube este número. Así, si una
// respuesta vieja llega tarde, se descarta en lugar de mezclarse.
let turnoListado = 0;


/* =========================================================
   COLORES Y NOMBRES EN ESPAÑOL
   ========================================================= */

const COLOR_TIPO = {

    normal: "#A8A77A",
    fire: "#EE8130",
    water: "#6390F0",
    electric: "#F7D02C",
    grass: "#7AC74C",
    ice: "#96D9D6",
    fighting: "#C22E28",
    poison: "#A33EA1",
    ground: "#E2BF65",
    flying: "#A98FF3",
    psychic: "#F95587",
    bug: "#A6B91A",
    rock: "#B6A136",
    ghost: "#735797",
    dragon: "#6F35FC",
    dark: "#705746",
    steel: "#B7B7CE",
    fairy: "#D685AD"

};

// La PokeAPI entrega los tipos y las estadísticas en inglés
const NOMBRE_TIPO = {

    normal: "Normal",
    fire: "Fuego",
    water: "Agua",
    electric: "Eléctrico",
    grass: "Planta",
    ice: "Hielo",
    fighting: "Lucha",
    poison: "Veneno",
    ground: "Tierra",
    flying: "Volador",
    psychic: "Psíquico",
    bug: "Bicho",
    rock: "Roca",
    ghost: "Fantasma",
    dragon: "Dragón",
    dark: "Siniestro",
    steel: "Acero",
    fairy: "Hada"

};

const NOMBRE_ESTADISTICA = {

    "hp": "PS",
    "attack": "Ataque",
    "defense": "Defensa",
    "special-attack": "At. especial",
    "special-defense": "Def. especial",
    "speed": "Velocidad"

};

const nombreTipo = (tipo) => NOMBRE_TIPO[tipo] || tipo;


/* =========================================================
   REFERENCIAS DEL DOM
   ========================================================= */

const elTarjetas =
    document.getElementById("contenedor-tarjetas");

const elSpinner =
    document.getElementById("spinner");

const elBtnCargarMas =
    document.getElementById("btn-cargar-mas");

const elMensajeEstado =
    document.getElementById("mensaje-estado");

const elListaTipos =
    document.getElementById("lista-tipos");

const elModalOverlay =
    document.getElementById("modal-overlay");

const elBtnCerrarModal =
    document.getElementById("btn-cerrar-modal");

const elFormularioBusqueda =
    document.getElementById("form-busqueda");

const elInputBusqueda =
    document.getElementById("input-busqueda");

const elBtnLimpiar =
    document.getElementById("btn-limpiar");


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    cargarTiposDeFiltro();

    cargarSiguienteBloque();

});


/* =========================================================
   EVENTOS
   ========================================================= */

elBtnCargarMas.addEventListener(
    "click",
    cargarSiguienteBloque
);


elBtnCerrarModal.addEventListener(
    "click",
    cerrarModal
);


elModalOverlay.addEventListener(
    "click",
    (evento) => {

        if (evento.target === elModalOverlay) {

            cerrarModal();

        }

    }
);


elFormularioBusqueda.addEventListener(
    "submit",
    (evento) => {

        evento.preventDefault();

        // Acepta "Pikachu", "25", "#025" o "025"
        let termino =
            elInputBusqueda.value
                .trim()
                .toLowerCase()
                .replace(/^#/, "")
                .replace(/\s+/g, "-");

        if (/^\d+$/.test(termino)) {

            termino = String(parseInt(termino, 10));

        }

        if (!termino) {

            mostrarMensaje(
                "Escribe el nombre o número de un Pokémon."
            );

            return;
        }

        buscarPokemonPorNombreOId(termino);

    }
);


elBtnLimpiar.addEventListener(
    "click",
    () => {

        elInputBusqueda.value = "";

        tipoSeleccionado = null;

        document
            .querySelectorAll(".chip-tipo")
            .forEach((chip) => {

                chip.classList.remove("activo");

                chip.setAttribute("aria-pressed", "false");

            });

        reiniciarListado();

    }
);


/* =========================================================
   CARGAR POKÉMON
   ========================================================= */

// Devuelve el siguiente bloque de { name, url } según haya o no filtro
async function obtenerSiguienteLista() {

    /* -------------------------------------------------
       CON FILTRO: se reparte la lista del tipo
    ------------------------------------------------- */

    if (tipoSeleccionado) {

        if (offset === 0) {

            const respuesta = await fetch(
                `${API_BASE}/type/${tipoSeleccionado}`
            );

            if (!respuesta.ok) {

                throw new Error(
                    "No se pudo obtener el tipo."
                );

            }

            const datos =
                await respuesta.json();

            listaDelTipo =
                datos.pokemon.map(
                    (entrada) => entrada.pokemon
                );

        }

        return {
            lista: listaDelTipo.slice(offset, offset + LIMIT),
            hayMas: offset + LIMIT < listaDelTipo.length,
            total: listaDelTipo.length
        };

    }


    /* -------------------------------------------------
       SIN FILTRO: listado general paginado
    ------------------------------------------------- */

    const respuestaLista = await fetch(
        `${API_BASE}/pokemon?limit=${LIMIT}&offset=${offset}`
    );

    if (!respuestaLista.ok) {

        throw new Error(
            "No se pudo obtener el listado de Pokémon."
        );

    }

    const datosLista =
        await respuestaLista.json();

    return {
        lista: datosLista.results,
        hayMas: Boolean(datosLista.next),
        total: datosLista.count
    };

}


async function cargarSiguienteBloque() {

    if (cargando || !hayMasPokemon) {

        return;

    }

    const turno = turnoListado;

    mostrarCargando(true);

    try {

        mostrarMensaje(
            "Cargando Pokémon..."
        );


        /* -------------------------------------------------
           OBTENER LISTADO
        ------------------------------------------------- */

        const { lista, hayMas, total } =
            await obtenerSiguienteLista();


        /* -------------------------------------------------
           OBTENER DETALLES
           (si uno falla, se omite y los demás sí se muestran)
        ------------------------------------------------- */

        const resultados = await Promise.allSettled(

            lista.map(
                async (pokemon) => {

                    const respuesta =
                        await fetch(pokemon.url);

                    if (!respuesta.ok) {

                        throw new Error(
                            `No se pudo obtener ${pokemon.name}`
                        );

                    }

                    return await respuesta.json();

                }
            )

        );


        // Mientras llegaba la respuesta se cambió de filtro: se descarta
        if (turno !== turnoListado) {

            return;

        }


        hayMasPokemon = hayMas;

        offset += LIMIT;


        /* -------------------------------------------------
           MOSTRAR
        ------------------------------------------------- */

        resultados
            .filter((r) => r.status === "fulfilled")
            .forEach((r) => renderizarTarjeta(r.value));


        /* -------------------------------------------------
           MENSAJE
        ------------------------------------------------- */

        const mostrados =
            elTarjetas.querySelectorAll(".tarjeta").length;

        if (mostrados === 0) {

            mostrarMensaje(
                "No hay Pokémon para mostrar con este filtro."
            );

        } else if (tipoSeleccionado) {

            mostrarMensaje(
                `Tipo ${nombreTipo(tipoSeleccionado)}: ${mostrados} de ${total} Pokémon.`
            );

        } else if (!hayMasPokemon) {

            mostrarMensaje(
                "Se han cargado todos los Pokémon disponibles en la PokeAPI."
            );

        } else {

            mostrarMensaje("");

        }


        elBtnCargarMas.hidden =
            !hayMasPokemon;


    } catch (error) {

        if (turno !== turnoListado) {

            return;

        }

        console.error(
            "Error al cargar Pokémon:",
            error
        );

        mostrarMensaje(
            "No se pudo conectar con la PokeAPI. Revisa tu conexión y presiona «Cargar más Pokémon» para reintentar."
        );

    } finally {

        if (turno === turnoListado) {

            mostrarCargando(false);

        }

    }

}


/* =========================================================
   REINICIAR LISTADO
   ========================================================= */

function reiniciarListado() {

    turnoListado++;

    offset = 0;

    hayMasPokemon = true;

    listaDelTipo = [];

    // Libera el candado por si había una carga anterior en curso
    cargando = false;

    elTarjetas.innerHTML = "";

    mostrarMensaje("");

    elBtnCargarMas.hidden = false;

    cargarSiguienteBloque();

}


/* =========================================================
   CREAR TARJETA
   ========================================================= */

// Etiqueta de color de un tipo (se usa en tarjetas y en el modal)
function crearBadgeTipo(tipo) {

    const badge =
        document.createElement("span");

    badge.className = "badge-tipo";

    badge.style.background =
        COLOR_TIPO[tipo] || "#999";

    badge.textContent =
        nombreTipo(tipo);

    return badge;

}


function obtenerImagen(pokemon) {

    return (
        pokemon.sprites?.other?.["official-artwork"]?.front_default ||
        pokemon.sprites?.front_default ||
        ""
    );

}


function formatearNumero(id) {

    return `#${String(id).padStart(3, "0")}`;

}


function renderizarTarjeta(pokemon) {

    const tipoPrincipal =
        pokemon.types[0]?.type?.name || "normal";


    const tarjeta =
        document.createElement("article");

    tarjeta.className = "tarjeta";

    // Se puede abrir con el teclado (Tab + Enter)
    tarjeta.tabIndex = 0;

    tarjeta.setAttribute("role", "button");

    tarjeta.setAttribute(
        "aria-label",
        `Ver detalles de ${pokemon.name}`
    );


    /* -------------------------------------------------
       FONDO DEL COLOR DEL TIPO
    ------------------------------------------------- */

    const fondo =
        document.createElement("div");

    fondo.className = "tarjeta__fondo-tipo";

    fondo.style.background =
        COLOR_TIPO[tipoPrincipal] || "#999";


    /* -------------------------------------------------
       NÚMERO, IMAGEN Y NOMBRE
    ------------------------------------------------- */

    const numero =
        document.createElement("p");

    numero.className = "tarjeta__numero";

    numero.textContent =
        formatearNumero(pokemon.id);


    const imagen =
        document.createElement("img");

    imagen.className = "tarjeta__imagen";

    imagen.alt = "";

    imagen.loading = "lazy";

    imagen.src = obtenerImagen(pokemon);

    // Si no hay ilustración, se oculta para no mostrar el icono de imagen rota
    imagen.addEventListener(
        "error",
        () => { imagen.style.visibility = "hidden"; }
    );


    const nombre =
        document.createElement("p");

    nombre.className = "tarjeta__nombre";

    nombre.textContent = pokemon.name;


    /* -------------------------------------------------
       TIPOS
    ------------------------------------------------- */

    const tipos =
        document.createElement("div");

    tipos.className = "tarjeta__tipos";

    pokemon.types.forEach(
        (tipo) => tipos.appendChild(crearBadgeTipo(tipo.type.name))
    );


    tarjeta.append(fondo, numero, imagen, nombre, tipos);


    /* -------------------------------------------------
       ABRIR MODAL
    ------------------------------------------------- */

    tarjeta.addEventListener(
        "click",
        () => abrirModal(pokemon.id)
    );

    tarjeta.addEventListener(
        "keydown",
        (evento) => {

            if (evento.key === "Enter" || evento.key === " ") {

                evento.preventDefault();

                abrirModal(pokemon.id);

            }

        }
    );


    elTarjetas.appendChild(tarjeta);

}


/* =========================================================
   FILTROS POR TIPO
   ========================================================= */

async function cargarTiposDeFiltro() {

    try {

        const respuesta =
            await fetch(`${API_BASE}/type`);


        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron obtener los tipos."
            );

        }


        const datos =
            await respuesta.json();


        // Solo los 18 tipos de la saga principal (la API incluye otros
        // como "unknown", "shadow" o "stellar" que no tienen Pokémon)
        const tipos =
            datos.results.filter(
                (tipo) => tipo.name in COLOR_TIPO
            );


        tipos.forEach(
            (tipo) => {

                const chip =
                    document.createElement("button");


                chip.type = "button";

                chip.className = "chip-tipo";

                chip.textContent =
                    nombreTipo(tipo.name);

                chip.style.background =
                    COLOR_TIPO[tipo.name];

                chip.setAttribute("aria-pressed", "false");


                chip.addEventListener(
                    "click",
                    () => {

                        filtrarPorTipo(
                            tipo.name,
                            chip
                        );

                    }
                );


                elListaTipos.appendChild(chip);

            }
        );


    } catch (error) {

        console.error(
            "Error al cargar tipos:",
            error
        );

        document
            .getElementById("contenedor-filtros")
            .hidden = true;

    }

}


/* =========================================================
   FILTRAR POR TIPO
   =========================================================
   El filtro pide a la API todos los Pokémon de ese tipo.
   (Antes solo escondía las tarjetas ya cargadas, así que con
   los primeros 24 un tipo como Dragón salía vacío.)
   ========================================================= */

function filtrarPorTipo(tipo, chip) {

    const yaActivo =
        chip.classList.contains("activo");


    document
        .querySelectorAll(".chip-tipo")
        .forEach(
            (c) => {

                c.classList.remove("activo");

                c.setAttribute("aria-pressed", "false");

            }
        );


    if (yaActivo) {

        // Segundo clic en el mismo tipo: quita el filtro
        tipoSeleccionado = null;

    } else {

        chip.classList.add("activo");

        chip.setAttribute("aria-pressed", "true");

        tipoSeleccionado = tipo;

    }


    reiniciarListado();

}


/* =========================================================
   BÚSQUEDA
   ========================================================= */

async function buscarPokemonPorNombreOId(termino) {

    mostrarMensaje("Buscando Pokémon...");

    const encontrado =
        await abrirModal(termino);

    mostrarMensaje(
        encontrado
            ? ""
            : `No hay ningún Pokémon con el nombre o número "${termino}". Revisa cómo está escrito.`
    );

}


/* =========================================================
   MODAL
   ========================================================= */

// Abre la ficha de un Pokémon por número o nombre.
// Devuelve true si lo encontró.
async function abrirModal(idONombre) {

    elSpinner.hidden = false;


    try {

        /* -------------------------------------------------
           OBTENER DATOS DEL POKÉMON
        ------------------------------------------------- */

        const respuestaPokemon =
            await fetch(
                `${API_BASE}/pokemon/${encodeURIComponent(idONombre)}`
            );

        if (!respuestaPokemon.ok) {

            return false;

        }

        const pokemon =
            await respuestaPokemon.json();


        /* -------------------------------------------------
           OBTENER SU ESPECIE
           (se usa la dirección que da la API: en las formas
           especiales el número de especie es distinto)
        ------------------------------------------------- */

        let especie = {};

        try {

            const respuestaEspecie =
                await fetch(pokemon.species.url);

            if (respuestaEspecie.ok) {

                especie =
                    await respuestaEspecie.json();

            }

        } catch (error) {

            // Sin especie igual se muestra la ficha, solo sin descripción
            console.warn(
                "No se pudo obtener la especie:",
                error
            );

        }


        /* -------------------------------------------------
           IMAGEN
        ------------------------------------------------- */

        const elImagen =
            document.getElementById("modal-imagen");

        elImagen.src =
            obtenerImagen(pokemon);

        elImagen.alt =
            `Ilustración de ${pokemon.name}`;


        /* -------------------------------------------------
           NÚMERO Y NOMBRE
        ------------------------------------------------- */

        document
            .getElementById("modal-numero")
            .textContent =
                formatearNumero(pokemon.id);

        document
            .getElementById("modal-nombre")
            .textContent =
                pokemon.name.replace(/-/g, " ");


        /* -------------------------------------------------
           CATEGORÍA
        ------------------------------------------------- */

        const genero =
            especie.genera?.find(
                (g) => g.language.name === "es"
            ) ||
            especie.genera?.find(
                (g) => g.language.name === "en"
            );

        document
            .getElementById("modal-genero")
            .textContent =
                genero
                    ? genero.genus
                    : "";


        /* -------------------------------------------------
           TIPOS
        ------------------------------------------------- */

        const elTipos =
            document.getElementById("modal-tipos");

        elTipos.innerHTML = "";

        pokemon.types.forEach(
            (tipo) => elTipos.appendChild(crearBadgeTipo(tipo.type.name))
        );


        /* -------------------------------------------------
           DESCRIPCIÓN
        ------------------------------------------------- */

        const entradaTexto =
            especie.flavor_text_entries?.find(
                (entrada) =>
                    entrada.language.name === "es"
            ) ||
            especie.flavor_text_entries?.find(
                (entrada) =>
                    entrada.language.name === "en"
            );

        document
            .getElementById("modal-descripcion")
            .textContent =
                entradaTexto
                    ? entradaTexto.flavor_text
                        .replace(/[\n\f\r]/g, " ")
                    : "Sin descripción disponible.";


        /* -------------------------------------------------
           ALTURA, PESO, EXPERIENCIA Y TASA DE CAPTURA
        ------------------------------------------------- */

        document
            .getElementById("modal-altura")
            .textContent =
                `${(pokemon.height / 10).toFixed(1)} m`;

        document
            .getElementById("modal-peso")
            .textContent =
                `${(pokemon.weight / 10).toFixed(1)} kg`;

        document
            .getElementById("modal-experiencia")
            .textContent =
                pokemon.base_experience ?? "—";

        document
            .getElementById("modal-captura")
            .textContent =
                especie.capture_rate != null
                    ? `${especie.capture_rate}/255`
                    : "—";


        /* -------------------------------------------------
           HABILIDADES
        ------------------------------------------------- */

        const elHabilidades =
            document.getElementById("modal-habilidades");

        elHabilidades.innerHTML = "";

        pokemon.abilities.forEach(
            (habilidad) => {

                const chip =
                    document.createElement("span");

                const nombre =
                    habilidad.ability.name.replace(/-/g, " ");

                chip.className =
                    habilidad.is_hidden
                        ? "chip chip--oculta"
                        : "chip";

                chip.textContent =
                    habilidad.is_hidden
                        ? `${nombre} (oculta)`
                        : nombre;

                elHabilidades.appendChild(chip);

            }
        );


        /* -------------------------------------------------
           ESTADÍSTICAS
        ------------------------------------------------- */

        const elEstadisticas =
            document.getElementById("modal-estadisticas");

        elEstadisticas.innerHTML = "";

        pokemon.stats.forEach(
            (estadistica) => {

                // 255 es el valor más alto que existe en una estadística base
                const porcentaje =
                    Math.min(
                        100,
                        Math.round(
                            (estadistica.base_stat / 255) * 100
                        )
                    );

                const fila =
                    document.createElement("div");

                fila.className = "estadistica__fila";

                const etiqueta =
                    document.createElement("span");

                etiqueta.textContent =
                    NOMBRE_ESTADISTICA[estadistica.stat.name] ||
                    estadistica.stat.name;

                const fondo =
                    document.createElement("div");

                fondo.className = "estadistica__barra-fondo";

                const barra =
                    document.createElement("div");

                barra.className = "estadistica__barra";

                barra.style.width = `${porcentaje}%`;

                fondo.appendChild(barra);

                const valor =
                    document.createElement("span");

                valor.textContent =
                    estadistica.base_stat;

                fila.append(etiqueta, fondo, valor);

                elEstadisticas.appendChild(fila);

            }
        );


        /* -------------------------------------------------
           MOSTRAR MODAL
        ------------------------------------------------- */

        elModalOverlay.hidden = false;

        document.body.style.overflow = "hidden";

        elBtnCerrarModal.focus();

        return true;


    } catch (error) {

        console.error(
            "Error al abrir el modal:",
            error
        );

        mostrarMensaje(
            "No se pudo cargar la información del Pokémon. Revisa tu conexión."
        );

        return false;


    } finally {

        // El spinner sigue visible si el listado aún está cargando
        elSpinner.hidden = !cargando;

    }

}


/* =========================================================
   CERRAR MODAL
   ========================================================= */

function cerrarModal() {

    elModalOverlay.hidden = true;

    document.body.style.overflow = "";

}


/* =========================================================
   CERRAR MODAL CON ESC
   ========================================================= */

document.addEventListener(
    "keydown",
    (evento) => {

        if (
            evento.key === "Escape" &&
            !elModalOverlay.hidden
        ) {

            cerrarModal();

        }

    }
);


/* =========================================================
   UTILIDADES
   ========================================================= */

function mostrarCargando(mostrar) {

    cargando = mostrar;

    elSpinner.hidden = !mostrar;

    elBtnCargarMas.disabled =
        mostrar;

}


/* =========================================================
   MENSAJES
   ========================================================= */

function mostrarMensaje(mensaje) {

    elMensajeEstado.textContent =
        mensaje;

}
