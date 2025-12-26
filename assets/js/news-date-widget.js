/**
 * Date Archive Widget - VERSIÓN 4.4 CORREGIDA
 * 
 * SOLUCIÓN: Usa data-news-link en lugar de data-news-id
 * Pasa el link original para búsqueda directa
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 */

'use strict';

// ============================================
// CONFIGURACIÓN
// ============================================
const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Estado del widget
let lastRenderedCount = 0;
let currentFilteredNews = null;

// ============================================
// GENERAR ESTRUCTURA DE ARCHIVO POR FECHA
// ============================================
function generateDateArchive(articles) {
    const archive = {};
    
    articles.forEach((article, index) => {
        const date = new Date(article.pubDate);
        
        // Validar fecha
        if (isNaN(date.getTime())) {
            console.warn(`Fecha inválida en artículo ${index}:`, article.pubDate);
            return;
        }
        
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
    
    console.log(`📅 Date Widget v4.4: Renderizando ${articles ? articles.length : 0} noticias`);
    
    // Guardar las noticias que estamos renderizando
    currentFilteredNews = articles;
    
    // Si no hay artículos, mostrar estado vacío
    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="archive-empty" style="text-align: center; padding: 2rem; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p style="font-size: 0.875rem;">No hay noticias disponibles</p>
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
            <div class="archive-empty" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <p style="font-size: 0.875rem;">Error al procesar fechas</p>
            </div>
        `;
        return;
    }
    
    // CONSTRUIR HTML
    let html = '';
    
    years.forEach((year, yearIndex) => {
        const yearData = archive[year];
        const isYearOpen = yearIndex === 0;
        const yearId = `year-${year}`;
        
        console.log(`   📅 Año ${year}: ${Object.keys(yearData.months).length} meses, ${yearData.total} noticias`);
        
        // HEADER DEL AÑO
        html += `
            <div style="margin-bottom: 1rem;">
                <button 
                    onclick="toggleYear('${yearId}')"
                    style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 1rem; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 0.5rem;">
                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                        <span id="icon-${yearId}" style="transition: transform 0.3s ease; display: inline-block; transform: rotate(${isYearOpen ? '90deg' : '0deg'});">▶</span>
                        <span>${year}</span>
                    </span>
                    <span style="background: rgba(255,255,255,0.3); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">
                        Total: ${yearData.total}
                    </span>
                </button>
        `;
        
        // CONTENEDOR DE MESES
        html += `<div id="${yearId}" style="display: ${isYearOpen ? 'block' : 'none'}; padding-left: 0.5rem; margin-bottom: 0.5rem; border-left: 3px solid #3498db;">`;
        
        // Ordenar meses descendentemente
        const months = Object.keys(yearData.months).sort((a, b) => b - a);
        
        months.forEach((monthIndex, idx) => {
            const monthData = yearData.months[monthIndex];
            const monthId = `month-${year}-${monthIndex}`;
            const isMonthOpen = idx === 0 && isYearOpen;
            
            // HEADER DEL MES
            html += `
                <div style="margin-bottom: 0.5rem;">
                    <button 
                        onclick="toggleMonth('${monthId}')"
                        style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: white; border: 1px solid #e0e0e0; border-left: 3px solid #3498db; border-radius: 6px; cursor: pointer; margin-bottom: 0.5rem;">
                        <span style="display: flex; align-items: center; gap: 0.5rem; color: #2c3e50; font-weight: 500;">
                            <span id="icon-${monthId}" style="transition: transform 0.3s ease; font-size: 0.75rem; transform: rotate(${isMonthOpen ? '90deg' : '0deg'});">▶</span>
                            ${monthData.name}
                        </span>
                        <span style="background: #ecf0f1; color: #34495e; padding: 0.25rem 0.6rem; border-radius: 10px; font-size: 0.8rem; font-weight: 600;">
                            Total: ${monthData.count}
                        </span>
                    </button>
            `;
            
            // LISTA DE NOTICIAS - MODIFICADO: USA data-news-link
            html += `<div id="${monthId}" class="month-news-list" style="display: ${isMonthOpen ? 'block' : 'none'}; padding: 0.5rem 0 0.5rem 1rem; max-height: 400px; overflow-y: auto;">`;
            html += '<ul style="list-style: none; padding: 0; margin: 0;">';
            
            // Artículos del mes
            monthData.articles
                .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
                .forEach(article => {
                    // Usar titleEs si existe, sino usar title original
                    const displayTitleSource = article.titleEs || article.title;
                    
                    // Truncar título
                    const maxLength = 60;
                    let displayTitle = displayTitleSource;
                    if (displayTitle.length > maxLength) {
                        displayTitle = displayTitle.substring(0, maxLength) + '...';
                    }
                    
                    // CRÍTICO: Usar data-news-link en lugar de data-news-id
                    html += `
                        <li style="margin-bottom: 0.5rem;">
                            <a href="#" 
                               data-news-link="${article.link}"
                               class="news-detail-link"
                               style="display: block; padding: 0.625rem; background: #f8f9fa; border-radius: 6px; text-decoration: none; color: #2c3e50; font-size: 0.8rem; line-height: 1.4; transition: all 0.3s ease; border-left: 2px solid transparent;"
                               onmouseover="this.style.background='#e9ecef'; this.style.borderLeftColor='#3498db'; this.style.paddingLeft='0.875rem'"
                               onmouseout="this.style.background='#f8f9fa'; this.style.borderLeftColor='transparent'; this.style.paddingLeft='0.625rem'"
                               title="${displayTitleSource}">
                                <span style="font-weight: 500;">${displayTitle}</span>
                            </a>
                        </li>
                    `;
                });
            
            html += '</ul>';
            html += '</div>'; // Cerrar lista de noticias
            html += '</div>'; // Cerrar mes
        });
        
        html += '</div>'; // Cerrar contenedor de meses
        html += '</div>'; // Cerrar año
    });
    
    // Actualizar contenedor
    container.innerHTML = html;
    
    // NUEVO: Adjuntar event listeners
    attachNewsDetailListeners();
    
    // Emitir evento personalizado
    const event = new CustomEvent('dateArchiveRendered', {
        detail: {
            articles: articles,
            count: articles.length
        }
    });
    document.dispatchEvent(event);
    
    console.log(`✅ Widget renderizado: ${articles.length} noticias, ${years.length} año(s)`);
    
    // FORZAR RECÁLCULO DEL DOM
    container.offsetHeight;
}

// ============================================
// NUEVO: ADJUNTAR LISTENERS PARA DETALLE
// ============================================

/**
 * Adjunta event listeners a todos los links de noticias
 */
function attachNewsDetailListeners() {
    const newsLinks = document.querySelectorAll('.news-detail-link');
    
    newsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const newsLink = this.getAttribute('data-news-link');
            
            if (newsLink && window.NewsDetailView && window.NewsDetailView.show) {
                console.log(`🔗 Click en noticia: ${newsLink.substring(0, 50)}...`);
                window.NewsDetailView.show(newsLink);
            } else {
                console.warn('⚠️ NewsDetailView no disponible o link vacío');
            }
        });
    });
    
    console.log(`✅ ${newsLinks.length} links de detalle conectados`);
}

// ============================================
// FUNCIONES DE ACORDEÓN
// ============================================

function toggleYear(yearId) {
    const yearContent = document.getElementById(yearId);
    const icon = document.getElementById(`icon-${yearId}`);
    
    if (!yearContent || !icon) {
        console.warn('Elemento no encontrado:', yearId);
        return;
    }
    
    const isCurrentlyOpen = yearContent.style.display !== 'none';
    
    if (isCurrentlyOpen) {
        yearContent.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    } else {
        yearContent.style.display = 'block';
        icon.style.transform = 'rotate(90deg)';
    }
}

function toggleMonth(monthId) {
    const monthContent = document.getElementById(monthId);
    const icon = document.getElementById(`icon-${monthId}`);
    
    if (!monthContent || !icon) {
        console.warn('Elemento no encontrado:', monthId);
        return;
    }
    
    const isCurrentlyOpen = monthContent.style.display !== 'none';
    
    if (isCurrentlyOpen) {
        monthContent.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    } else {
        // CERRAR TODOS LOS DEMÁS MESES PRIMERO
        document.querySelectorAll('[id^="month-"]').forEach(el => {
            if (el.id.startsWith('month-') && el.id !== monthId) {
                el.style.display = 'none';
                const elIcon = document.getElementById(`icon-${el.id}`);
                if (elIcon) elIcon.style.transform = 'rotate(0deg)';
            }
        });
        
        // Abrir mes seleccionado
        monthContent.style.display = 'block';
        icon.style.transform = 'rotate(90deg)';
    }
}

// ============================================
// ACTUALIZACIÓN AUTOMÁTICA
// ============================================

function updateDateWidget() {
    let articlesToRender;
    
    if (window.SidebarFilters && window.SidebarFilters.isActive && window.SidebarFilters.isActive()) {
        articlesToRender = window.newsData;
    } else {
        articlesToRender = window.unfilteredNewsData || window.newsData;
    }
    
    if (articlesToRender && articlesToRender.length > 0) {
        if (articlesToRender.length !== lastRenderedCount) {
            console.log(`🔄 Actualizando: ${lastRenderedCount} → ${articlesToRender.length} noticias`);
            renderDateArchiveWidget(articlesToRender);
        }
    }
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================

function tryInitialize() {
    const articles = window.unfilteredNewsData || window.newsData;
    
    if (articles && articles.length > 0) {
        console.log(`✅ Inicializando con ${articles.length} noticias`);
        renderDateArchiveWidget(articles);
        return true;
    }
    
    console.log('⏳ Esperando datos...');
    return false;
}

document.addEventListener('newsLoaded', function(event) {
    console.log('📢 Evento newsLoaded recibido');
    
    if (event.detail && event.detail.articles) {
        renderDateArchiveWidget(event.detail.articles);
    } else {
        const articles = window.unfilteredNewsData || window.newsData;
        if (articles) {
            renderDateArchiveWidget(articles);
        }
    }
});

document.addEventListener('sidebarFiltersApplied', function(event) {
    console.log('🔍 Filtros del sidebar aplicados');
    
    setTimeout(() => {
        if (event.detail && event.detail.results) {
            renderDateArchiveWidget(event.detail.results);
        } else {
            updateDateWidget();
        }
    }, 100);
});

document.addEventListener('advancedFiltersApplied', function(event) {
    console.log('🔬 Filtros avanzados aplicados');
    
    setTimeout(() => {
        if (event.detail && event.detail.results) {
            renderDateArchiveWidget(event.detail.results);
        } else {
            updateDateWidget();
        }
    }, 100);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 Date Widget v4.4 CORREGIDO - Búsqueda por link');
    
    if (!tryInitialize()) {
        setTimeout(tryInitialize, 500);
    }
});

// Polling
let pollAttempts = 0;
const maxPollAttempts = 20;
const pollInterval = setInterval(function() {
    pollAttempts++;
    
    const articles = window.unfilteredNewsData || window.newsData;
    
    if (articles && articles.length > 0) {
        console.log('✅ Datos detectados via polling');
        clearInterval(pollInterval);
        renderDateArchiveWidget(articles);
    } else if (pollAttempts >= maxPollAttempts) {
        console.warn('⚠️ Timeout después de 20 segundos');
        clearInterval(pollInterval);
    }
}, 1000);

// Observer
if (window.newsData) {
    let lastCount = 0;
    setInterval(() => {
        if (window.newsData && window.newsData.length !== lastCount) {
            lastCount = window.newsData.length;
            console.log(`🔄 Cambio detectado: ${lastCount} noticias`);
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

// Estilos adicionales
const style = document.createElement('style');
style.textContent = `
    [id^="month-"]::-webkit-scrollbar {
        width: 6px;
    }
    
    [id^="month-"]::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    
    [id^="month-"]::-webkit-scrollbar-thumb {
        background: #3498db;
        border-radius: 10px;
    }
    
    [id^="month-"]::-webkit-scrollbar-thumb:hover {
        background: #2980b9;
    }
`;
document.head.appendChild(style);

window.DateArchiveWidget = {
    render: renderDateArchiveWidget,
    update: updateDateWidget,
    getCurrentFiltered: () => currentFilteredNews
};

console.log('✅ Date Archive Widget v4.4 - BÚSQUEDA CORREGIDA POR LINK');