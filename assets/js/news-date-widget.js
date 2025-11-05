/**
 * Date Archive Widget - VERSIÓN FINAL v3.1
 * 
 * CORRECCIONES CRÍTICAS:
 * ✅ Sincronización perfecta con filtros del sidebar
 * ✅ Efecto acordeón correcto (cierra todos los meses de todos los años)
 * ✅ Usa currentFilteredNews para mostrar solo las noticias filtradas
 * ✅ Actualización automática cuando se aplican filtros
 * 
 * Autor: Herliss Briceño
 * Fecha: Noviembre 2025
 */

'use strict';

// ============================================
// CONFIGURACIÓN
// ============================================
const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Estado del widget - CRÍTICO para sincronización
let lastRenderedCount = 0;
let currentFilteredNews = null; // Guardar las noticias actualmente filtradas

// ============================================
// GENERAR ESTRUCTURA DE ARCHIVO POR FECHA
// ============================================
function generateDateArchive(articles) {
    const archive = {};
    
    articles.forEach(article => {
        const date = new Date(article.pubDate);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        
        // Inicializar año si no existe
        if (!archive[year]) {
            archive[year] = {
                total: 0,
                months: {}
            };
        }
        
        // Inicializar mes si no existe
        if (!archive[year].months[month]) {
            archive[year].months[month] = {
                name: MONTH_NAMES[month],
                count: 0,
                articles: []
            };
        }
        
        // Agregar artículo
        archive[year].months[month].count++;
        archive[year].months[month].articles.push(article);
        archive[year].total++;
    });
    
    return archive;
}

// ============================================
// RENDERIZAR WIDGET DE ARCHIVO CON ACORDEÓN
// ============================================
function renderDateArchiveWidget(articles) {
    const container = document.getElementById('date-archive-container');
    
    if (!container) {
        console.warn('⚠️ Contenedor date-archive-container no encontrado');
        return;
    }
    
    // CRÍTICO: Guardar las noticias que estamos renderizando
    currentFilteredNews = articles;
    
    // Log para diagnóstico
    console.log(`📅 Date Widget: Renderizando ${articles ? articles.length : 0} noticias`);
    
    // Si no hay artículos, mostrar estado vacío
    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="archive-empty" style="text-align: center; padding: 2rem; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p>No hay noticias disponibles con los filtros actuales</p>
            </div>
        `;
        lastRenderedCount = 0;
        return;
    }
    
    // Actualizar contador
    lastRenderedCount = articles.length;
    
    // Generar estructura de archivo
    const archive = generateDateArchive(articles);
    
    // Ordenar años descendentemente
    const years = Object.keys(archive).sort((a, b) => b - a);
    
    if (years.length === 0) {
        container.innerHTML = `
            <div class="archive-empty" style="text-align: center; padding: 2rem; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p>No hay noticias disponibles</p>
            </div>
        `;
        return;
    }
    
    // Construir HTML con ACORDEÓN
    let html = '<div class="archive-accordion">';
    
    years.forEach((year, yearIndex) => {
        const yearData = archive[year];
        const isOpen = yearIndex === 0; // Primer año abierto por defecto
        const yearId = `year-${year}`;
        
        html += `
            <div class="archive-year" data-year="${year}">
                <button class="archive-year-header" 
                        onclick="toggleYear('${yearId}')"
                        aria-expanded="${isOpen}"
                        style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 1rem; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 0.5rem;">
                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="toggle-icon" id="icon-${yearId}" style="transition: transform 0.3s ease; display: inline-block; transform: rotate(${isOpen ? '0deg' : '-90deg'});">▼</span>
                        <span>📅 ${year}</span>
                    </span>
                    <span style="background: rgba(255,255,255,0.3); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">
                        Total: ${yearData.total}
                    </span>
                </button>
                
                <div class="archive-months" 
                     id="${yearId}"
                     style="display: ${isOpen ? 'block' : 'none'}; padding-left: 0.5rem; margin-bottom: 1rem; border-left: 3px solid #3498db; transition: all 0.3s ease;">
        `;
        
        // Ordenar meses descendentemente (más reciente primero)
        const months = Object.keys(yearData.months)
            .sort((a, b) => b - a);
        
        // Solo el primer mes abierto por defecto
        months.forEach((monthIndex, idx) => {
            const monthData = yearData.months[monthIndex];
            const monthId = `month-${year}-${monthIndex}`;
            const isMonthOpen = idx === 0 && isOpen; // Solo primer mes del primer año abierto
            
            html += `
                <div class="archive-month" data-month="${monthIndex}">
                    <button class="archive-month-header" 
                            onclick="toggleMonth('${yearId}', '${monthId}')"
                            aria-expanded="${isMonthOpen}"
                            style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: white; border: none; border-left: 3px solid #3498db; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; margin-bottom: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"
                            onmouseover="this.style.background='#f8f9fa'; this.style.transform='translateX(3px)'"
                            onmouseout="this.style.background='white'; this.style.transform='translateX(0)'">
                        <span style="display: flex; align-items: center; gap: 0.5rem; color: #2c3e50; font-weight: 500;">
                            <span class="month-toggle-icon" id="icon-${monthId}" style="transition: transform 0.3s ease; display: inline-block; transform: rotate(${isMonthOpen ? '0deg' : '-90deg'});">▶</span>
                            ${monthData.name}
                        </span>
                        <span style="background: #ecf0f1; color: #34495e; padding: 0.25rem 0.6rem; border-radius: 10px; font-size: 0.8rem; font-weight: 600;">
                            Total: ${monthData.count}
                        </span>
                    </button>
                    
                    <div class="archive-month-content" 
                         id="${monthId}"
                         style="display: ${isMonthOpen ? 'block' : 'none'}; padding: 0.5rem 0 0.5rem 1.5rem; transition: all 0.3s ease;">
                        <button onclick="filterByMonth('${year}', '${monthIndex}')"
                                style="width: 100%; padding: 0.75rem 1rem; background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                            📰 Ver ${monthData.count} noticia${monthData.count !== 1 ? 's' : ''} de ${monthData.name}
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Actualizar contenedor
    container.innerHTML = html;
    
    console.log(`✅ Date Widget renderizado: ${articles.length} noticias, ${years.length} años`);
}

// ============================================
// FUNCIONES DE ACORDEÓN - CORREGIDAS
// ============================================

/**
 * Toggle año (expandir/colapsar)
 */
function toggleYear(yearId) {
    const yearContent = document.getElementById(yearId);
    const icon = document.getElementById(`icon-${yearId}`);
    
    if (!yearContent || !icon) return;
    
    const isOpen = yearContent.style.display === 'block';
    
    // CORRECCIÓN: Cerrar todos los años
    document.querySelectorAll('.archive-months').forEach(el => {
        el.style.display = 'none';
    });
    
    // Resetear todos los iconos de año
    document.querySelectorAll('[id^="icon-year-"]').forEach(el => {
        el.style.transform = 'rotate(-90deg)';
    });
    
    // Si estaba cerrado, abrirlo
    if (!isOpen) {
        yearContent.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
        
        // Abrir el primer mes automáticamente
        const firstMonth = yearContent.querySelector('.archive-month-content');
        const firstMonthIcon = yearContent.querySelector('.month-toggle-icon');
        if (firstMonth) {
            firstMonth.style.display = 'block';
        }
        if (firstMonthIcon) {
            firstMonthIcon.style.transform = 'rotate(0deg)';
        }
    }
}

/**
 * Toggle mes (acordeón - CORRECCIÓN: cierra todos los meses de todos los años)
 */
function toggleMonth(yearId, monthId) {
    const monthContent = document.getElementById(monthId);
    const icon = document.getElementById(`icon-${monthId}`);
    
    if (!monthContent || !icon) return;
    
    const isOpen = monthContent.style.display === 'block';
    
    // CORRECCIÓN CRÍTICA: Cerrar TODOS los meses de TODOS los años
    document.querySelectorAll('.archive-month-content').forEach(el => {
        el.style.display = 'none';
    });
    
    // Resetear TODOS los iconos de meses
    document.querySelectorAll('.month-toggle-icon').forEach(el => {
        el.style.transform = 'rotate(-90deg)';
    });
    
    // Si estaba cerrado, abrirlo
    if (!isOpen) {
        monthContent.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
    }
}

/**
 * Filtrar noticias por mes - CORRECCIÓN: usa currentFilteredNews
 */
function filterByMonth(year, month) {
    console.log(`🔍 Filtrando por: ${MONTH_NAMES[month]} ${year}`);
    
    // CORRECCIÓN: Usar currentFilteredNews en lugar de unfilteredNewsData
    const sourceData = currentFilteredNews || window.newsData || window.unfilteredNewsData;
    
    if (!sourceData) {
        console.warn('⚠️ No hay datos para filtrar');
        return;
    }
    
    // Filtrar noticias por año y mes
    const filtered = sourceData.filter(article => {
        const date = new Date(article.pubDate);
        return date.getFullYear() === parseInt(year) && 
               date.getMonth() === parseInt(month);
    });
    
    console.log(`✅ Encontradas ${filtered.length} noticias para ${MONTH_NAMES[month]} ${year}`);
    
    // Renderizar noticias filtradas
    if (typeof window.renderNews === 'function') {
        window.renderNews(filtered);
    }
    
    // Scroll suave al contenedor de noticias
    const newsContainer = document.getElementById('news-container');
    if (newsContainer) {
        newsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Mostrar feedback visual
    showFilterFeedback(`${MONTH_NAMES[month]} ${year}`, filtered.length);
}

/**
 * Mostrar feedback visual cuando se filtra
 */
function showFilterFeedback(period, count) {
    // Crear toast notification
    const toast = document.createElement('div');
    toast.id = 'date-filter-toast';
    toast.innerHTML = `
        <div style="position: fixed; top: 80px; right: 20px; background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999; animation: slideInRight 0.3s ease-out;">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">✅ Filtrado aplicado</div>
            <div style="font-size: 0.875rem; opacity: 0.95;">${count} noticia${count !== 1 ? 's' : ''} de ${period}</div>
        </div>
    `;
    
    // Remover toast anterior si existe
    const oldToast = document.getElementById('date-filter-toast');
    if (oldToast) oldToast.remove();
    
    document.body.appendChild(toast);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// ACTUALIZACIÓN AUTOMÁTICA - MEJORADA
// ============================================

function updateDateWidget() {
    // CORRECCIÓN CRÍTICA: Detectar qué datos están actualmente en pantalla
    let articlesToRender;
    
    // Si hay filtros activos del sidebar, usar esos resultados
    if (window.SidebarFilters && window.SidebarFilters.isActive && window.SidebarFilters.isActive()) {
        console.log('🔍 Date Widget: Detectados filtros activos del sidebar');
        articlesToRender = window.newsData; // newsData ya contiene los filtrados
    } else {
        // Sin filtros, usar todos
        articlesToRender = window.unfilteredNewsData || window.newsData;
    }
    
    if (articlesToRender && articlesToRender.length > 0) {
        if (articlesToRender.length !== lastRenderedCount) {
            console.log(`🔄 Date Widget: Actualizando de ${lastRenderedCount} a ${articlesToRender.length} noticias`);
            renderDateArchiveWidget(articlesToRender);
        }
    }
}

// ============================================
// INICIALIZACIÓN Y EVENTOS - MEJORADOS
// ============================================

function tryInitialize() {
    const articles = window.unfilteredNewsData || window.newsData;
    
    if (articles && articles.length > 0) {
        console.log(`✅ Date Widget: Inicializando con ${articles.length} noticias`);
        renderDateArchiveWidget(articles);
        return true;
    }
    
    console.log('⏳ Date Widget: Esperando datos...');
    return false;
}

// EVENTOS - CORRECCIÓN: Manejar correctamente los datos filtrados
document.addEventListener('newsLoaded', function(event) {
    console.log('📢 Date Widget: Evento newsLoaded recibido');
    
    if (event.detail && event.detail.articles) {
        renderDateArchiveWidget(event.detail.articles);
    } else {
        const articles = window.unfilteredNewsData || window.newsData;
        if (articles) {
            renderDateArchiveWidget(articles);
        }
    }
});

// CORRECCIÓN CRÍTICA: Actualizar con las noticias filtradas
document.addEventListener('sidebarFiltersApplied', function(event) {
    console.log('🔍 Date Widget: Filtros del sidebar aplicados');
    
    // Esperar un momento para que window.newsData se actualice
    setTimeout(() => {
        if (event.detail && event.detail.results) {
            console.log(`   📊 Renderizando ${event.detail.results.length} noticias filtradas`);
            renderDateArchiveWidget(event.detail.results);
        } else {
            // Fallback
            updateDateWidget();
        }
    }, 100);
});

document.addEventListener('advancedFiltersApplied', function(event) {
    console.log('🔬 Date Widget: Filtros avanzados aplicados');
    
    setTimeout(() => {
        if (event.detail && event.detail.results) {
            renderDateArchiveWidget(event.detail.results);
        } else {
            updateDateWidget();
        }
    }, 100);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 Date Widget v3.1: DOM cargado');
    
    if (!tryInitialize()) {
        setTimeout(tryInitialize, 500);
    }
});

// Polling como fallback
let pollAttempts = 0;
const maxPollAttempts = 20;
const pollInterval = setInterval(function() {
    pollAttempts++;
    
    const articles = window.unfilteredNewsData || window.newsData;
    
    if (articles && articles.length > 0) {
        console.log('✅ Date Widget: Datos detectados via polling');
        clearInterval(pollInterval);
        renderDateArchiveWidget(articles);
    } else if (pollAttempts >= maxPollAttempts) {
        console.warn('⚠️ Date Widget: Timeout después de 20 segundos');
        clearInterval(pollInterval);
    }
}, 1000);

// Observer para cambios en newsData - CORRECCIÓN: Detectar filtros
if (window.newsData) {
    let lastCount = 0;
    setInterval(() => {
        if (window.newsData && window.newsData.length !== lastCount) {
            lastCount = window.newsData.length;
            console.log(`🔄 Date Widget: Detectado cambio (${lastCount} noticias)`);
            
            // CORRECCIÓN: Usar newsData actualizado (puede estar filtrado)
            renderDateArchiveWidget(window.newsData);
        }
    }, 2000);
}

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.renderDateArchiveWidget = renderDateArchiveWidget;
window.updateDateWidget = updateDateWidget;
window.toggleYear = toggleYear;
window.toggleMonth = toggleMonth;
window.filterByMonth = filterByMonth;

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .archive-year-header:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
    }
    
    .archive-year-header:active {
        transform: translateY(0);
    }
`;
document.head.appendChild(style);

// API Global para widget
window.DateArchiveWidget = {
    render: renderDateArchiveWidget,
    update: updateDateWidget,
    getCurrentFiltered: () => currentFilteredNews
};

console.log('✅ Date Archive Widget v3.1 - SINCRONIZACIÓN PERFECTA cargado');