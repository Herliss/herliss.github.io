/**
 * UI Filters - Sistema de Filtros Avanzados para Noticias de Ciberseguridad
 * Maneja la interacción del usuario con los filtros avanzados de CISO
 * 
 * Autor: Herliss Briceño
 * Fecha: Noviembre 2025
 * Versión: 1.0
 */

'use strict';

// ============================================
// VARIABLES GLOBALES
// ============================================
let currentFilters = {
    onlyWithCVE: false,
    minCVSS: 0,
    onlyWithPatch: false,
    onlyWithIOCs: false,
    onlyOfficialSources: false,
    onlyRegulatory: false,
    severityLevel: 'all',
    minRelevanceScore: 0,
    maxDaysOld: null
};

let filtersActive = false;

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Inicializa todos los event listeners de filtros
 */
function initAdvancedFilters() {
    console.log('🎛️ Inicializando sistema de filtros avanzados...');
    
    // Botones principales
    const applyBtn = document.getElementById('apply-advanced-filters');
    const clearBtn = document.getElementById('clear-advanced-filters');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyAdvancedFilters);
        console.log('✅ Botón "Aplicar Filtros" conectado');
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAdvancedFilters);
        console.log('✅ Botón "Limpiar Filtros" conectado');
    }
    
    // Sliders con actualización en tiempo real del valor mostrado
    initSliders();
    
    // Escuchar cambios en selectores para indicar visualmente que hay cambios pendientes
    initFilterChangeListeners();
    
    console.log('✅ Sistema de filtros avanzados inicializado');
}

/**
 * Inicializa los sliders (CVSS y Relevancia)
 */
function initSliders() {
    // Slider CVSS
    const cvssSlider = document.getElementById('filter-min-cvss');
    const cvssValue = document.getElementById('cvss-value');
    
    if (cvssSlider && cvssValue) {
        cvssSlider.addEventListener('input', function() {
            cvssValue.textContent = parseFloat(this.value).toFixed(1);
        });
        console.log('✅ Slider CVSS conectado');
    }
    
    // Slider Relevancia
    const relevanceSlider = document.getElementById('filter-min-relevance');
    const relevanceValue = document.getElementById('relevance-value');
    
    if (relevanceSlider && relevanceValue) {
        relevanceSlider.addEventListener('input', function() {
            relevanceValue.textContent = this.value + '%';
        });
        console.log('✅ Slider Relevancia conectado');
    }
}

/**
 * Inicializa listeners para detectar cambios en filtros
 */
function initFilterChangeListeners() {
    const filterInputs = document.querySelectorAll(
        '#advanced-filters input[type="checkbox"], ' +
        '#advanced-filters input[type="range"], ' +
        '#advanced-filters select'
    );
    
    filterInputs.forEach(input => {
        input.addEventListener('change', function() {
            // Indicar visualmente que hay cambios pendientes
            highlightApplyButton();
        });
    });
}

/**
 * Resalta el botón de aplicar cuando hay cambios pendientes
 */
function highlightApplyButton() {
    const applyBtn = document.getElementById('apply-advanced-filters');
    if (applyBtn && !filtersActive) {
        applyBtn.style.animation = 'pulse 1s ease-in-out';
        setTimeout(() => {
            if (applyBtn) applyBtn.style.animation = '';
        }, 1000);
    }
}

// ============================================
// APLICAR FILTROS AVANZADOS
// ============================================

/**
 * Aplica los filtros avanzados seleccionados por el usuario
 */
function applyAdvancedFilters() {
    console.log('🔍 Aplicando filtros avanzados...');
    
    // Verificar que tenemos datos
    if (!window.unfilteredNewsData || !window.AdvancedFilters) {
        console.error('❌ Datos de noticias o librería de filtros no disponibles');
        showErrorMessage('Error al aplicar filtros. Datos no disponibles.');
        return;
    }
    
    // Capturar valores de los filtros
    currentFilters = {
        onlyWithCVE: getCheckboxValue('filter-only-cve'),
        minCVSS: getSliderValue('filter-min-cvss'),
        onlyWithPatch: getCheckboxValue('filter-only-patch'),
        onlyWithIOCs: getCheckboxValue('filter-only-iocs'),
        onlyOfficialSources: getCheckboxValue('filter-only-official'),
        onlyRegulatory: getCheckboxValue('filter-only-regulatory'),
        severityLevel: getSelectValue('filter-severity'),
        minRelevanceScore: parseInt(getSliderValue('filter-min-relevance')),
        maxDaysOld: getMaxDaysValue()
    };
    
    console.log('📋 Filtros aplicados:', currentFilters);
    
    // Aplicar filtros usando la librería AdvancedFilters
    try {
        const filtered = window.AdvancedFilters.applyAdvancedFilters(
            window.unfilteredNewsData, 
            currentFilters
        );
        
        console.log(`📊 Resultados: ${filtered.length} de ${window.unfilteredNewsData.length} noticias`);
        
        // Renderizar noticias filtradas
        if (typeof window.renderNews === 'function') {
            window.renderNews(filtered);
        }
        
        // Actualizar contador
        updateFilterCount(filtered.length, window.unfilteredNewsData.length);
        
        // Mostrar banner de filtros activos
        showFilterBanner(filtered.length);
        
        // Marcar que los filtros están activos
        filtersActive = true;
        
        // Emitir evento personalizado
        emitFilterAppliedEvent(currentFilters, filtered);
        
        // Feedback visual
        showSuccessMessage(`Filtros aplicados: ${filtered.length} noticias encontradas`);
        
    } catch (error) {
        console.error('❌ Error al aplicar filtros:', error);
        showErrorMessage('Error al aplicar filtros. Por favor, intenta de nuevo.');
    }
}

// ============================================
// LIMPIAR FILTROS
// ============================================

/**
 * Limpia todos los filtros y restaura las noticias originales
 */
function clearAdvancedFilters() {
    console.log('🧹 Limpiando filtros avanzados...');
    
    // Resetear valores de los checkboxes
    setCheckboxValue('filter-only-cve', false);
    setCheckboxValue('filter-only-patch', false);
    setCheckboxValue('filter-only-iocs', false);
    setCheckboxValue('filter-only-official', false);
    setCheckboxValue('filter-only-regulatory', false);
    
    // Resetear sliders
    setSliderValue('filter-min-cvss', 0);
    setSliderValue('filter-min-relevance', 0);
    
    // Resetear selectores
    setSelectValue('filter-severity', 'all');
    setSelectValue('filter-max-days', '7');
    
    // Resetear valores mostrados
    const cvssValue = document.getElementById('cvss-value');
    const relevanceValue = document.getElementById('relevance-value');
    if (cvssValue) cvssValue.textContent = '0.0';
    if (relevanceValue) relevanceValue.textContent = '0%';
    
    // Resetear filtros internos
    currentFilters = {
        onlyWithCVE: false,
        minCVSS: 0,
        onlyWithPatch: false,
        onlyWithIOCs: false,
        onlyOfficialSources: false,
        onlyRegulatory: false,
        severityLevel: 'all',
        minRelevanceScore: 0,
        maxDaysOld: 7
    };
    
    // Restaurar todas las noticias
    if (window.unfilteredNewsData && typeof window.renderNews === 'function') {
        window.renderNews(window.unfilteredNewsData);
    }
    
    // Actualizar contador
    if (window.unfilteredNewsData) {
        updateFilterCount(window.unfilteredNewsData.length, window.unfilteredNewsData.length);
    }
    
    // Ocultar banner de filtros
    removeFilterBanner();
    
    // Marcar que los filtros están inactivos
    filtersActive = false;
    
    // Feedback visual
    showSuccessMessage('Filtros limpiados. Mostrando todas las noticias.');
    
    console.log('✅ Filtros limpiados exitosamente');
}

// ============================================
// FUNCIONES AUXILIARES - GETTERS
// ============================================

function getCheckboxValue(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

function getSliderValue(id) {
    const element = document.getElementById(id);
    return element ? parseFloat(element.value) : 0;
}

function getSelectValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : 'all';
}

function getMaxDaysValue() {
    const value = getSelectValue('filter-max-days');
    return value === 'all' ? null : parseInt(value);
}

// ============================================
// FUNCIONES AUXILIARES - SETTERS
// ============================================

function setCheckboxValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.checked = value;
}

function setSliderValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function setSelectValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

// ============================================
// UI FEEDBACK
// ============================================

/**
 * Actualiza el contador de noticias filtradas
 */
function updateFilterCount(filtered, total) {
    const countElement = document.getElementById('filtered-count');
    if (countElement) {
        countElement.textContent = filtered;
        
        // Añadir información adicional si hay filtros activos
        if (filtersActive && filtered !== total) {
            countElement.innerHTML = `${filtered} <span style="color: #999; font-weight: 400;">de ${total}</span>`;
        }
    }
}

/**
 * Muestra un banner indicando que hay filtros activos
 */
function showFilterBanner(newsCount) {
    // Remover banner anterior si existe
    removeFilterBanner();
    
    // Crear banner
    const banner = document.createElement('div');
    banner.id = 'active-filters-banner';
    banner.className = 'active-filters-banner';
    banner.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 3px 10px rgba(52, 152, 219, 0.3);
            animation: slideDown 0.3s ease-out;
        ">
            <div>
                <strong>🔍 Filtros Avanzados Activos</strong>
                <span style="opacity: 0.9; margin-left: 1rem; font-size: 0.9rem;">
                    ${newsCount} ${newsCount === 1 ? 'noticia cumple' : 'noticias cumplen'} los criterios
                </span>
            </div>
            <button onclick="UIFilters.clear()" style="
                background: white;
                color: #3498db;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.875rem;
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.05)'" 
               onmouseout="this.style.transform='scale(1)'">
                ✖ Limpiar Filtros
            </button>
        </div>
    `;
    
    // Insertar antes del contenedor de noticias
    const newsContainer = document.getElementById('news-container');
    if (newsContainer && newsContainer.parentNode) {
        newsContainer.parentNode.insertBefore(banner, newsContainer);
    }
    
    // Añadir animación CSS si no existe
    if (!document.getElementById('filter-banner-animation')) {
        const style = document.createElement('style');
        style.id = 'filter-banner-animation';
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Remueve el banner de filtros activos
 */
function removeFilterBanner() {
    const banner = document.getElementById('active-filters-banner');
    if (banner) {
        banner.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => banner.remove(), 300);
    }
}

/**
 * Muestra mensaje de éxito temporal
 */
function showSuccessMessage(message) {
    showTemporaryMessage(message, 'success');
}

/**
 * Muestra mensaje de error temporal
 */
function showErrorMessage(message) {
    showTemporaryMessage(message, 'error');
}

/**
 * Muestra un mensaje temporal en pantalla
 */
function showTemporaryMessage(message, type = 'success') {
    // Crear elemento de mensaje
    const msgElement = document.createElement('div');
    msgElement.className = `temp-message temp-message-${type}`;
    msgElement.textContent = message;
    
    // Estilos
    const bgColor = type === 'success' ? '#27ae60' : '#e74c3c';
    msgElement.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    document.body.appendChild(msgElement);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        msgElement.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => msgElement.remove(), 300);
    }, 3000);
    
    // Añadir animaciones CSS si no existen
    if (!document.getElementById('temp-message-animations')) {
        const style = document.createElement('style');
        style.id = 'temp-message-animations';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// EVENTOS PERSONALIZADOS
// ============================================

/**
 * Emite evento cuando se aplican filtros
 */
function emitFilterAppliedEvent(filters, results) {
    const event = new CustomEvent('advancedFiltersApplied', {
        detail: {
            filters: filters,
            results: results,
            count: results.length,
            timestamp: new Date()
        }
    });
    document.dispatchEvent(event);
    console.log('📢 Evento advancedFiltersApplied emitido');
}

// ============================================
// LISTENER PARA NOTICIAS CARGADAS
// ============================================

/**
 * Escucha cuando las noticias se cargan para inicializar el contador
 */
document.addEventListener('newsLoaded', function(event) {
    console.log('📢 Evento newsLoaded recibido en UIFilters');
    
    if (window.unfilteredNewsData) {
        updateFilterCount(window.unfilteredNewsData.length, window.unfilteredNewsData.length);
        console.log(`✅ Contador inicializado: ${window.unfilteredNewsData.length} noticias`);
    }
});

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎛️ Módulo UI Filters cargado');
    
    // Esperar un poco para asegurar que todo esté listo
    setTimeout(() => {
        initAdvancedFilters();
    }, 500);
});

// ============================================
// API GLOBAL
// ============================================
window.UIFilters = {
    apply: applyAdvancedFilters,
    clear: clearAdvancedFilters,
    getCurrentFilters: () => currentFilters,
    isActive: () => filtersActive
};

console.log('✅ UIFilters API expuesta globalmente');