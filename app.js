// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE
// ==========================================
// Reemplaza los valores con las credenciales de tu proyecto en Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "pokemas-supernova.firebaseapp.com",
    projectId: "pokemas-supernova",
    storageBucket: "pokemas-supernova.appspot.com",
    messagingSenderId: "123456789...",
    appId: "1:123456789...:web:abc123"
};

// Inicializar Firebase (si las credenciales no están configuradas, usará datos locales de prueba)
let db = null;
try {
    if (firebaseConfig.apiKey !== "TU_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        document.getElementById('estadoConexion').textContent = "Conectado a la nube";
        document.getElementById('estadoConexion').className = "text-xs bg-green-600 text-white px-2 py-1 rounded";
    } else {
        document.getElementById('estadoConexion').textContent = "Modo Local (Sin Firebase)";
        document.getElementById('estadoConexion').className = "text-xs bg-yellow-600 text-white px-2 py-1 rounded";
    }
} catch (e) {
    console.error("Error al conectar Firebase:", e);
}

// ==========================================
// 2. DATOS DE ESTADO Y CONFIGURACIÓN
// ==========================================
let jugadores = [
    "Alain", "Belphegor", "Bran", "Carlos Placencio", "Darrking", 
    "EduKatsuragi", "Epsilon", "Gupi", "Lizero", "Mikaruge", 
    "Mrtadeo", "Paquiao", "Punkthony", "Racso-DVLK", "Red 1996", 
    "Santiastiadias", "Shoko", "Wiki", "XiaotingShine", "xRomdonx"
];

const todosLosTipos = [
    "Acero", "Agua", "Bicho", "Dragón", "Eléctrico", "Fantasma", 
    "Fuego", "Hada", "Hielo", "Lucha", "Normal", "Planta", 
    "Psíquico", "Roca", "Siniestro", "Tierra", "Veneno", "Volador"
];

let compis = [];
let isEditMode = false;
const opcionesNivel = ["-", "1/5", "2/5", "3/5", "4/5", "5/5", "6/10", "7/10", "8/10", "9/10", "10/10"];

// Helper para ignorar tildes, mayúsculas y espacios sobrantes
const limpiarTexto = (txt) => txt ? txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";

// ==========================================
// 3. FUNCIONES DE SINCRONIZACIÓN Y EDICIÓN
// ==========================================
function cargarDatos() {
    if (db) {
        db.collection("compis").onSnapshot((snapshot) => {
            compis = [];
            snapshot.forEach((doc) => {
                compis.push({ id: doc.id, ...doc.data() });
            });
            compis.sort((a, b) => a.tipo.localeCompare(b.tipo));
            renderTable();
        });
    } else {
        compis = [
            { id: "1", tipo: "Hada", nombre: "Magearna - Gladio", niveles: { "Alain": "3/5", "Bran": "5/5" } },
            { id: "2", tipo: "Fuego", nombre: "Charizard - Lionel (Archi)", niveles: { "Belphegor": "1/5", "Red 1996": "5/5" } }
        ];
        renderTable();
    }
}

function actualizarNivel(compiId, jugador, nuevoNivel) {
    const compi = compis.find(c => c.id === compiId);
    if (compi) {
        compi.niveles[jugador] = nuevoNivel;
        if (db) {
            db.collection("compis").doc(compiId).update({
                [`niveles.${jugador}`]: nuevoNivel
            });
        } else {
            renderTable();
        }
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('btnEdit');
    btn.textContent = isEditMode ? "Guardar Cambios (Desactivar Edición)" : "Activar Modo Edición";
    btn.className = isEditMode 
        ? "w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 px-4 rounded shadow transition-colors" 
        : "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded shadow transition-colors";
    renderTable();
}

// ==========================================
// 4. RENDERIZADO DE TABLA Y FILTROS (REFACTORIZADO)
// ==========================================

/**
 * Inicializa las opciones de los desplegables de filtro en el panel superior.
 */
function inicializarFiltros() {
    const selectJugador = document.getElementById('filtroJugador');
    jugadores.forEach(jugador => {
        const opt = document.createElement('option');
        opt.value = jugador;
        opt.textContent = jugador;
        selectJugador.appendChild(opt);
    });

    const selectTipo = document.getElementById('filtroTipo');
    todosLosTipos.forEach(tipo => {
        const opt = document.createElement('option');
        opt.value = tipo;
        opt.textContent = tipo;
        selectTipo.appendChild(opt);
    });
}

/**
 * Construye el HTML para la fila del encabezado (<thead>).
 */
function construirEncabezadoHTML(filtroJugador) {
    let trHead = '<tr>';
    trHead += '<th class="px-3 py-4 text-center text-sm font-bold text-gray-300 w-24 border-r border-gray-600 sticky left-0 bg-gray-900 z-10">Tipo</th>';
    trHead += '<th class="px-4 py-4 text-left text-sm font-bold text-gray-300 w-64 border-r border-gray-600 sticky left-24 bg-gray-900 z-10">Compi</th>';

    const estiloClaseNombre = (filtroJugador !== "Todos") 
        ? "text-sm font-semibold text-gray-300 text-center px-2 py-2" 
        : "nombre-jugador text-sm font-semibold text-gray-300 mx-auto";

    jugadores.forEach(jugador => {
        if (filtroJugador === "Todos" || filtroJugador === jugador) {
            const claseAnchoExtra = (filtroJugador !== "Todos") ? "col-jugador-individual" : "";
            trHead += `<th class="border-r border-gray-600 ${claseAnchoExtra}"><div class="${estiloClaseNombre}">${jugador}</div></th>`;
        }
    });

    trHead += '</tr>';
    return trHead;
}

/**
 * Crea la celda agrupadora de Tipo Elemental con su icono e imagen.
 */
function crearCeldaTipo(compi, rowSpan) {
    const tipoSinTilde = compi.tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const nombreArchivo = `${tipoSinTilde.toUpperCase()}.png`;
    const rutaImagen = `assets/tipos/${nombreArchivo}`;

    let tdTipo = document.createElement('td');
    tdTipo.rowSpan = rowSpan;
    tdTipo.className = `px-2 py-2 text-sm font-bold text-center align-middle border-r border-gray-600 sticky left-0 z-0 tipo-${tipoSinTilde}`;

    tdTipo.innerHTML = `
        <div class="tipo-celda">
            <img src="${rutaImagen}" alt="${compi.tipo}" class="tipo-icono" onerror="this.style.display='none'">
            <span>${compi.tipo}</span>
        </div>
    `;

    return tdTipo;
}

/**
 * Crea la celda para el nombre del Compi.
 */
function crearCeldaNombreCompi(nombre) {
    let tdNombre = document.createElement('td');
    tdNombre.className = "px-4 py-3 text-sm text-gray-200 border-r border-gray-600 font-medium sticky left-24 bg-gray-800 z-0";
    tdNombre.textContent = nombre;
    return tdNombre;
}

/**
 * Obtiene las clases CSS de color según el nivel formateado.
 */
function obtenerClaseColorNivel(nivel) {
    const coloresNivel = {
        "1/5": "bg-emerald-950/40 text-emerald-200",
        "2/5": "bg-emerald-900/60 text-emerald-200",
        "3/5": "bg-emerald-800 text-emerald-100",
        "4/5": "bg-emerald-700 text-white font-semibold",
        "5/5": "bg-emerald-600 text-white font-bold",

        "6/10": "bg-blue-950/40 text-blue-200",
        "7/10": "bg-blue-900/60 text-blue-200",
        "8/10": "bg-blue-800 text-blue-100",
        "9/10": "bg-blue-700 text-white font-semibold",
        "10/10": "bg-blue-600 text-white font-bold"
    };

    return coloresNivel[nivel] || "text-gray-500";
}

/**
 * Crea la celda individual de nivel para un jugador (modo lectura o modo edición).
 */
function crearCeldaNivel(compi, jugador, filtroJugador) {
    let tdNivel = document.createElement('td');
    const claseAnchoCelda = (filtroJugador !== "Todos") ? "col-jugador-individual" : "min-w-[50px]";
    tdNivel.className = `px-1 py-3 text-sm text-center border-r border-gray-700 ${claseAnchoCelda}`;
    
    let nivelActual = compi.niveles[jugador] || "-";

    if (isEditMode) {
        let select = document.createElement('select');
        select.className = "border border-gray-500 p-1 rounded bg-gray-700 text-white text-xs w-full text-center outline-none";
        select.onchange = (e) => actualizarNivel(compi.id, jugador, e.target.value);
        
        opcionesNivel.forEach(opcion => {
            let opt = document.createElement('option');
            opt.value = opcion;
            opt.textContent = opcion;
            if (opcion === nivelActual) opt.selected = true;
            select.appendChild(opt);
        });
        tdNivel.appendChild(select);
    } else {
        const claseColor = obtenerClaseColorNivel(nivelActual);
        tdNivel.className += ` ${claseColor}`;
        tdNivel.textContent = nivelActual;
    }

    return tdNivel;
}

/**
 * Función principal que coordina el renderizado completo de la tabla.
 */
function renderTable() {
    const filtroJugador = document.getElementById('filtroJugador').value;
    const filtroTipo = document.getElementById('filtroTipo').value;

    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');
    const tablaElement = document.querySelector('table');
    
    // Ajuste de ancho de tabla
    if (filtroJugador !== "Todos") {
        tablaElement.classList.remove('w-full', 'min-w-full');
        tablaElement.classList.add('w-auto');
    } else {
        tablaElement.classList.remove('w-auto');
        tablaElement.classList.add('min-w-full');
    }

    // 1. Generar Encabezado
    thead.innerHTML = construirEncabezadoHTML(filtroJugador);

    // 2. Filtrar lista de compis
    const compisFiltrados = compis.filter(c => {
        if (filtroTipo === "Todos") return true;
        return limpiarTexto(c.tipo) === limpiarTexto(filtroTipo);
    });

    // 3. Generar Cuerpo de la Tabla
    tbody.innerHTML = '';
    let currentTipo = "";

    compisFiltrados.forEach((compi) => {
        let tr = document.createElement('tr');
        tr.className = "border-b border-gray-700 cell-hover";

        // Agregar celda de Tipo si es el primero del grupo
        if (limpiarTexto(compi.tipo) !== limpiarTexto(currentTipo)) {
            currentTipo = compi.tipo;
            const tipoRowSpan = compisFiltrados.filter(c => limpiarTexto(c.tipo) === limpiarTexto(currentTipo)).length;
            tr.appendChild(crearCeldaTipo(compi, tipoRowSpan));
        }

        // Agregar celda de Nombre
        tr.appendChild(crearCeldaNombreCompi(compi.nombre));

        // Agregar celdas de Jugadores
        jugadores.forEach(jugador => {
            if (filtroJugador === "Todos" || filtroJugador === jugador) {
                tr.appendChild(crearCeldaNivel(compi, jugador, filtroJugador));
            }
        });

        tbody.appendChild(tr);
    });
}
// ==========================================
// 5. GESTIÓN DE MODALES E INTERFAZ
// ==========================================
let accionActualJugador = 'agregar';
let accionActualCompi = 'agregar';

function abrirModalJugador(accion) {
    accionActualJugador = accion;
    const modal = document.getElementById('modalJugador');
    const titulo = document.getElementById('modalJugadorTitulo');
    const campoNombre = document.getElementById('campoNombreJugador');
    const campoSelect = document.getElementById('campoSelectJugador');
    const inputNombre = document.getElementById('inputNombreJugador');
    const selectJugador = document.getElementById('selectEliminarJugador');
    const btn = document.getElementById('btnConfirmarJugador');

    inputNombre.value = "";
    modal.classList.remove('hidden');

    if (accion === 'agregar') {
        titulo.textContent = "Agregar Nuevo Jugador";
        campoNombre.classList.remove('hidden');
        campoSelect.classList.add('hidden');
        btn.textContent = "Agregar";
        btn.className = "px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition";
    } else {
        titulo.textContent = "Eliminar Jugador";
        campoNombre.classList.add('hidden');
        campoSelect.classList.remove('hidden');
        btn.textContent = "Eliminar";
        btn.className = "px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition";

        selectJugador.innerHTML = "";
        jugadores.forEach(j => {
            const opt = document.createElement('option');
            opt.value = j;
            opt.textContent = j;
            selectJugador.appendChild(opt);
        });
    }
}

function procesarJugador() {
    if (accionActualJugador === 'agregar') {
        const nombre = document.getElementById('inputNombreJugador').value.trim();
        if (nombre && !jugadores.includes(nombre)) {
            jugadores.push(nombre);
            actualizarSelectFiltroJugadores();
            renderTable();
        }
    } else {
        const nombre = document.getElementById('selectEliminarJugador').value;
        if (nombre && jugadores.includes(nombre)) {
            jugadores = jugadores.filter(j => j !== nombre);
            actualizarSelectFiltroJugadores();
            renderTable();
        }
    }
    cerrarModales();
}

function abrirModalCompi(accion) {
    accionActualCompi = accion;
    const modal = document.getElementById('modalCompi');
    const titulo = document.getElementById('modalCompiTitulo');
    const camposAgregar = document.getElementById('camposAgregarCompi');
    const camposQuitar = document.getElementById('camposQuitarCompi');
    const selectTipo = document.getElementById('selectTipoCompi');
    const inputNombre = document.getElementById('inputNombreCompi');
    const selectEliminar = document.getElementById('selectEliminarCompi');
    const btn = document.getElementById('btnConfirmarCompi');

    inputNombre.value = "";
    modal.classList.remove('hidden');

    selectTipo.innerHTML = "";
    todosLosTipos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        selectTipo.appendChild(opt);
    });

    if (accion === 'agregar') {
        titulo.textContent = "Agregar Nuevo Compi";
        camposAgregar.classList.remove('hidden');
        camposQuitar.classList.add('hidden');
        btn.textContent = "Agregar";
        btn.className = "px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition";
    } else {
        titulo.textContent = "Eliminar Compi";
        camposAgregar.classList.add('hidden');
        camposQuitar.classList.remove('hidden');
        btn.textContent = "Eliminar";
        btn.className = "px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition";

        selectEliminar.innerHTML = "";
        compis.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `[${c.tipo}] ${c.nombre}`;
            selectEliminar.appendChild(opt);
        });
    }
}

function procesarCompi() {
    if (accionActualCompi === 'agregar') {
        const tipo = document.getElementById('selectTipoCompi').value;
        const nombre = document.getElementById('inputNombreCompi').value.trim();

        if (tipo && nombre) {
            const nuevoCompi = { tipo: tipo, nombre: nombre, niveles: {} };
            if (db) {
                db.collection("compis").add(nuevoCompi);
            } else {
                nuevoCompi.id = Date.now().toString();
                compis.push(nuevoCompi);
                compis.sort((a, b) => a.tipo.localeCompare(b.tipo));
                renderTable();
            }
        }
    } else {
        const compiId = document.getElementById('selectEliminarCompi').value;
        if (compiId) {
            if (db) {
                db.collection("compis").doc(compiId).delete();
            } else {
                compis = compis.filter(c => c.id !== compiId);
                renderTable();
            }
        }
    }
    cerrarModales();
}

function cerrarModales() {
    document.getElementById('modalJugador').classList.add('hidden');
    document.getElementById('modalCompi').classList.add('hidden');
}

function actualizarSelectFiltroJugadores() {
    const select = document.getElementById('filtroJugador');
    const valorSeleccionado = select.value;
    select.innerHTML = '<option value="Todos">Todos los jugadores</option>';
    jugadores.forEach(j => {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = j;
        select.appendChild(opt);
    });
    select.value = jugadores.includes(valorSeleccionado) ? valorSeleccionado : "Todos";
}

// Inicialización
inicializarFiltros();
cargarDatos();