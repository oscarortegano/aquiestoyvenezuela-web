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
    
    // Estado de Paginación
    pageSize: 50,           // Cantidad de registros por lote
    offset: 0,              // Desplazamiento actual para la consulta
    hasMore: false,         // Indica si hay más registros en el servidor
    isLoading: false        // Bloqueo para evitar consultas dobles
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
    loadMoreContainer: document.getElementById('load-more-container'),
    btnLoadMore: document.getElementById('btn-load-more'),
    
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
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        z-index: 2000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    banner.innerHTML = `
        🚀 Modo Demostración Local (Sandbox). Los datos se guardan en este navegador. 
        Para producción, conecta tu base de datos de Supabase en <code style="background:rgba(0,0,0,0.2); padding:2px 6px; border-radius:4px;">static/js/config.js</code>.
    `;
    document.body.prepend(banner);
    document.body.style.paddingTop = '2.5rem';
    
    // Cargar credenciales simulación
    const sessionActive = sessionStorage.getItem('admin_session_demo') === 'active';
    setAdminState(sessionActive);
    
    // Inicializar datos semilla ficticios si la memoria local esta vacia.
    if (!localStorage.getItem('personas_demo')) {
        const seedData = [
            { id: 1, nombre: "Persona Demo 001", cedula: "V-00000001", edad: 34, ultima_ubicacion: "Ubicacion demo", telefono_contacto: "0000-0000000", observaciones: "Registro ficticio para pruebas locales.", estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(Date.now() - 3600000 * 2).toISOString() },
            { id: 2, nombre: "Persona Demo 002", cedula: "V-00000002", edad: 28, ultima_ubicacion: "Ubicacion demo", telefono_contacto: "0000-0000000", observaciones: "Registro ficticio para pruebas locales.", estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(Date.now() - 3600000 * 5).toISOString() },
            { id: 3, nombre: "Persona Demo 003", cedula: "V-00000003", edad: 62, ultima_ubicacion: "Ubicacion demo", telefono_contacto: "0000-0000000", observaciones: "Registro ficticio para pruebas locales.", estado: "Encontrado", ubicacion_encontrado: "Ubicacion demo", encontrado_por: "Usuario Demo", encontrado_por_cedula: "V-00000004", es_menor: false, foto_url: null, fecha_registro: new Date(Date.now() - 3600000 * 24).toISOString() },
            { id: 4, nombre: "Persona Demo 004", cedula: "V-00000005", edad: 45, ultima_ubicacion: "Ubicacion demo", telefono_contacto: "0000-0000000", observaciones: "Registro ficticio para pruebas locales.", estado: "Desaparecido", es_menor: false, foto_url: null, fecha_registro: new Date(Date.now() - 3600000 * 48).toISOString() },
            { id: 5, nombre: "Persona Demo 005", cedula: "V-00000006", edad: 10, ultima_ubicacion: "Ubicacion demo", telefono_contacto: "0000-0000000", observaciones: "Registro ficticio para pruebas locales.", estado: "Desaparecido", es_menor: true, foto_url: null, fecha_registro: new Date(Date.now() - 3600000 * 12).toISOString() }
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

async function fetchRecords(append = false) {
    if (state.isLoading) return;
    state.isLoading = true;
    
    // Actualizar UI del botón de carga
    DOM.btnLoadMore.disabled = true;
    DOM.btnLoadMore.innerHTML = `
        <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem; animation: rotate 1s linear infinite;">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        Cargando registros...
    `;

    DOM.filtersBar.style.display = 'flex';

    if (!append) {
        renderSkeletons();
        state.offset = 0;
    } else {
        state.offset += state.pageSize;
    }

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

        // 2. Actualizar estado e interfaz
        if (!append) {
            state.personas = fetchedData;
        } else {
            state.personas = state.personas.concat(fetchedData);
        }

        state.hasMore = hasMoreRecords;
        renderPersonas(append);
        
    } catch (err) {
        console.error('Error al realizar fetch de registros:', err);
        showToast('Error al consultar el directorio.', 'error');
    } finally {
        state.isLoading = false;
        // Restaurar estado del botón de carga
        DOM.btnLoadMore.disabled = false;
        DOM.btnLoadMore.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem;">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            Cargar más personas...
        `;
    }
}

// --- RENDERIZADO DE LA INTERFAZ ---

function renderSkeletons() {
    DOM.cardsGrid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const card = document.createElement('div');
        card.className = 'person-card skeleton';
        card.innerHTML = `
            <div>
                <div class="card-header-wrapper">
                    <div class="skeleton-line skeleton-avatar"></div>
                    <div class="card-header-details">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-badge"></div>
                    </div>
                </div>
                <div class="card-body" style="margin-top:0.75rem;">
                    <div class="skeleton-line skeleton-row"></div>
                    <div class="skeleton-line skeleton-row" style="width:80%;"></div>
                    <div class="skeleton-line skeleton-row" style="width:60%;"></div>
                </div>
            </div>
            <div class="card-footer">
                <div class="skeleton-line skeleton-row" style="width:40%; margin-left:auto;"></div>
            </div>`;
        DOM.cardsGrid.appendChild(card);
    }
}

function renderPersonas(append = false) {
    const searchQuery = DOM.searchInput.value.trim();

    // 1. Mostrar/Ocultar controles de paginación e información
    if (state.hasMore) {
        DOM.loadMoreContainer.style.display = 'block';
    } else {
        DOM.loadMoreContainer.style.display = 'none';
    }

    // Si no cargamos por "Cargar más", limpiamos la grilla
    if (!append) {
        DOM.cardsGrid.innerHTML = '';
    }

    // 2. Si no hay registros
    if (state.personas.length === 0) {
        DOM.loadMoreContainer.style.display = 'none';
        
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

    // 3. Renderizar las tarjetas de personas en el grid
    // Si estamos haciendo append, solo renderizamos los nuevos (los últimos N)
    const listToRender = append ? state.personas.slice(state.personas.length - state.pageSize) : state.personas;
    renderCards(listToRender);
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
        state.showingFullList = false; // La búsqueda apaga el modo directorio completo
        fetchRecords(false);
    });

    // Ejecutar búsqueda al pulsar Enter
    DOM.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.showingFullList = false;
            fetchRecords(false);
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
                
                // Solo recargamos si hay texto o estamos viendo la lista completa
                if (DOM.searchInput.value.trim() || state.showingFullList) {
                    fetchRecords(false);
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
                    fetchRecords(false);
                }
            }
        });
    });

    // Filtro de edad (select)
    DOM.filterEdad.addEventListener('change', () => {
        state.edadFilter = DOM.filterEdad.value;
        fetchRecords(false);
    });

    // Filtro de orden (select)
    if (DOM.filterOrden) {
        DOM.filterOrden.addEventListener('change', () => {
            state.ordenFilter = DOM.filterOrden.value;
            fetchRecords(false);
        });
    }

    // Filtro de tipo de ubicación (select)
    if (DOM.filterTipoUbicacion) {
        DOM.filterTipoUbicacion.addEventListener('change', () => {
            state.tipoUbicacionFilter = DOM.filterTipoUbicacion.value;
            fetchRecords(false);
        });
    }

    let ubicacionDebounceTimer;
    DOM.filterUbicacion.addEventListener('input', () => {
        state.ubicacionFilter = DOM.filterUbicacion.value.trim();
        clearTimeout(ubicacionDebounceTimer);
        ubicacionDebounceTimer = setTimeout(() => fetchRecords(false), 400);
    });

    // Alternar visualización del listado completo
    DOM.btnToggleList.addEventListener('click', () => {
        state.showingFullList = !state.showingFullList;
        if (state.showingFullList) {
            DOM.searchInput.value = ''; // Limpiar buscador al abrir directorio
            DOM.searchBtnContainer.style.display = 'none';
            fetchRecords(false);
        } else {
            triggerSearchOrListReset();
        }
    });

    // Botón de Paginación "Cargar más"
    DOM.btnLoadMore.addEventListener('click', () => {
        fetchRecords(true); // Cargar siguiente bloque añadiéndolo a la lista
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
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            toggleModal(e.target, false);
        }
    });
}

// Resetea la vista si limpian el buscador o colapsan el listado
function triggerSearchOrListReset() {
    if (!state.showingFullList) {
        DOM.filtersBar.style.display = 'none';
        DOM.cardsGrid.innerHTML = '';
        DOM.loadMoreContainer.style.display = 'none';
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
        fetchRecords(false);
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
            fetchRecords(false);
            
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
            await fetchRecords(false);
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
                fetchRecords(false);
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
                    await fetchRecords(false);
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
            fetchRecords(false);
        }
    } else {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (!error) {
                setAdminState(false);
                showToast('Sesión administrativa cerrada.', 'success');
                await loadStats();
                
                if (DOM.searchInput.value.trim() || state.showingFullList) {
                    await fetchRecords(false);
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
            await fetchRecords(false);
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
            await fetchRecords(false);
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
            await fetchRecords(false);
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
            await fetchRecords(false);
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
                    await fetchRecords(false);
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
                    await fetchRecords(false);
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
