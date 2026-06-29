// Estado global de la aplicación
const state = {
    isAdmin: false,
    useSandbox: false,       // Indica si estamos usando localStorage de prueba o Supabase
    whatsappPhone: '584242089153',
    personas: [],            // Personas que están actualmente mostrándose en el grid
    showingFullList: false, // Controla si se visualiza el listado completo
    searchCategory: 'all',  // Filtro de búsqueda: 'all', 'cedula', 'nombre', 'apellido'
    statusFilter: 'all',     // Filtro de estado: 'all', 'Desaparecido', 'Encontrado'
    edadFilter: 'all',       // Filtro de edad: 'all', 'child', 'teen', 'adult', 'senior'
    ordenFilter: 'recientes', // Orden: 'recientes', 'nombre_asc', 'edad_asc', 'edad_desc'
    tipoUbicacionFilter: 'all', // Tipo: 'all', 'hospital', 'refugio'
    ubicacionFilter: '',     // Filtro de ubicación: texto libre
    
    viewMode: 'grid',       // 'grid' | 'list'
    currentPage: 1,
    pageSize: 12,
    offset: 0,
    hasMore: false,
    isLoading: false
};

// Cargar número de WhatsApp alternativo si se define en config.js
if (typeof WHATSAPP_PHONE !== 'undefined') {
    state.whatsappPhone = WHATSAPP_PHONE;
}

// Elementos del DOM
const DOM = {
    cardsGrid: document.getElementById('cards-grid'),
    searchInput: document.getElementById('search-input'),
    searchBtnContainer: document.getElementById('search-btn-container'),
    btnRunSearch: document.getElementById('btn-run-search'),
    btnToggleList: document.getElementById('btn-toggle-list'),
    toggleListContainer: document.getElementById('toggle-list-container'),
    filtersBar: document.getElementById('filters-bar'),
    filterEdad: document.getElementById('filter-edad'),
    filterOrden: document.getElementById('filter-orden'),
    filterTipoUbicacion: document.getElementById('filter-tipo-ubicacion'),
    filterUbicacion: document.getElementById('filter-ubicacion'),
    btnAdminLogout: document.getElementById('btn-admin-logout'),
    adminIndicator: document.getElementById('admin-indicator'),
    adminPanel: document.getElementById('admin-panel'),
    paginationContainer: document.getElementById('pagination-container'),
    viewToggleContainer: document.getElementById('view-toggle-container'),
    btnViewGrid: document.getElementById('btn-view-grid'),
    btnViewList: document.getElementById('btn-view-list'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statMissing: document.getElementById('stat-missing'),
    statFound: document.getElementById('stat-found'),
    
    // Modal Reportar
    modalReport: document.getElementById('modal-report'),
    btnCloseReport: document.getElementById('btn-close-report'),
    btnCancelReport: document.getElementById('btn-cancel-report'),
    formReportPerson: document.getElementById('form-report-person'),
    btnSubmitReport: document.getElementById('btn-submit-report'),
    
    // Modal Login
    modalLogin: document.getElementById('modal-login'),
    btnCloseLogin: document.getElementById('btn-close-login'),
    btnCancelLogin: document.getElementById('btn-cancel-login'),
    formAdminLogin: document.getElementById('form-admin-login'),
    
    // Modal Detalles
    modalDetails: document.getElementById('modal-details'),
    btnCloseDetails: document.getElementById('btn-close-details'),
    detailsContent: document.getElementById('details-content'),
    btnShareInstagram: document.getElementById('btn-share-instagram'),
    btnShareFacebook: document.getElementById('btn-share-facebook'),
    btnShareX: document.getElementById('btn-share-x'),
    btnShareTiktok: document.getElementById('btn-share-tiktok'),
    btnReportError: document.getElementById('btn-report-error'),
    
    // Modal Estatus
    modalStatus: document.getElementById('modal-status'),
    btnCloseStatus: document.getElementById('btn-close-status'),
    btnCancelStatus: document.getElementById('btn-cancel-status'),
    formUpdateStatus: document.getElementById('form-update-status'),
    statusSelect: document.getElementById('status-select'),
    groupUbicacionEncontrado: document.getElementById('group-ubicacion-encontrado'),
    statusPersonaId: document.getElementById('status-persona-id'),
    statusNombre: document.getElementById('status-nombre'),
    statusUbicacion: document.getElementById('status-ubicacion'),
    statusEncontradoPor: document.getElementById('status-encontrado-por'),
    statusEncontradoPorCedula: document.getElementById('status-encontrado-por-cedula'),
    
    // CSV Import
    csvFile: document.getElementById('csv-file'),
    btnImportCsv: document.getElementById('btn-import-csv'),
    importProgress: document.getElementById('import-progress'),
    
    // Toasts
    toastContainer: document.getElementById('toast-container')
};

// --- UTILIDADES DE FORMATO DE CÉDULA ---
function formatCedulaNumber(value) {
    // Eliminar todo lo que no sea dígito
    const digits = value.replace(/\D/g, '');
    // Formatear con puntos: 12.345.678
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, -3) + '.' + digits.slice(-3);
    return digits.slice(0, -6) + '.' + digits.slice(-6, -3) + '.' + digits.slice(-3);
}

function getCedulaFullValue(prefixSelectId, numberInputId) {
    const prefix = document.getElementById(prefixSelectId)?.value || 'V';
    const rawNumber = document.getElementById(numberInputId)?.value || '';
    const formattedNumber = rawNumber.replace(/\D/g, '');
    // Guardar sin puntos en la base de datos pero con el formato V-12345678
    return prefix + '-' + formatCedulaNumber(formattedNumber);
}

function attachCedulaFormatter(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        const oldLen = e.target.value.length;
        e.target.value = formatCedulaNumber(e.target.value);
        const newLen = e.target.value.length;
        // Ajustar cursor después del formateo
        const newPos = cursorPos + (newLen - oldLen);
        e.target.setSelectionRange(newPos, newPos);
    });
}

// Cliente de Supabase (inicializado condicionalmente)
let supabaseClient = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Determinar si usamos base de datos de producción (Supabase) o simulación (Sandbox)
    const isConfigured = typeof window.supabase !== 'undefined' && 
                         typeof SUPABASE_URL !== 'undefined' && 
                         !SUPABASE_URL.includes('TU_PROYECTO') && 
                         typeof SUPABASE_ANON_KEY !== 'undefined' && 
                         !SUPABASE_ANON_KEY.includes('TU_LLAVE_ANON');

    if (isConfigured) {
        try {
            // Inicializar Supabase en producción
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Escuchar cambios de sesión
            supabaseClient.auth.onAuthStateChange((event, session) => {
                setAdminState(!!session);
                // Si el administrador cambia de sesión, recargamos la vista actual
                triggerSearchOrListReset();
            });
            
            // Verificar sesión inicial
            const { data: { session } } = await supabaseClient.auth.getSession();
            setAdminState(!!session);
            state.useSandbox = false;
        } catch (err) {
            console.error('Error al inicializar Supabase. Usando Sandbox local.', err);
            setupSandboxMode();
        }
    } else {
        // Inicializar en modo simulación local (Sandbox)
        setupSandboxMode();
    }
    
    // 2. Cargar Estadísticas iniciales del Dashboard
    await loadStats();
    
    // 3. Registrar Listeners de Eventos
    setupEventListeners();
});

// Configurar modo sandbox (localStorage) para permitir pruebas sin configurar Supabase
function setupSandboxMode() {
    state.useSandbox = true;
    
    // Mostrar banner flotante de demostración local
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(90deg, #2563eb, #1d4ed8);
        color: white;
        text-align: center;
        padding: 0.5rem 3rem 0.5rem 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        z-index: 2000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    banner.innerHTML = `
        🚀 Modo Demostración Local (Sandbox). Los datos se guardan en este navegador.
        Para producción, conecta tu base de datos de Supabase en <code style="background:rgba(0,0,0,0.2); padding:2px 6px; border-radius:4px;">static/js/config.js</code>.
        <button onclick="this.closest('div').remove(); document.body.style.paddingTop=''" style="position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.35); border:2px solid rgba(255,255,255,0.6); color:white; width:28px; height:28px; border-radius:6px; cursor:pointer; font-size:1rem; font-weight:700; line-height:1; display:flex; align-items:center; justify-content:center;" aria-label="Cerrar">✕</button>
    `;
    document.body.prepend(banner);
    document.body.style.paddingTop = '2.5rem';
    
    // Cargar credenciales simulación
    const sessionActive = sessionStorage.getItem('admin_session_demo') === 'active';
    setAdminState(sessionActive);
    
    // Inicializar (o actualizar) datos semilla si no existen o son los placeholders viejos
    const _existingDemo = JSON.parse(localStorage.getItem('personas_demo') || '[]');
    const _isOldDemo = _existingDemo.length === 0 || _existingDemo.some(p => p.cedula && p.cedula.startsWith('V-0000000'));
    if (_isOldDemo) {
        const now = Date.now();
        const h = 3600000;
        const seedData = [
            { id: 1,  nombre: "María Alejandra Rodríguez Pérez",   cedula: "V-12345678",  edad: 34, ultima_ubicacion: "Av. Urdaneta, La Candelaria, Caracas",              telefono_contacto: "0412-5551234", observaciones: "Vestía pantalón azul y camisa blanca. Cicatriz en mano derecha.",               estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 2).toISOString() },
            { id: 2,  nombre: "José Antonio González Herrera",      cedula: "V-8765432",   edad: 52, ultima_ubicacion: "Mercado Las Pulgas, Maracaibo",                       telefono_contacto: "0414-7772345", observaciones: "Usa gafas, cabello canoso. Padece diabetes.",                                  estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 5).toISOString() },
            { id: 3,  nombre: "Carmen Elena Blanco Suárez",         cedula: "V-20111333",  edad: 28, ultima_ubicacion: "Terminal de Pasajeros, Valencia",                    telefono_contacto: null,           observaciones: null,                                                                         estado: "Encontrado",  es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 24).toISOString(), ubicacion_encontrado: "Hospital Central de Valencia, Emergencias",    encontrado_por: "Pedro Blanco",              encontrado_por_cedula: "V-15444222" },
            { id: 4,  nombre: "Luisa Fernanda Cabrera López",       cedula: "V-25678901",  edad: 10, ultima_ubicacion: "Urb. La Isabelica, Valencia",                        telefono_contacto: "0416-3330987", observaciones: "Lleva mochila azul con dinosaurios. Cabello largo trenzado.",                 estado: "Desaparecido", es_menor: true,  foto_url: null, fecha_registro: new Date(now - h * 8).toISOString() },
            { id: 5,  nombre: "Carlos Alberto Jiménez Mora",        cedula: "V-6543210",   edad: 67, ultima_ubicacion: "Casco Central de Barquisimeto, Lara",                 telefono_contacto: "0212-5559876", observaciones: "Adulto mayor, usa bastón. Tiene marcapasos.",                                  estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 48).toISOString() },
            { id: 6,  nombre: "Valentina Beatriz Soto Fuentes",     cedula: "V-28901234",  edad: 22, ultima_ubicacion: "Universidad Central de Venezuela, Caracas",           telefono_contacto: "0424-1114567", observaciones: null,                                                                         estado: "Encontrado",  es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 12).toISOString(), ubicacion_encontrado: "Refugio Polideportivo de Chacao",              encontrado_por: "Andreína Torres",           encontrado_por_cedula: "V-24333111" },
            { id: 7,  nombre: "Rafael Andrés Hernández Castro",     cedula: "V-15678234",  edad: 45, ultima_ubicacion: "Petare Norte, Caracas",                               telefono_contacto: null,           observaciones: "Tatuaje en brazo izquierdo. Trabaja en construcción.",                      estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 6).toISOString() },
            { id: 8,  nombre: "Gabriela Isabel Romero Vargas",      cedula: "V-19234567",  edad: 15, ultima_ubicacion: "Liceo Andrés Bello, El Paraíso, Caracas",             telefono_contacto: "0412-8889012", observaciones: "Uniforme escolar, audífonos blancos.",                                       estado: "Desaparecido", es_menor: true,  foto_url: null, fecha_registro: new Date(now - h * 3).toISOString() },
            { id: 9,  nombre: "Miguel Ángel Carpio Benítez",        cedula: "E-84567890",  edad: 38, ultima_ubicacion: "Zona Industrial, San Cristóbal, Táchira",             telefono_contacto: "0276-5554321", observaciones: "Ciudadano colombiano. Trabajador metalúrgico, casco amarillo.",                estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 72).toISOString() },
            { id: 10, nombre: "Rosa Marina Delgado Espinoza",       cedula: "V-9876543",   edad: 71, ultima_ubicacion: "Barrio El Carmen, Cumaná, Sucre",                     telefono_contacto: "0416-6667890", observaciones: "Adulta mayor con Alzheimer. Posiblemente desorientada.",                     estado: "Encontrado",  es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 36).toISOString(), ubicacion_encontrado: "Hospital Antonio Patricio de Alcalá, Cumaná",  encontrado_por: "Cruz Roja Venezolana",      encontrado_por_cedula: "V-11223344" },
            { id: 11, nombre: "Alejandro José Peña Quintero",       cedula: "V-22334455",  edad: 31, ultima_ubicacion: "Av. Bolívar, Puerto La Cruz, Anzoátegui",             telefono_contacto: null,           observaciones: null,                                                                         estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 18).toISOString() },
            { id: 12, nombre: "Daniela Cristina Núñez Salazar",     cedula: "V-26789012",  edad: 26, ultima_ubicacion: "Centro Comercial Sambil, Caracas",                    telefono_contacto: "0424-2223456", observaciones: "Cabello rojo, vestido floreado. Aprox. 1.70m.",                               estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 4).toISOString() },
            { id: 13, nombre: "Fernando Luis Aguilar Reyes",        cedula: "V-17890123",  edad: 58, ultima_ubicacion: "Sector El Ujano, Mérida",                             telefono_contacto: "0274-5558901", observaciones: "Campesino. Vestía ropa de trabajo con bota de caucho.",                     estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 96).toISOString() },
            { id: 14, nombre: "Mariela Josefina Colmenares Vega",   cedula: "V-23456789",  edad: 42, ultima_ubicacion: "Boleíta Norte, Caracas",                              telefono_contacto: "0212-4443210", observaciones: "Enfermera. Posiblemente cerca del edificio colapsado.",                       estado: "Encontrado",  es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 15).toISOString(), ubicacion_encontrado: "Clínica El Ávila, Altamira, Caracas",          encontrado_por: "Bomberos Metropolitanos",    encontrado_por_cedula: "V-99887766" },
            { id: 15, nombre: "Diego Ramón Briceño Contreras",      cedula: "V-13579246",  edad: 8,  ultima_ubicacion: "Escuela Básica Simón Bolívar, El Valle, Caracas",     telefono_contacto: "0412-1116789", observaciones: "Niño. Mochila roja. Estaba en clases al momento del sismo.",                 estado: "Desaparecido", es_menor: true,  foto_url: null, fecha_registro: new Date(now - h * 1).toISOString() },
            { id: 16, nombre: "Estefanía Paola Leal Matos",         cedula: "V-29012345",  edad: 24, ultima_ubicacion: "Los Teques, Miranda",                                 telefono_contacto: "0416-9998765", observaciones: null,                                                                         estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 9).toISOString() },
            { id: 17, nombre: "Wilmer Antonio Useche Pacheco",      cedula: "V-11357924",  edad: 35, ultima_ubicacion: "Av. Intercomunal, Guarenas, Miranda",                  telefono_contacto: null,           observaciones: "Conductor de camión. Llevaba carga hacia Caracas.",                         estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 55).toISOString() },
            { id: 18, nombre: "Grecia Margarita Blanco Arteaga",    cedula: "V-24680135",  edad: 62, ultima_ubicacion: "Porlamar, Isla de Margarita, Nueva Esparta",           telefono_contacto: "0295-4445678", observaciones: "Prótesis en rodilla derecha. Necesita medicación para la tensión.",         estado: "Encontrado",  es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 40).toISOString(), ubicacion_encontrado: "Hospital Luis Ortega, Porlamar",               encontrado_por: "Defensa Civil Nueva Esparta", encontrado_por_cedula: "V-33221100" },
            { id: 19, nombre: "Freddy José Montoya Acosta",         cedula: "V-7654321",   edad: 49, ultima_ubicacion: "El Hatillo, Miranda",                                 telefono_contacto: "0424-5556789", observaciones: null,                                                                         estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 20).toISOString() },
            { id: 20, nombre: "Nathaly Carolina Dugarte Colina",    cedula: "V-27654321",  edad: 19, ultima_ubicacion: "Plaza Venezuela, Caracas",                             telefono_contacto: "0412-7773456", observaciones: "Cabello negro hasta los hombros, aretes largos dorados.",                   estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 7).toISOString() },
            { id: 21, nombre: "Roberto Carlos Figueroa Pinto",      cedula: "E-65432109",  edad: 44, ultima_ubicacion: "Sector Las Mayas, Caracas",                           telefono_contacto: null,           observaciones: "Ciudadano peruano. Trabaja en restaurante.",                                  estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 30).toISOString() },
            { id: 22, nombre: "Yurimar del Valle Aponte Medina",    cedula: "V-18765432",  edad: 39, ultima_ubicacion: "Barquisimeto, Lara",                                  telefono_contacto: "0251-3339012", observaciones: "Maestra de primaria. Posiblemente en la escuela.",                           estado: "Encontrado",  es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 22).toISOString(), ubicacion_encontrado: "Ambulatorio Dr. Luis Razetti, Barquisimeto",   encontrado_por: "Protección Civil Lara",     encontrado_por_cedula: "V-55667788" },
            { id: 23, nombre: "Ana Sofía Torres Mendoza",           cedula: "V-30123456",  edad: 17, ultima_ubicacion: "Maiquetía, La Guaira",                                telefono_contacto: "0424-8881234", observaciones: "Estaba en el aeropuerto esperando vuelo de familiar.",                      estado: "Desaparecido", es_menor: true,  foto_url: null, fecha_registro: new Date(now - h * 11).toISOString() },
            { id: 24, nombre: "Pedro Enrique Velásquez Ramos",      cedula: "V-5432109",   edad: 78, ultima_ubicacion: "San Bernardino, Caracas",                             telefono_contacto: "0212-6665432", observaciones: "Adulto mayor. Camina con dificultad. Audífono en oído derecho.",             estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 60).toISOString() },
            { id: 25, nombre: "Luis Eduardo Martínez Díaz",         cedula: "V-16543210",  edad: 33, ultima_ubicacion: "El Rosal, Chacao, Caracas",                           telefono_contacto: "0416-4447890", observaciones: null,                                                                         estado: "Encontrado",  es_menor: false, foto_url: null, fecha_registro: new Date(now - h * 16).toISOString(), ubicacion_encontrado: "Centro Médico Docente La Trinidad",            encontrado_por: "María Martínez (hermana)", encontrado_por_cedula: "V-20543210" }
        ];
        localStorage.setItem('personas_demo', JSON.stringify(seedData));
    }
}

// --- CONSULTA DE ESTADÍSTICAS ---

async function loadStats() {
    if (state.useSandbox) {
        const data = JSON.parse(localStorage.getItem('personas_demo') || '[]');
        DOM.statTotal.textContent = data.length;
        DOM.statMissing.textContent = data.filter(p => p.estado === 'Desaparecido').length;
        DOM.statFound.textContent = data.filter(p => p.estado === 'Encontrado').length;
    } else {
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/api/stats`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            if (!res.ok) throw new Error('API no disponible');
            const data = await res.json();
            
            DOM.statTotal.textContent = data.total || 0;
            DOM.statMissing.textContent = data.desaparecidos || 0;
            DOM.statFound.textContent = data.encontrados || 0;
        } catch (err) {
            console.warn('Backend API /stats no disponible, usando fallback directo:', err);
            try {
                const [
                    { count: total },
                    { count: desaparecidos },
                    { count: encontrados }
                ] = await Promise.all([
                    supabaseClient.from('personas').select('*', { count: 'exact', head: true }),
                    supabaseClient.from('personas').select('*', { count: 'exact', head: true }).eq('estado', 'Desaparecido'),
                    supabaseClient.from('personas').select('*', { count: 'exact', head: true }).eq('estado', 'Encontrado')
                ]);

                DOM.statTotal.textContent = total || 0;
                DOM.statMissing.textContent = desaparecidos || 0;
                DOM.statFound.textContent = encontrados || 0;
            } catch (fallbackErr) {
                console.error('Error en consulta directa fallback:', fallbackErr);
            }
        }
    }
}

// --- CONSULTA PAGINADA Y FILTRADA DESDE LA BASE DE DATOS ---

async function fetchRecords() {
    if (state.isLoading) return;
    state.isLoading = true;

    DOM.filtersBar.style.display = 'flex';
    DOM.cardsGrid.classList.add('is-loading');

    state.offset = (state.currentPage - 1) * state.pageSize;

    const searchQuery = DOM.searchInput.value.trim().toLowerCase();
    let fetchedData = [];
    let hasMoreRecords = false;

    try {
        if (state.useSandbox) {
            // ==========================================
            // LÓGICA LOCAL (SANDBOX - localStorage)
            // ==========================================
            let localData = JSON.parse(localStorage.getItem('personas_demo') || '[]');
            
            // A. Aplicar Búsqueda y Categorías localmente
            if (searchQuery) {
                if (state.searchCategory === 'cedula') {
                    localData = localData.filter(p => p.cedula.toLowerCase().includes(searchQuery));
                } else if (state.searchCategory === 'nombre') {
                    localData = localData.filter(p => {
                        const primerNombre = p.nombre.trim().split(/\s+/)[0].toLowerCase();
                        return primerNombre.includes(searchQuery);
                    });
                } else if (state.searchCategory === 'apellido') {
                    localData = localData.filter(p => {
                        const palabras = p.nombre.trim().split(/\s+/);
                        if (palabras.length <= 1) return false;
                        const apellidos = palabras.slice(1).join(' ').toLowerCase();
                        return apellidos.includes(searchQuery);
                    });
                } else {
                    localData = localData.filter(p => 
                        p.nombre.toLowerCase().includes(searchQuery) || 
                        p.cedula.toLowerCase().includes(searchQuery)
                    );
                }
            }

            // B. Aplicar filtro de estado localmente
            if (state.statusFilter !== 'all') {
                localData = localData.filter(p => p.estado === state.statusFilter);
            }

            // C. Aplicar filtro de edad localmente
            if (state.edadFilter !== 'all') {
                localData = localData.filter(p => {
                    if (p.edad === null || p.edad === undefined || isNaN(p.edad)) return false;
                    if (state.edadFilter === 'child') return p.edad >= 0 && p.edad <= 12;
                    if (state.edadFilter === 'teen') return p.edad >= 13 && p.edad <= 17;
                    if (state.edadFilter === 'adult') return p.edad >= 18 && p.edad <= 59;
                    if (state.edadFilter === 'senior') return p.edad >= 60;
                    return true;
                });
            }

            // D. Aplicar filtro de ubicación localmente
            if (state.ubicacionFilter) {
                const uq = state.ubicacionFilter.toLowerCase();
                localData = localData.filter(p => {
                    const u1 = (p.ultima_ubicacion || '').toLowerCase();
                    const u2 = (p.ubicacion_encontrado || '').toLowerCase();
                    return u1.includes(uq) || u2.includes(uq);
                });
            }

            // Filtrar por tipo de ubicación en memoria local
            if (state.tipoUbicacionFilter !== 'all') {
                localData = localData.filter(p => {
                    const u1 = (p.ultima_ubicacion || '').toLowerCase();
                    const u2 = (p.ubicacion_encontrado || '').toLowerCase();
                    if (state.tipoUbicacionFilter === 'hospital') {
                        return u1.includes('hospital') || u1.includes('clinica') || u2.includes('hospital') || u2.includes('clinica');
                    } else if (state.tipoUbicacionFilter === 'refugio') {
                        return u1.includes('refugio') || u1.includes('albergue') || u2.includes('refugio') || u2.includes('albergue');
                    }
                    return true;
                });
            }

            // C. Ordenar en memoria local
            localData.sort((a, b) => {
                if (state.ordenFilter === 'nombre_asc') {
                    return (a.nombre || '').localeCompare(b.nombre || '');
                } else if (state.ordenFilter === 'edad_asc') {
                    if (a.edad === null || a.edad === undefined) return 1;
                    if (b.edad === null || b.edad === undefined) return -1;
                    return a.edad - b.edad;
                } else if (state.ordenFilter === 'edad_desc') {
                    if (a.edad === null || a.edad === undefined) return 1;
                    if (b.edad === null || b.edad === undefined) return -1;
                    return b.edad - a.edad;
                } else {
                    // Por defecto: 'recientes' (Desaparecido primero, luego fecha desc)
                    if (a.estado !== b.estado) {
                        return a.estado === 'Desaparecido' ? -1 : 1;
                    }
                    return new Date(b.fecha_registro) - new Date(a.fecha_registro);
                }
            });

            // D. Paginar
            fetchedData = localData.slice(state.offset, state.offset + state.pageSize);
            hasMoreRecords = localData.length > (state.offset + fetchedData.length);

        } else {
            try {
                const params = new URLSearchParams({
                    q: searchQuery,
                    category: state.searchCategory,
                    status: state.statusFilter,
                    edad: state.edadFilter,
                    orden: state.ordenFilter,
                    tipoUbicacion: state.tipoUbicacionFilter,
                    ubicacion: state.ubicacionFilter,
                    offset: state.offset,
                    limit: state.pageSize
                });

                const res = await fetch(`${SUPABASE_URL}/functions/v1/api/personas?${params.toString()}`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                if (!res.ok) throw new Error('API no disponible');
                const data = await res.json();

                fetchedData = data || [];
                hasMoreRecords = fetchedData.length === state.pageSize;
            } catch (apiErr) {
                console.warn('Backend API /personas no disponible, usando fallback directo:', apiErr);
                let query = supabaseClient.from('personas').select('*');

                if (searchQuery) {
                    if (state.searchCategory === 'cedula') {
                        query = query.ilike('cedula', `%${searchQuery}%`);
                    } else if (state.searchCategory === 'nombre') {
                        query = query.ilike('nombre', `${searchQuery}%`);
                    } else if (state.searchCategory === 'apellido') {
                        query = query.or(`nombre.ilike.% ${searchQuery}%,nombre.ilike.%-${searchQuery}%`);
                    } else {
                        query = query.or(`nombre.ilike.%${searchQuery}%,cedula.ilike.%${searchQuery}%`);
                    }
                }

                if (state.statusFilter !== 'all') {
                    query = query.eq('estado', state.statusFilter);
                }

                if (state.edadFilter !== 'all') {
                    if (state.edadFilter === 'child') {
                        query = query.gte('edad', 0).lte('edad', 12);
                    } else if (state.edadFilter === 'teen') {
                        query = query.gte('edad', 13).lte('edad', 17);
                    } else if (state.edadFilter === 'adult') {
                        query = query.gte('edad', 18).lte('edad', 59);
                    } else if (state.edadFilter === 'senior') {
                        query = query.gte('edad', 60);
                    }
                }

                if (state.tipoUbicacionFilter !== 'all') {
                    if (state.tipoUbicacionFilter === 'hospital') {
                        query = query.or('ultima_ubicacion.ilike.%hospital%,ultima_ubicacion.ilike.%clinica%,ubicacion_encontrado.ilike.%hospital%,ubicacion_encontrado.ilike.%clinica%');
                    } else if (state.tipoUbicacionFilter === 'refugio') {
                        query = query.or('ultima_ubicacion.ilike.%refugio%,ultima_ubicacion.ilike.%albergue%,ubicacion_encontrado.ilike.%refugio%,ubicacion_encontrado.ilike.%albergue%');
                    }
                }

                if (state.ubicacionFilter) {
                    const uq = `%${state.ubicacionFilter}%`;
                    query = query.or(`ultima_ubicacion.ilike.${uq},ubicacion_encontrado.ilike.${uq}`);
                }

                const rangeStart = state.offset;
                const rangeEnd = state.offset + state.pageSize - 1;

                if (state.ordenFilter === 'nombre_asc') {
                    query = query.order('nombre', { ascending: true });
                } else if (state.ordenFilter === 'edad_asc') {
                    query = query.order('edad', { ascending: true, nullsFirst: false });
                } else if (state.ordenFilter === 'edad_desc') {
                    query = query.order('edad', { ascending: false, nullsFirst: false });
                } else {
                    query = query.order('estado', { ascending: false })
                                 .order('fecha_registro', { ascending: false });
                }

                query = query.range(rangeStart, rangeEnd);

                const { data, error } = await query;
                if (error) throw error;

                fetchedData = data || [];
                hasMoreRecords = fetchedData.length === state.pageSize;
            }
        }

        state.personas = fetchedData;
        state.hasMore = hasMoreRecords;
        renderPersonas();

    } catch (err) {
        console.error('Error al realizar fetch de registros:', err);
        showToast('Error al consultar el directorio.', 'error');
    } finally {
        state.isLoading = false;
        DOM.cardsGrid.classList.remove('is-loading');
    }
}

// --- RENDERIZADO DE LA INTERFAZ ---

function renderPersonas() {
    const searchQuery = DOM.searchInput.value.trim();

    DOM.cardsGrid.innerHTML = '';

    if (state.personas.length === 0) {
        if (DOM.viewToggleContainer) DOM.viewToggleContainer.style.display = 'none';
        if (DOM.paginationContainer) DOM.paginationContainer.style.display = 'none';

        if (searchQuery) {
            renderEmptySearchState(searchQuery);
        } else {
            DOM.cardsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-title">No hay personas en este filtro</div>
                    <p>Prueba cambiando los filtros seleccionados arriba.</p>
                </div>
            `;
        }
        return;
    }

    if (DOM.viewToggleContainer) {
        DOM.viewToggleContainer.style.display = 'flex';
        const countEl = document.getElementById('view-toggle-count');
        if (countEl) {
            const n = state.personas.length;
            const suffix = state.hasMore ? '+' : '';
            countEl.textContent = `${n}${suffix} persona${n !== 1 ? 's' : ''}`;
        }
    }

    if (state.viewMode === 'list') {
        DOM.cardsGrid.classList.add('cards-grid--list');
        renderList(state.personas);
    } else {
        DOM.cardsGrid.classList.remove('cards-grid--list');
        renderCards(state.personas);
    }

    renderPagination();
}

function renderCards(list) {
    list.forEach(person => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.dataset.id = person.id;
        card.onclick = () => window.openDetailsModal(person.id);
        
        const isMissing = person.estado === 'Desaparecido';
        const badgeClass = isMissing ? 'missing' : 'found';
        const badgeText = isMissing ? 'Desaparecido' : 'Encontrado';
        
        const fecha = new Date(person.fecha_registro).toLocaleString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const iniciales = person.nombre.split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
        
        let avatarHTML = '';
        if (person.foto_url) {
            avatarHTML = `<div class="person-avatar"><img src="${escapeHTML(person.foto_url)}" alt="Foto de ${escapeHTML(person.nombre)}" class="person-avatar-img" onerror="this.style.display='none'; this.parentElement.innerHTML='${iniciales}'"></div>`;
        } else {
            avatarHTML = `<div class="person-avatar">${iniciales}</div>`;
        }

        let cardHTML = `
            <div>
                <div class="card-header-wrapper">
                    ${avatarHTML}
                    <div class="card-header-details">
                        <h3 class="person-name" title="${escapeHTML(person.nombre)}">${escapeHTML(person.nombre)}</h3>
                        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.25rem;">
                            <span class="status-badge ${badgeClass}">${badgeText}</span>
                            ${person.es_menor ? '<span class="status-badge minor">🧒 Menor de Edad</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="info-row">
                        <span class="info-label">Cédula:</span>
                        <span class="info-value">${escapeHTML(person.cedula)}</span>
                    </div>
        `;
        
        if (person.edad) {
            cardHTML += `
                <div class="info-row">
                    <span class="info-label">Edad:</span>
                    <span class="info-value">${person.edad} años</span>
                </div>
            `;
        }
        
        if (person.ultima_ubicacion) {
            cardHTML += `
                <div class="info-row">
                    <span class="info-label">Última Ubic.:</span>
                    <span class="info-value">${escapeHTML(person.ultima_ubicacion)}</span>
                </div>
            `;
        }
        
        if (person.estado === 'Encontrado') {
            cardHTML += `
                <div class="info-row" style="margin-top: 0.5rem; background: rgba(16, 185, 129, 0.05); padding: 0.5rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.15)">
                    <span class="info-label" style="color: var(--status-found)">Localizado:</span>
                    <span class="info-value location-found">${escapeHTML(person.ubicacion_encontrado)}</span>
                </div>
            `;
            if (person.encontrado_por) {
                cardHTML += `
                    <div class="info-row" style="margin-top: 0.25rem;">
                        <span class="info-label" style="color: var(--status-found)">Encontrado por:</span>
                        <span class="info-value" style="font-weight: 500;">${escapeHTML(person.encontrado_por)} (C.I. ${escapeHTML(person.encontrado_por_cedula || 'N/A')})</span>
                    </div>
                `;
            }
        }
        
        if (person.observaciones) {
            cardHTML += `
                <div class="observaciones-box">
                    "${escapeHTML(person.observaciones)}"
                </div>
            `;
        }
        
        cardHTML += `
                </div>
            </div>
            <div class="card-footer">
                <div class="card-date">Reportado: ${fecha}</div>
        `;
        

        if (state.isAdmin) {
            cardHTML += `
                <div class="admin-card-actions">
                    <button class="btn btn-admin-edit" onclick="event.stopPropagation(); window.openStatusModal(${person.id}, '${escapeJS(person.nombre)}', '${person.estado}', '${escapeJS(person.ubicacion_encontrado || '')}', '${escapeJS(person.encontrado_por || '')}', '${escapeJS(person.encontrado_por_cedula || '')}')">Actualizar Estado</button>
                    <button class="btn btn-admin-delete" onclick="event.stopPropagation(); handleDeletePerson(${person.id}, '${escapeJS(person.nombre)}')">Eliminar</button>
                </div>
            `;
        }
        
        cardHTML += `</div>`;
        card.innerHTML = cardHTML;
        DOM.cardsGrid.appendChild(card);
    });
}

function renderList(list) {
    const wrapper = document.createElement('div');
    wrapper.className = 'list-view-wrapper';

    const table = document.createElement('table');
    table.className = 'list-view';

    table.innerHTML = `
        <thead>
            <tr>
                <th class="list-th">Nombre</th>
                <th class="list-th">Cédula</th>
                <th class="list-th list-th--hide-sm">Edad</th>
                <th class="list-th list-th--hide-sm">Última Ubicación</th>
                <th class="list-th">Estado</th>
                <th class="list-th list-th--hide-md">Registrado</th>
                ${state.isAdmin ? '<th class="list-th">Acciones</th>' : ''}
            </tr>
        </thead>
        <tbody id="list-tbody"></tbody>
    `;

    const tbody = table.querySelector('#list-tbody');

    list.forEach(person => {
        const isMissing = person.estado === 'Desaparecido';
        const badgeClass = isMissing ? 'missing' : 'found';
        const fecha = new Date(person.fecha_registro).toLocaleDateString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        const tr = document.createElement('tr');
        tr.className = 'list-row';
        tr.style.cursor = 'pointer';
        tr.onclick = () => window.openDetailsModal(person.id);

        let adminCells = '';
        if (state.isAdmin) {
            adminCells = `
                <td class="list-cell list-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-admin-edit btn-sm" onclick="window.openStatusModal(${person.id}, '${escapeJS(person.nombre)}', '${person.estado}', '${escapeJS(person.ubicacion_encontrado || '')}', '${escapeJS(person.encontrado_por || '')}', '${escapeJS(person.encontrado_por_cedula || '')}')">Actualizar</button>
                    <button class="btn btn-admin-delete btn-sm" onclick="handleDeletePerson(${person.id}, '${escapeJS(person.nombre)}')">Eliminar</button>
                </td>
            `;
        }

        tr.innerHTML = `
            <td class="list-cell list-name">
                <span class="list-person-name">${escapeHTML(person.nombre)}</span>
                ${person.es_menor ? '<span class="status-badge minor" style="font-size:0.65rem;">Menor</span>' : ''}
            </td>
            <td class="list-cell">${escapeHTML(person.cedula)}</td>
            <td class="list-cell list-th--hide-sm">${person.edad ? person.edad + ' años' : '—'}</td>
            <td class="list-cell list-th--hide-sm">${person.ultima_ubicacion ? escapeHTML(person.ultima_ubicacion) : '—'}</td>
            <td class="list-cell"><span class="status-badge ${badgeClass}">${escapeHTML(person.estado)}</span></td>
            <td class="list-cell list-th--hide-md">${fecha}</td>
            ${adminCells}
        `;

        tbody.appendChild(tr);
    });

    wrapper.appendChild(table);
    DOM.cardsGrid.appendChild(wrapper);
}

function renderPagination() {
    if (!DOM.paginationContainer) return;

    const totalPages = Math.ceil((state.hasMore ? state.currentPage * state.pageSize + 1 : state.currentPage * state.pageSize) / state.pageSize);
    const hasNext = state.hasMore;
    const hasPrev = state.currentPage > 1;

    if (!hasNext && !hasPrev) {
        DOM.paginationContainer.style.display = 'none';
        return;
    }

    DOM.paginationContainer.style.display = 'flex';
    DOM.paginationContainer.innerHTML = `
        <button class="btn-page" id="btn-prev-page" ${!hasPrev ? 'disabled' : ''}>← Anterior</button>
        <span class="page-indicator">Página ${state.currentPage}</span>
        <button class="btn-page" id="btn-next-page" ${!hasNext ? 'disabled' : ''}>Siguiente →</button>
    `;

    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            fetchRecords();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    document.getElementById('btn-next-page')?.addEventListener('click', () => {
        if (state.hasMore) {
            state.currentPage++;
            fetchRecords();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

function renderEmptySearchState(queryTerm) {
    DOM.cardsGrid.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'registration-bubble';
    
    // Auto-detectar si el término de búsqueda parece una cédula o un nombre
    const isNumeric = /^[0-9.-]+$/.test(queryTerm.replace(/^[VEve]-?/, ''));
    const prefillCedula = isNumeric ? queryTerm.toUpperCase() : '';
    const prefillNombre = isNumeric ? '' : queryTerm;
    
    container.innerHTML = `
        <h4>Persona no encontrada en el registro</h4>
        <p>No tenemos reportes sobre esta persona. Si está desaparecida, puedes ingresarla directamente aquí en este formulario para registrarla y comenzar su búsqueda:</p>
        
        <form id="inline-report-form">
            <div class="form-group">
                <label for="inline-nombre">Nombre Completo *</label>
                <input type="text" id="inline-nombre" class="form-control" placeholder="Ej: Juan Antonio Pérez" value="${escapeHTML(prefillNombre)}" required>
            </div>
            <div class="form-group">
                <label for="inline-cedula">Cédula de Identidad *</label>
                <div class="cedula-input-group">
                    <select id="inline-cedula-prefix" class="cedula-prefix-select">
                        <option value="V">V-</option>
                        <option value="E">E-</option>
                    </select>
                    <input type="text" id="inline-cedula" class="form-control cedula-number-input" placeholder="12.345.678" value="${escapeHTML(prefillCedula.replace(/^[VE]-?/i, ''))}" required inputmode="numeric" maxlength="12">
                </div>
            </div>
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                    <label for="inline-edad">Edad (Años)</label>
                    <input type="number" id="inline-edad" class="form-control" min="0" max="120" placeholder="Ej: 35">
                </div>
                <div class="form-group">
                    <label for="inline-telefono">Tu Teléfono de Contacto</label>
                    <input type="tel" id="inline-telefono" class="form-control" placeholder="Ej: 0412-1234567">
                </div>
            </div>
            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; margin-bottom: 1rem;">
                <input type="checkbox" id="inline-es-menor" style="width: 1.15rem; height: 1.15rem; cursor: pointer; accent-color: var(--accent);">
                <label for="inline-es-menor" style="margin-bottom: 0; cursor: pointer; font-weight: 500; font-size: 0.88rem; user-select: none; color: var(--text-primary);">Es menor de edad (Niño, niña o adolescente)</label>
            </div>
            <div class="form-group">
                <label for="inline-ubicacion">Última Ubicación Conocida</label>
                <input type="text" id="inline-ubicacion" class="form-control" placeholder="Ej: Centro de Chacao, cerca de la plaza">
            </div>
            <div class="form-group">
                <label for="inline-observaciones">Observaciones / Señas Particulares</label>
                <textarea id="inline-observaciones" class="form-control" placeholder="Vestimenta, señas físicas, padecimientos médicos, etc."></textarea>
            </div>
            <div class="form-footer">
                <button type="button" class="btn btn-secondary" id="btn-cancel-inline">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btn-submit-inline">Registrar Reporte</button>
            </div>
        </form>
    `;
    
    DOM.cardsGrid.appendChild(container);
    
    // Vincular envío de formulario
    const inlineForm = container.querySelector('#inline-report-form');
    inlineForm.addEventListener('submit', handleInlineReportSubmit);
    
    // Auto-formato de cédula inline
    attachCedulaFormatter('inline-cedula');
    
    // Botón cancelar limpia la búsqueda y restaura la pantalla
    container.querySelector('#btn-cancel-inline').addEventListener('click', () => {
        DOM.searchInput.value = '';
        DOM.searchBtnContainer.style.display = 'none';
        triggerSearchOrListReset();
    });
}

async function handleInlineReportSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const nombre = form.querySelector('#inline-nombre').value.trim();
    const cedula = getCedulaFullValue('inline-cedula-prefix', 'inline-cedula');
    const edad = form.querySelector('#inline-edad').value;
    const telefono = form.querySelector('#inline-telefono').value.trim();
    const ubicacion = form.querySelector('#inline-ubicacion').value.trim();
    const observaciones = form.querySelector('#inline-observaciones').value.trim();
    const esMenor = form.querySelector('#inline-es-menor').checked;
    
    const submitBtn = form.querySelector('#btn-submit-inline');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando reporte...';
    
    try {
        if (state.useSandbox) {
            const localData = JSON.parse(localStorage.getItem('personas_demo') || '[]');
            const duplicado = localData.some(p => p.cedula === cedula);
            if (duplicado) {
                showToast(`La cédula ${cedula} ya está registrada en el sistema.`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrar Reporte';
                return;
            }

            const newPerson = {
                id: Date.now(),
                nombre,
                cedula,
                edad: edad ? parseInt(edad) : null,
                telefono_contacto: telefono || null,
                ultima_ubicacion: ubicacion || null,
                observaciones: observaciones || null,
                estado: 'Desaparecido',
                es_menor: esMenor,
                foto_url: null,
                fecha_registro: new Date().toISOString()
            };
            
            localData.unshift(newPerson);
            localStorage.setItem('personas_demo', JSON.stringify(localData));
            
            showToast('Reporte registrado con éxito.', 'success');
            DOM.searchInput.value = '';
            DOM.searchBtnContainer.style.display = 'none';
            
            loadStats();
            triggerSearchOrListReset();
            
        } else {
            // Validar duplicado en producción
            const { data: existing, error: checkError } = await supabaseClient
                .from('personas')
                .select('id, estado')
                .eq('cedula', cedula)
                .maybeSingle();
                
            if (checkError) throw checkError;
            
            if (existing) {
                showToast(`La cédula ${cedula} ya está registrada como: ${existing.estado}.`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrar Reporte';
                return;
            }
            
            const insertData = {
                nombre,
                cedula,
                edad: edad ? parseInt(edad) : null,
                telefono_contacto: telefono || null,
                ultima_ubicacion: ubicacion || null,
                es_menor: esMenor,
                foto_url: null,
                observaciones: observaciones || null
            };
            
            const { error: insertError } = await supabaseClient.from('personas').insert([insertData]);
            if (insertError) throw insertError;
            
            showToast('Reporte registrado con éxito.', 'success');
            DOM.searchInput.value = '';
            DOM.searchBtnContainer.style.display = 'none';
            
            await loadStats();
            triggerSearchOrListReset();
        }
    } catch (err) {
        console.error('Error al registrar persona (inline):', err);
        showToast(err.message || 'Error al conectar con la base de datos.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrar Reporte';
    }
}

// --- GESTIÓN DE EVENTOS (LISTENERS) ---

function resetAndFetch() {
    state.currentPage = 1;
    fetchRecords();
}

function setupEventListeners() {
    // Auto-formato de cédula con puntos
    attachCedulaFormatter('report-cedula');
    attachCedulaFormatter('status-encontrado-por-cedula');
    
    // Controlar visibilidad del botón Buscar Persona
    DOM.searchInput.addEventListener('input', () => {
        const query = DOM.searchInput.value.trim();
        if (query.length > 0) {
            DOM.searchBtnContainer.style.display = 'block';
        } else {
            DOM.searchBtnContainer.style.display = 'none';
            triggerSearchOrListReset();
        }
    });

    // Ejecutar búsqueda al pulsar el botón Buscar
    DOM.btnRunSearch.addEventListener('click', () => {
        state.showingFullList = false;
        resetAndFetch();
    });

    // Ejecutar búsqueda al pulsar Enter
    DOM.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.showingFullList = false;
            resetAndFetch();
        }
    });

    // Filtros de categoría (Chips)
    document.querySelectorAll('#category-filters .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#category-filters .filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const radioInput = chip.querySelector('input[type="radio"]');
            if (radioInput) {
                radioInput.checked = true;
                state.searchCategory = radioInput.value;

                if (DOM.searchInput.value.trim() || state.showingFullList) {
                    resetAndFetch();
                }
            }
        });
    });

    // Filtros de estado (Chips)
    document.querySelectorAll('#status-filters .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#status-filters .filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const radioInput = chip.querySelector('input[type="radio"]');
            if (radioInput) {
                radioInput.checked = true;
                state.statusFilter = radioInput.value;

                if (DOM.searchInput.value.trim() || state.showingFullList) {
                    resetAndFetch();
                }
            }
        });
    });

    // Filtro de edad (select)
    DOM.filterEdad.addEventListener('change', () => {
        state.edadFilter = DOM.filterEdad.value;
        resetAndFetch();
    });

    // Filtro de orden (select)
    if (DOM.filterOrden) {
        DOM.filterOrden.addEventListener('change', () => {
            state.ordenFilter = DOM.filterOrden.value;
            resetAndFetch();
        });
    }

    // Filtro de tipo de ubicación (select)
    if (DOM.filterTipoUbicacion) {
        DOM.filterTipoUbicacion.addEventListener('change', () => {
            state.tipoUbicacionFilter = DOM.filterTipoUbicacion.value;
            resetAndFetch();
        });
    }

    let ubicacionDebounceTimer;
    DOM.filterUbicacion.addEventListener('input', () => {
        state.ubicacionFilter = DOM.filterUbicacion.value.trim();
        clearTimeout(ubicacionDebounceTimer);
        ubicacionDebounceTimer = setTimeout(() => resetAndFetch(), 400);
    });

    // Alternar visualización del listado completo
    DOM.btnToggleList.addEventListener('click', () => {
        state.showingFullList = !state.showingFullList;
        if (state.showingFullList) {
            DOM.searchInput.value = '';
            DOM.searchBtnContainer.style.display = 'none';
            resetAndFetch();
        } else {
            triggerSearchOrListReset();
        }
    });

    // Toggles de vista (grid / lista)
    DOM.btnViewGrid?.addEventListener('click', () => {
        state.viewMode = 'grid';
        DOM.btnViewGrid.classList.add('active');
        DOM.btnViewList?.classList.remove('active');
        renderPersonas();
    });
    DOM.btnViewList?.addEventListener('click', () => {
        state.viewMode = 'list';
        DOM.btnViewList.classList.add('active');
        DOM.btnViewGrid?.classList.remove('active');
        renderPersonas();
    });
    
    // Modales
    DOM.btnCloseReport.addEventListener('click', () => toggleModal(DOM.modalReport, false));
    DOM.btnCancelReport.addEventListener('click', () => toggleModal(DOM.modalReport, false));
    
    DOM.btnAdminLogout = document.getElementById('btn-admin-logout');
    if (DOM.btnAdminLogout) {
        DOM.btnAdminLogout.addEventListener('click', () => {
            if (state.isAdmin) {
                handleLogout();
            }
        });
    }
    
    // Auto-trigger admin login si viene de /admin
    if (sessionStorage.getItem('triggerAdminLogin') === 'true') {
        sessionStorage.removeItem('triggerAdminLogin');
        toggleModal(DOM.modalLogin, true);
    }
    DOM.btnCloseLogin.addEventListener('click', () => toggleModal(DOM.modalLogin, false));
    DOM.btnCancelLogin.addEventListener('click', () => toggleModal(DOM.modalLogin, false));
    
    DOM.btnCloseStatus.addEventListener('click', () => toggleModal(DOM.modalStatus, false));
    DOM.btnCancelStatus.addEventListener('click', () => toggleModal(DOM.modalStatus, false));
    
    if (DOM.btnCloseDetails) {
        DOM.btnCloseDetails.addEventListener('click', () => toggleModal(DOM.modalDetails, false));
    }
    
    DOM.statusSelect.addEventListener('change', (e) => {
        toggleUbicacionField(e.target.value === 'Encontrado');
    });
    
    // Formularios Submit
    DOM.formReportPerson.addEventListener('submit', handleReportSubmit);
    DOM.formAdminLogin.addEventListener('submit', handleLoginSubmit);
    DOM.formUpdateStatus.addEventListener('submit', handleStatusSubmit);
    
    DOM.btnImportCsv.addEventListener('click', handleCsvImport);

    // --- MENÚ DE NAVEGACIÓN ---
    const navHamburger = document.getElementById('nav-hamburger');
    const navLinksList = document.getElementById('nav-links');

    if (navHamburger && navLinksList) {
        navHamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navLinksList.classList.contains('nav-links--open');
            navLinksList.classList.toggle('nav-links--open');
            navHamburger.classList.toggle('hamburger--open');
            navHamburger.setAttribute('aria-expanded', String(!isOpen));
        });

        navLinksList.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinksList.classList.remove('nav-links--open');
                navHamburger.classList.remove('hamburger--open');
                navHamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    document.getElementById('nav-link-buscar')?.addEventListener('click', (e) => {
        e.preventDefault();
        DOM.searchInput.focus();
        DOM.searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    document.getElementById('nav-link-reportar')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal(DOM.modalReport, true);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            toggleModal(e.target, false);
        }
    });
}

// Resetea la vista si limpian el buscador o colapsan el listado
function triggerSearchOrListReset() {
    if (!state.showingFullList) {
        state.currentPage = 1;
        DOM.filtersBar.style.display = 'none';
        DOM.cardsGrid.innerHTML = '';
        if (DOM.paginationContainer) DOM.paginationContainer.style.display = 'none';
        if (DOM.viewToggleContainer) DOM.viewToggleContainer.style.display = 'none';
        DOM.toggleListContainer.style.display = 'block';
        
        // Resetear valores de filtros avanzados
        state.edadFilter = 'all';
        state.ordenFilter = 'recientes';
        state.tipoUbicacionFilter = 'all';
        state.ubicacionFilter = '';
        if (DOM.filterEdad) DOM.filterEdad.value = 'all';
        if (DOM.filterOrden) DOM.filterOrden.value = 'recientes';
        if (DOM.filterTipoUbicacion) DOM.filterTipoUbicacion.value = 'all';
        if (DOM.filterUbicacion) DOM.filterUbicacion.value = '';
        DOM.btnToggleList.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem;">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            Ver Lista de Desaparecidos y Localizados
        `;
    } else {
        resetAndFetch();
    }
}

// --- PROCESAMIENTO DE OPERACIONES (MÉTODO DUAL: SANDBOX O SUPABASE) ---

async function handleReportSubmit(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('report-nombre').value.trim();
    const cedula = getCedulaFullValue('report-cedula-prefix', 'report-cedula');
    const edad = document.getElementById('report-edad').value;
    const telefono = document.getElementById('report-telefono').value.trim();
    const ubicacion = document.getElementById('report-ubicacion').value.trim();
    const observaciones = document.getElementById('report-observaciones').value.trim();
    const esMenor = document.getElementById('report-es-menor').checked;
    
    DOM.btnSubmitReport.disabled = true;
    DOM.btnSubmitReport.textContent = 'Guardando reporte...';
    
    try {
        if (state.useSandbox) {
            // --- CÓDIGO SANDBOX ---
            const localData = JSON.parse(localStorage.getItem('personas_demo') || '[]');
            const duplicado = localData.some(p => p.cedula === cedula);
            if (duplicado) {
                showToast(`La cédula ${cedula} ya está registrada en el sistema.`, 'error');
                DOM.btnSubmitReport.disabled = false;
                DOM.btnSubmitReport.textContent = 'Registrar Reporte';
                return;
            }

            const newPerson = {
                id: Date.now(),
                nombre,
                cedula,
                edad: edad ? parseInt(edad) : null,
                telefono_contacto: telefono || null,
                ultima_ubicacion: ubicacion || null,
                observaciones: observaciones || null,
                estado: 'Desaparecido',
                es_menor: esMenor,
                foto_url: null,
                fecha_registro: new Date().toISOString()
            };
            
            localData.unshift(newPerson);
            localStorage.setItem('personas_demo', JSON.stringify(localData));
            
            showToast('Reporte registrado con éxito.', 'success');
            DOM.formReportPerson.reset();
            toggleModal(DOM.modalReport, false);
            
            // Recargar estadísticas y refrescar vista
            loadStats();
            resetAndFetch();
            
        } else {
            try {
                // Validar cédula duplicada llamando al API
                const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/api/personas?q=${encodeURIComponent(cedula)}&category=cedula`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                if (!checkRes.ok) throw new Error('API no disponible');
                const existing = await checkRes.json();
                if (existing && existing.length > 0) {
                    showToast(`La cédula ${cedula} ya está registrada como: ${existing[0].estado}.`, 'error');
                    DOM.btnSubmitReport.disabled = false;
                    DOM.btnSubmitReport.textContent = 'Registrar Reporte';
                    return;
                }

                const insertRes = await fetch(`${SUPABASE_URL}/functions/v1/api/personas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        nombre,
                        cedula,
                        edad: edad ? parseInt(edad) : null,
                        telefono_contacto: telefono || null,
                        ultima_ubicacion: ubicacion || null,
                        es_menor: esMenor,
                        observaciones: observaciones || null
                    })
                });
                if (!insertRes.ok) {
                    const errData = await insertRes.json();
                    throw new Error(errData.error || 'Error al guardar reporte en API');
                }
            } catch (apiErr) {
                console.warn('API no disponible para insertar reporte, usando fallback directo:', apiErr);
                
                const { data: existing, error: checkError } = await supabaseClient
                    .from('personas')
                    .select('id, estado')
                    .eq('cedula', cedula)
                    .maybeSingle();
                if (checkError) throw checkError;

                if (existing) {
                    showToast(`La cédula ${cedula} ya está registrada como: ${existing.estado}.`, 'error');
                    DOM.btnSubmitReport.disabled = false;
                    DOM.btnSubmitReport.textContent = 'Registrar Reporte';
                    return;
                }

                const { error: insertError } = await supabaseClient.from('personas').insert([{
                    nombre,
                    cedula,
                    edad: edad ? parseInt(edad) : null,
                    telefono_contacto: telefono || null,
                    ultima_ubicacion: ubicacion || null,
                    es_menor: esMenor,
                    observaciones: observaciones || null
                }]);
                if (insertError) throw insertError;
            }
            
            showToast('Reporte registrado con éxito.', 'success');
            DOM.formReportPerson.reset();
            toggleModal(DOM.modalReport, false);
            
            await loadStats();
            await resetAndFetch();
        }
    } catch (err) {
        console.error('Error al registrar persona:', err);
        showToast(err.message || 'Error al conectar con la base de datos.', 'error');
    } finally {
        DOM.btnSubmitReport.disabled = false;
        DOM.btnSubmitReport.textContent = 'Registrar Reporte';
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const email = DOM.formAdminLogin.querySelector('#login-email').value.trim();
    const password = DOM.formAdminLogin.querySelector('#login-password').value.trim();
    
    if (state.useSandbox) {
        if (email === 'admin@example.com' && password === 'change-me') {
            sessionStorage.setItem('admin_session_demo', 'active');
            setAdminState(true);
            showToast('Acceso administrativo local concedido.', 'success');
            DOM.formAdminLogin.reset();
            toggleModal(DOM.modalLogin, false);
            
            if (DOM.searchInput.value.trim() || state.showingFullList) {
                resetAndFetch();
            }
        } else {
            showToast('Credenciales incorrectas para el modo local.', 'error');
        }
    } else {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                showToast(error.message || 'Credenciales incorrectas.', 'error');
            } else {
                showToast('Acceso administrativo concedido.', 'success');
                DOM.formAdminLogin.reset();
                toggleModal(DOM.modalLogin, false);
                setAdminState(true);
                await loadStats();
                
                if (DOM.searchInput.value.trim() || state.showingFullList) {
                    await resetAndFetch();
                }
            }
        } catch (err) {
            console.error('Error al iniciar sesión:', err);
            showToast('Error al conectar con Supabase Auth.', 'error');
        }
    }
}

async function handleLogout() {
    if (state.useSandbox) {
        sessionStorage.removeItem('admin_session_demo');
        setAdminState(false);
        showToast('Sesión administrativa de demostración cerrada.', 'success');
        
        if (DOM.searchInput.value.trim() || state.showingFullList) {
            resetAndFetch();
        }
    } else {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (!error) {
                setAdminState(false);
                showToast('Sesión administrativa cerrada.', 'success');
                await loadStats();
                
                if (DOM.searchInput.value.trim() || state.showingFullList) {
                    await resetAndFetch();
                }
            }
        } catch (err) {
            console.error('Error cerrando sesión:', err);
        }
    }
}

async function handleStatusSubmit(e) {
    e.preventDefault();
    
    const id = parseInt(DOM.statusPersonaId.value);
    const estado = DOM.statusSelect.value;
    const ubicacion_encontrado = DOM.statusUbicacion.value.trim();
    const encontrado_por = DOM.statusEncontradoPor.value.trim();
    const encontrado_por_cedula = DOM.statusEncontradoPorCedula.value.trim().toUpperCase();
    
    if (estado === 'Encontrado' && (!ubicacion_encontrado || !encontrado_por || !encontrado_por_cedula)) {
        showToast('Por favor, complete todos los campos requeridos.', 'error');
        return;
    }
    
    try {
        if (state.useSandbox) {
            const localData = JSON.parse(localStorage.getItem('personas_demo') || '[]');
            const updated = localData.map(p => {
                if (p.id === id) {
                    return {
                        ...p,
                        estado,
                        ubicacion_encontrado: estado === 'Encontrado' ? ubicacion_encontrado : null,
                        encontrado_por: estado === 'Encontrado' ? encontrado_por : null,
                        encontrado_por_cedula: estado === 'Encontrado' ? encontrado_por_cedula : null,
                        fecha_actualizacion: new Date().toISOString()
                      };
                }
                return p;
            });
            localStorage.setItem('personas_demo', JSON.stringify(updated));
            showToast('Estado actualizado con éxito.', 'success');
            toggleModal(DOM.modalStatus, false);
            
            await loadStats();
            await resetAndFetch();
        } else {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const token = session?.access_token;
            
            const updateData = {
                estado,
                ubicacion_encontrado: estado === 'Encontrado' ? ubicacion_encontrado : null,
                encontrado_por: estado === 'Encontrado' ? encontrado_por : null,
                encontrado_por_cedula: estado === 'Encontrado' ? encontrado_por_cedula : null,
                fecha_actualizacion: new Date().toISOString()
            };

            try {
                const res = await fetch(`${SUPABASE_URL}/functions/v1/api/personas/${id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify(updateData)
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || 'Error al actualizar estatus vía API');
                }
            } catch (apiErr) {
                console.warn('API no disponible para actualizar estado, usando fallback directo:', apiErr);
                const { error } = await supabaseClient.from('personas').update(updateData).eq('id', id);
                if (error) throw error;
            }
            
            showToast('Estado actualizado con éxito.', 'success');
            toggleModal(DOM.modalStatus, false);
            
            await loadStats();
            await resetAndFetch();
        }
    } catch (err) {
        console.error('Error al actualizar estado:', err);
        showToast('Error al actualizar en la base de datos.', 'error');
    }
}

async function handleDeletePerson(id, nombre) {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el reporte de ${nombre}?`)) {
        return;
    }
    
    try {
        if (state.useSandbox) {
            const localData = JSON.parse(localStorage.getItem('personas_demo') || '[]');
            const filtered = localData.filter(p => p.id !== id);
            localStorage.setItem('personas_demo', JSON.stringify(filtered));
            showToast('Registro eliminado.', 'success');
            
            await loadStats();
            await resetAndFetch();
        } else {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const token = session?.access_token;

            try {
                const res = await fetch(`${SUPABASE_URL}/functions/v1/api/personas/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || 'Error al eliminar reporte via API');
                }
            } catch (apiErr) {
                console.warn('API no disponible para eliminar, usando fallback directo:', apiErr);
                const { error } = await supabaseClient.from('personas').delete().eq('id', id);
                if (error) throw error;
            }
            showToast('Registro eliminado con éxito.', 'success');
            
            await loadStats();
            await resetAndFetch();
        }
    } catch (err) {
        console.error('Error al eliminar persona:', err);
        showToast('No tienes permisos o falló la conexión.', 'error');
    }
}

// --- CARGA MASIVA CSV ---

function handleCsvImport() {
    const file = DOM.csvFile.files[0];
    if (!file) {
        showToast('Por favor, selecciona un archivo CSV.', 'error');
        return;
    }
    
    DOM.btnImportCsv.disabled = true;
    DOM.btnImportCsv.textContent = 'Procesando...';
    DOM.importProgress.style.display = 'block';
    DOM.importProgress.textContent = 'Leyendo archivo Excel/CSV...';
    DOM.importProgress.style.color = 'var(--text-secondary)';
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            const rows = results.data;
            if (rows.length === 0) {
                showToast('El archivo CSV está vacío.', 'error');
                resetCsvButton();
                return;
            }
            
            DOM.importProgress.textContent = `Procesando ${rows.length} filas...`;
            
            const mappedRows = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                let nombre = '';
                let cedula = '';
                let edad = null;
                let ubicacion = null;
                let observaciones = null;
                
                Object.keys(row).forEach(key => {
                    const cleanKey = key.toLowerCase().trim();
                    const val = row[key] ? row[key].trim() : '';
                    if (!val) return;
                    
                    if (cleanKey.includes('nom') || cleanKey.includes('apell')) {
                        nombre = val;
                    } else if (cleanKey.includes('ced') || cleanKey.includes('ci') || cleanKey.includes('doc') || cleanKey.includes('ident')) {
                        cedula = val.toUpperCase();
                    } else if (cleanKey.includes('edad') || cleanKey.includes('age') || cleanKey.includes('ano')) {
                        const parsedAge = parseInt(val);
                        if (!isNaN(parsedAge)) edad = parsedAge;
                    } else if (cleanKey.includes('loc') || cleanKey.includes('ubi') || cleanKey.includes('dire')) {
                        ubicacion = val;
                    } else if (cleanKey.includes('obs') || cleanKey.includes('det') || cleanKey.includes('sen')) {
                        observaciones = val;
                    }
                });
                
                if (nombre && cedula) {
                    const isMinor = (edad !== null && edad < 18);
                    mappedRows.push({
                        nombre,
                        cedula,
                        edad,
                        es_menor: isMinor,
                        ultima_ubicacion: ubicacion,
                        observaciones,
                        estado: 'Desaparecido'
                    });
                }
            }
            
            if (mappedRows.length === 0) {
                showToast('No se encontraron columnas de "nombre" y "cedula" válidas.', 'error');
                resetCsvButton();
                return;
            }
            
            DOM.importProgress.textContent = `Guardando ${mappedRows.length} registros...`;
            
            try {
                if (state.useSandbox) {
                    const localData = JSON.parse(localStorage.getItem('personas_demo') || '[]');
                    
                    mappedRows.forEach(importedPerson => {
                        const idx = localData.findIndex(p => p.cedula === importedPerson.cedula);
                        const record = {
                            ...importedPerson,
                            id: idx >= 0 ? localData[idx].id : Date.now() + Math.random(),
                            fecha_registro: idx >= 0 ? localData[idx].fecha_registro : new Date().toISOString()
                        };
                        
                        if (idx >= 0) {
                            localData[idx] = record;
                        } else {
                            localData.unshift(record);
                        }
                    });
                    
                    localStorage.setItem('personas_demo', JSON.stringify(localData));
                    showToast(`Se importaron ${mappedRows.length} personas con éxito localmente.`, 'success');
                    DOM.importProgress.textContent = `¡Importación exitosa! ${mappedRows.length} registros cargados.`;
                    DOM.importProgress.style.color = 'var(--status-found)';
                    DOM.csvFile.value = '';
                    
                    await loadStats();
                    await resetAndFetch();
                } else {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    const token = session?.access_token;

                    try {
                        const res = await fetch(`${SUPABASE_URL}/functions/v1/api/import-csv`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': token ? `Bearer ${token}` : ''
                            },
                            body: JSON.stringify(mappedRows)
                        });
                        if (!res.ok) {
                            const errData = await res.json();
                            throw new Error(errData.error || 'Error en importación masiva via API');
                        }
                    } catch (apiErr) {
                        console.warn('API no disponible para importación CSV, usando fallback directo:', apiErr);
                        const { error } = await supabaseClient
                            .from('personas')
                            .upsert(mappedRows, { onConflict: 'cedula' });
                        if (error) throw error;
                    }
                    
                    showToast(`Se importaron ${mappedRows.length} personas con éxito.`, 'success');
                    DOM.importProgress.textContent = `¡Importación exitosa! ${mappedRows.length} registros cargados.`;
                    DOM.importProgress.style.color = 'var(--status-found)';
                    DOM.csvFile.value = '';
                    
                    await loadStats();
                    await resetAndFetch();
                }
            } catch (err) {
                console.error('Error en bulk insert:', err);
                showToast('Error al importar la lista a la base de datos.', 'error');
                DOM.importProgress.textContent = 'Error al subir los datos.';
                DOM.importProgress.style.color = 'var(--status-missing)';
            } finally {
                DOM.btnImportCsv.disabled = false;
                DOM.btnImportCsv.textContent = 'Importar CSV';
            }
        },
        error: function(err) {
            console.error('Error al parsear CSV:', err);
            showToast('Error al procesar el archivo CSV.', 'error');
            resetCsvButton();
        }
    });
}

function resetCsvButton() {
    DOM.btnImportCsv.disabled = false;
    DOM.btnImportCsv.textContent = 'Importar CSV';
    DOM.importProgress.style.display = 'none';
}

// --- UTILERÍAS / AUXILIARES ---

function setAdminState(loggedIn) {
    state.isAdmin = loggedIn;
    if (loggedIn) {
        if (DOM.adminIndicator) DOM.adminIndicator.style.display = 'inline-block';
        if (DOM.adminPanel) DOM.adminPanel.style.display = 'block';
    } else {
        if (DOM.adminIndicator) DOM.adminIndicator.style.display = 'none';
        if (DOM.adminPanel) DOM.adminPanel.style.display = 'none';
    }
}

function toggleModal(modalEl, show) {
    if (show) {
        modalEl.classList.add('active');
    } else {
        modalEl.classList.remove('active');
    }
}

function toggleUbicacionField(show) {
    if (show) {
        DOM.groupUbicacionEncontrado.style.display = 'block';
        DOM.statusUbicacion.required = true;
        DOM.statusEncontradoPor.required = true;
        DOM.statusEncontradoPorCedula.required = true;
    } else {
        DOM.groupUbicacionEncontrado.style.display = 'none';
        DOM.statusUbicacion.required = false;
        DOM.statusEncontradoPor.required = false;
        DOM.statusEncontradoPorCedula.required = false;
        DOM.statusUbicacion.value = '';
        DOM.statusEncontradoPor.value = '';
        DOM.statusEncontradoPorCedula.value = '';
    }
}

// Abrir el modal de actualización de estatus
window.openStatusModal = function(id, nombre, estadoActual, ubicacionActual, encontradoPor, encontradoPorCedula) {
    DOM.statusPersonaId.value = id;
    DOM.statusNombre.value = nombre;
    DOM.statusSelect.value = estadoActual;
    DOM.statusUbicacion.value = ubicacionActual || '';
    DOM.statusEncontradoPor.value = encontradoPor || '';
    DOM.statusEncontradoPorCedula.value = encontradoPorCedula || '';
    
    toggleUbicacionField(estadoActual === 'Encontrado');
    toggleModal(DOM.modalStatus, true);
};

// Crear y mostrar Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:inherit; font-size:1.1rem; cursor:pointer; margin-left:1rem;">&times;</button>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Auto-remover en 4 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// Sanitizar entradas para prevenir XSS
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const stringVal = String(str);
    return stringVal.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Escapar cadenas en llamadas dinámicas inline de onclick
function escapeJS(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/['"\\]/g, char => '\\' + char);
}

window.openDetailsModal = function(id) {
    const person = state.personas.find(p => p.id === id);
    if (!person) return;

    const isMissing = person.estado === 'Desaparecido';
    const badgeClass = isMissing ? 'missing' : 'found';
    const badgeText = isMissing ? 'Desaparecido' : 'Encontrado';
    
    const fecha = new Date(person.fecha_registro).toLocaleString('es-VE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let html = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h2 style="margin: 0 0 0.5rem 0; font-size: 2rem; color: var(--text-color);">${escapeHTML(person.nombre)}</h2>
            <span class="status-badge ${badgeClass}" style="font-size: 1rem; padding: 0.35rem 1rem;">${badgeText}</span>
            ${person.es_menor ? '<span class="status-badge minor" style="font-size: 0.9rem; margin-left: 0.5rem;">🧒 Menor de Edad</span>' : ''}
        </div>
        
        <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong style="color: var(--text-color-muted)">Cédula:</strong> 
                    <span style="font-weight: 500">${escapeHTML(person.cedula)}</span>
                </div>
                ${person.edad ? `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong style="color: var(--text-color-muted)">Edad:</strong> 
                    <span style="font-weight: 500">${person.edad} años</span>
                </div>` : ''}
                ${person.telefono_contacto ? `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong style="color: var(--text-color-muted)">Teléfono Contacto:</strong> 
                    <span style="font-weight: 500">${escapeHTML(person.telefono_contacto)}</span>
                </div>` : ''}
                ${person.ultima_ubicacion ? `
                <div style="display: flex; flex-direction: column; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong style="color: var(--text-color-muted); margin-bottom: 0.25rem;">Última Ubicación Conocida:</strong> 
                    <span style="font-weight: 500; line-height: 1.4;">${escapeHTML(person.ultima_ubicacion)}</span>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong style="color: var(--text-color-muted)">Fecha de Reporte:</strong> 
                    <span style="font-weight: 500">${fecha}</span>
                </div>
    `;

    if (person.estado === 'Encontrado') {
        html += `
                <div style="display: flex; flex-direction: column; background: rgba(16, 185, 129, 0.1); padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem; border: 1px solid rgba(16, 185, 129, 0.2);">
                    <strong style="color: var(--status-found); margin-bottom: 0.25rem;">Ubicación Actual (Localizado):</strong> 
                    <span style="font-weight: 600;">${escapeHTML(person.ubicacion_encontrado || 'No especificada')}</span>
                    ${person.encontrado_por ? `
                    <div style="margin-top: 0.5rem; font-size: 0.9rem;">
                        <strong>Por:</strong> ${escapeHTML(person.encontrado_por)}
                    </div>` : ''}
                </div>
        `;
    }

    if (person.observaciones) {
        html += `
                <div style="display: flex; flex-direction: column; padding-top: 0.5rem;">
                    <strong style="color: var(--text-color-muted); margin-bottom: 0.25rem;">Observaciones:</strong> 
                    <div style="background: var(--bg-color); padding: 0.75rem; border-radius: 8px; font-style: italic; font-size: 0.95rem; border: 1px solid var(--border-color);">
                        ${escapeHTML(person.observaciones)}
                    </div>
                </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

    if (isMissing) {
        let msgText = `Hola, tengo información sobre la persona reportada como Desaparecida:\n` +
                      `- Nombre: ${person.nombre}\n` +
                      `- Cédula: ${person.cedula}\n`;
        if (person.edad) msgText += `- Edad: ${person.edad} años\n`;
        if (person.ultima_ubicacion) msgText += `- Última ubicación: ${person.ultima_ubicacion}\n`;
        msgText += `\nInformación sobre su paradero / estado: `;
        const encodedWA = encodeURIComponent(msgText);
        html += `
        <div style="margin-top: 1rem; text-align: center;">
            <a href="https://wa.me/${state.whatsappPhone}?text=${encodedWA}" target="_blank" class="btn btn-whatsapp" style="display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1rem; font-weight: 600; border-radius: 8px; background: #25D366; color: white; text-decoration: none; width: 100%; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2);">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                Informar Ubicación / Encontrado (WA)
            </a>
        </div>
        `;
    }

    if (DOM.detailsContent) {
        DOM.detailsContent.innerHTML = html;
    }

    // Configurar botones de compartir
    const shareUrl = window.location.href.split('?')[0]; // URL base
    let shareText = isMissing 
        ? `Ayúdame a encontrar a ${person.nombre}. Reportado(a) como desaparecido(a) en Venezuela.` 
        : `¡Excelentes noticias! ${person.nombre} ha sido localizado(a) en Venezuela.`;
    
    if (person.ultima_ubicacion && isMissing) {
        shareText += ` Visto(a) por última vez en: ${person.ultima_ubicacion}.`;
    }
    shareText += ` Más información: ${shareUrl}`;
    
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);

    if (DOM.btnShareInstagram) {
        DOM.btnShareInstagram.onclick = () => {
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('Info copiada. Abre Instagram para publicarla en tu Historia.', 'success');
                setTimeout(() => { window.location.href = 'instagram://camera'; }, 1000);
            });
        };
    }
    if (DOM.btnShareFacebook) {
        DOM.btnShareFacebook.onclick = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank');
    }
    if (DOM.btnShareX) {
        DOM.btnShareX.onclick = () => window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
    }
    if (DOM.btnShareTiktok) {
        DOM.btnShareTiktok.onclick = () => {
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('Info copiada. Abre TikTok para publicarla.', 'success');
                setTimeout(() => { window.location.href = 'snssdk1233://'; }, 1000);
            });
        };
    }

    if (DOM.btnReportError) {
        const errorText = `Hola, quiero reportar un error en la información sobre el perfil de: ${person.nombre} (C.I. ${person.cedula}). La información correcta es: `;
        DOM.btnReportError.href = `https://wa.me/${state.whatsappPhone}?text=${encodeURIComponent(errorText)}`;
    }

    toggleModal(DOM.modalDetails, true);
};
