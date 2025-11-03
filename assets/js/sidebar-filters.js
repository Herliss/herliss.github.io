/**
 * Sidebar Filters - Sistema de Filtrado Simplificado
 * Solo 2 filtros asociados: Relevancia Mínima + Publicadas en los últimos
 * 
 * Autor: Herliss Briceño
 * Fecha: Noviembre 2025
 * Versión: 3.0 - Simplificado para Sidebar
 */

'use strict';

// ============================================
// VARIABLES GLOBALES
// ============================================
let sidebarFiltersActive = false;
let currentSidebarFilters = {
    minRelevanceScore: 0,
    maxDaysOld: 7
};

// Debounce para evitar aplicar filtros demasiado rápido
let filterTimeout = null;

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Inicializa los filtros del sidebar
 */
function initSidebarFilters() {
    console.log('🎛️ Inicializando filtros del sidebar...');
    
    // Obtener elementos
    const relevanceSlider = document.getElementById('sidebar-filter-relevance');
    const relevanceValue = document.getElementById('sidebar-relevance-value');
    const daysSelect = document.getElementById('sidebar-filter-days');
    const clearBtn = document.getElementById('sidebar-clear-filters');
    
    if (!relevanceSlider || !daysSelect) {
        console.warn('⚠️ Elementos de filtros del sidebar no encontrados');
        return;
    }
    
    // Event listener para slider de relevancia
    relevanceSlider.addEventListener('input', function() {
        const value = this.value;
        if (relevanceValue) {
            relevanceValue.textContent = value + '%';
        }
        
        // Aplicar filtros automáticamente con debounce
        debouncedApplyFilters();
    });
    
    // Event listener para select de días
    daysSelect.addEventListener('change', function() {
        // Aplicar filtros inmediatamente al cambiar fecha
        applySidebarFilters();
    });
    
    // Event listener para botón de limpiar
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            clearSidebarFilters();
        });
    }
    
    console.log('✅ Filtros del sidebar inicializados');
}

// ============================================
// APLICAR FILTROS CON DEBOUNCE
// ============================================

/**
 * Aplica filtros con debounce para evitar ejecuciones excesivas
 */
function debouncedApplyFilters() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
        applySidebarFilters();
    }, 300); // 300ms de delay
}

// ============================================
// APLICAR FILTROS
// ============================================

/**
 * Aplica los filtros del sidebar automáticamente
 */
function applySidebarFilters() {
    console.log('🔍 Aplicando filtros del sidebar...');
    
    // Verificar que tenemos datos
    if (!window.unfilteredNewsData || !window.AdvancedFilters) {
        console.warn('⚠️ Datos de noticias no disponibles');
        return;
    }
    
    // Capturar valores actuales
    const relevanceSlider = document.getElementById('sidebar-filter-relevance');
    const daysSelect = document.getElementById('sidebar-filter-days');
    
    const minRelevance = parseInt(relevanceSlider.value);
    const maxDays = daysSelect.value;
    
    // Actualizar filtros actuales
    currentSidebarFilters = {
        minRelevanceScore: minRelevance,
        maxDaysOld: maxDays === 'all' ? null : parseInt(maxDays)
    };
    
    console.log('📋 Filtros:', currentSidebarFilters);
    
    // Determinar si hay filtros activos
    const hasActiveFilters = minRelevance > 0 || maxDays !== '7';
    sidebarFiltersActive = hasActiveFilters;
    
    // Aplicar filtros usando la librería AdvancedFilters
    let filtered = window.unfilteredNewsData;
    
    if (hasActiveFilters) {
        // Construir objeto de filtros para AdvancedFilters
        const filterConfig = {
            minRelevanceScore: currentSidebarFilters.minRelevanceScore,
            maxDaysOld: currentSidebarFilters.maxDaysOld,
            // Resto de filtros en false/default
            onlyWithCVE: false,
            minCVSS: 0,
            onlyWithPatch: false,
            onlyWithIOCs: false,
            onlyOfficialSources: false,
            onlyRegulatory: false,
            severityLevel: 'all'
        };
        
        filtered = window.AdvancedFilters.applyAdvancedFilters(
            window.unfilteredNewsData,
            filterConfig
        );
        
        console.log(`📊 Resultados: ${filtered.length} de ${window.unfilteredNewsData.length} noticias`);
    }
    
    // Renderizar noticias filtradas
    if (typeof window.renderNews === 'function') {
        window.renderNews(filtered);
    }
    
    // Actualizar contador
    updateSidebarFilterCount(filtered.length, window.unfilteredNewsData.length);
    
    // Actualizar UI
    updateSidebarFilterUI(hasActiveFilters);
    
    // Emitir evento
    emitSidebarFilterEvent(currentSidebarFilters, filtered);
    
    // Feedback visual
    showFilterFeedback(hasActiveFilters, filtered.length);
}

// ============================================
// LIMPIAR FILTROS
// ============================================

/**
 * Limpia todos los filtros del sidebar
 */
function clearSidebarFilters() {
    console.log('🧹 Limpiando filtros del sidebar...');
    
    // Resetear controles
    const relevanceSlider = document.getElementById('sidebar-filter-relevance');
    const relevanceValue = document.getElementById('sidebar-relevance-value');
    const daysSelect = document.getElementById('sidebar-filter-days');
    
    if (relevanceSlider) relevanceSlider.value = 0;
    if (relevanceValue) relevanceValue.textContent = '0%';
    if (daysSelect) daysSelect.value = '7';
    
    // Resetear filtros
    currentSidebarFilters = {
        minRelevanceScore: 0,
        maxDaysOld: 7
    };
    
    sidebarFiltersActive = false;
    
    // Restaurar todas las noticias
    if (window.unfilteredNewsData && typeof window.renderNews === 'function') {
        window.renderNews(window.unfilteredNewsData);
    }
    
    // Actualizar contador
    if (window.unfilteredNewsData) {
        updateSidebarFilterCount(
            window.unfilteredNewsData.length,
            window.unfilteredNewsData.length
        );
    }
    
    // Actualizar UI
    updateSidebarFilterUI(false);
    
    console.log('✅ Filtros limpiados');
}

// ============================================
// ACTUALIZAR UI
// ============================================

/**
 * Actualiza el contador de noticias filtradas
 */
function updateSidebarFilterCount(filtered, total) {
    const countElement = document.getElementById('sidebar-filtered-count');
    if (countElement) {
        countElement.textContent = filtered;
        
        // Añadir contexto si hay filtros activos
        const infoText = countElement.parentElement;
        if (sidebarFiltersActive && filtered !== total) {
            infoText.innerHTML = `Mostrando: <strong id="sidebar-filtered-count">${filtered}</strong> de ${total} noticias`;
        } else {
            infoText.innerHTML = `Mostrando: <strong id="sidebar-filtered-count">${filtered}</strong> noticias`;
        }
    }
}

/**
 * Actualiza la UI visual del widget
 */
function updateSidebarFilterUI(hasActiveFilters) {
    const widget = document.querySelector('.sidebar-filters-widget');
    const clearBtn = document.getElementById('sidebar-clear-filters');
    
    if (widget) {
        if (hasActiveFilters) {
            widget.classList.add('has-active-filters');
        } else {
            widget.classList.remove('has-active-filters');
        }
    }
    
    // Mostrar/ocultar botón de limpiar
    if (clearBtn) {
        clearBtn.style.display = hasActiveFilters ? 'flex' : 'none';
    }
}

/**
 * Muestra feedback visual al aplicar filtros
 */
function showFilterFeedback(hasFilters, newsCount) {
    const widget = document.querySelector('.sidebar-filters-widget');
    
    if (widget && hasFilters) {
        // Animación de confirmación
        widget.classList.add('filter-applied');
        setTimeout(() => {
            widget.classList.remove('filter-applied');
        }, 300);
    }
}

// ============================================
// EVENTOS PERSONALIZADOS
// ============================================

/**
 * Emite evento cuando se aplican filtros
 */
function emitSidebarFilterEvent(filters, results) {
    const event = new CustomEvent('sidebarFiltersApplied', {
        detail: {
            filters: filters,
            results: results,
            count: results.length,
            timestamp: new Date()
        }
    });
    document.dispatchEvent(event);
    console.log('📢 Evento sidebarFiltersApplied emitido');
}

// ============================================
// INTEGRACIÓN CON SISTEMA DE NOTICIAS
// ============================================

/**
 * Escucha cuando las noticias se cargan
 */
document.addEventListener('newsLoaded', function(event) {
    console.log('📢 Evento newsLoaded recibido en SidebarFilters');
    
    if (window.unfilteredNewsData) {
        updateSidebarFilterCount(
            window.unfilteredNewsData.length,
            window.unfilteredNewsData.length
        );
        console.log(`✅ Contador inicializado: ${window.unfilteredNewsData.length} noticias`);
    }
    
    // Si hay filtros activos, reaplicar
    if (sidebarFiltersActive) {
        setTimeout(() => {
            applySidebarFilters();
        }, 500);
    }
});

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎛️ Módulo Sidebar Filters cargado');
    
    // Esperar un poco para asegurar que todo esté listo
    setTimeout(() => {
        initSidebarFilters();
    }, 500);
});

// ============================================
// API GLOBAL
// ============================================
window.SidebarFilters = {
    apply: applySidebarFilters,
    clear: clearSidebarFilters,
    getCurrentFilters: () => currentSidebarFilters,
    isActive: () => sidebarFiltersActive
};

console.log('✅ SidebarFilters API expuesta globalmente');