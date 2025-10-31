/**
 * Date Archive Widget - Lista Simple de Títulos (VERSIÓN CORRECTA)
 * Muestra árbol jerárquico: Año > Mes > Lista de títulos
 * NO muestra tarjetas completas, solo enlaces a noticias
 * 
 * Autor: Herliss Briceño
 * Fecha: Octubre 2025
 */

'use strict';

// ============================================
// CONFIGURACIÓN
// ============================================
const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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
// RENDERIZAR WIDGET DE ARCHIVO (LISTA SIMPLE)
// ============================================
function renderDateArchiveWidget(articles) {
    const container = document.getElementById('date-archive-container');
    
    if (!container) {
        console.warn('⚠️ Contenedor date-archive-container no encontrado');
        return;
    }
    
    // Si no hay artículos, mostrar estado vacío
    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="archive-empty">
                <div class="icon">🔭</div>
                <p>No hay noticias disponibles</p>
            </div>
        `;
        return;
    }
    
    // Generar estructura de archivo
    const archive = generateDateArchive(articles);
    
    // Ordenar años descendentemente
    const years = Object.keys(archive).sort((a, b) => b - a);
    
    if (years.length === 0) {
        container.innerHTML = `
            <div class="archive-empty">
                <div class="icon">🔭</div>
                <p>No hay noticias disponibles</p>
            </div>
        `;
        return;
    }
    
    // Construir HTML - LISTA SIMPLE
    let html = '<ul class="archive-list">';
    
    years.forEach((year, yearIndex) => {
        const yearData = archive[year];
        const activeClass = yearIndex === 0 ? 'active' : ''; // Primer año expandido
        
        html += `
            <li class="archive-year">
                <div class="year-header ${activeClass}" data-year="${year}">
                    <span class="year-toggle">▼</span>
                    <span class="year-label">${year}</span>
                    <span class="year-count">(Total: ${yearData.total})</span>
                </div>
                <div class="month-container ${activeClass}">
                    <ul class="month-list">
        `;
        
        // Ordenar meses descendentemente
        const months = Object.keys(yearData.months).sort((a, b) => b - a);
        
        months.forEach(monthIndex => {
            const monthData = yearData.months[monthIndex];
            
            html += `
                <li class="archive-month">
                    <div class="month-header" data-year="${year}" data-month="${monthIndex}">
                        <span class="month-toggle">▼</span>
                        <span class="month-label">${monthData.name}</span>
                        <span class="month-count">(Total: ${monthData.count})</span>
                    </div>
                    <ul class="article-list">
            `;
            
            // Lista de artículos del mes (SOLO TÍTULOS)
            monthData.articles.forEach(article => {
                const truncatedTitle = article.title.length > 60 
                    ? article.title.substring(0, 60) + '...' 
                    : article.title;
                
                html += `
                    <li class="article-item">
                        <a href="${sanitizeHTML(article.link)}" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           title="${sanitizeHTML(article.title)}">
                            ◊ ${sanitizeHTML(truncatedTitle)}
                        </a>
                    </li>
                `;
            });
            
            html += `
                    </ul>
                </li>
            `;
        });
        
        html += `
                    </ul>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    
    container.innerHTML = html;
    
    // Inicializar eventos
    initArchiveEvents();
    
    console.log(`✅ Widget de archivo generado: ${years.length} años, ${articles.length} noticias`);
}

// ============================================
// FUNCIÓN AUXILIAR: SANITIZAR HTML
// ============================================
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// ============================================
// INICIALIZAR EVENTOS DEL WIDGET
// ============================================
function initArchiveEvents() {
    // Event listeners para toggles de años
    const yearHeaders = document.querySelectorAll('.year-header');
    yearHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            toggleYear(this);
        });
    });
    
    // Event listeners para toggles de meses
    const monthHeaders = document.querySelectorAll('.month-header');
    monthHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMonth(this);
        });
    });
}

// ============================================
// TOGGLE DE AÑO (ACORDEÓN)
// ============================================
function toggleYear(header) {
    const container = header.nextElementSibling;
    const toggle = header.querySelector('.year-toggle');
    const isActive = header.classList.contains('active');
    
    if (isActive) {
        header.classList.remove('active');
        container.classList.remove('active');
        toggle.textContent = '▶';
    } else {
        header.classList.add('active');
        container.classList.add('active');
        toggle.textContent = '▼';
    }
}

// ============================================
// TOGGLE DE MES (ACORDEÓN)
// ============================================
function toggleMonth(header) {
    const articleList = header.nextElementSibling;
    const toggle = header.querySelector('.month-toggle');
    const isActive = header.classList.contains('active');
    
    // Cerrar todos los otros meses del mismo año
    const parentYear = header.closest('.archive-year');
    const allMonthHeaders = parentYear.querySelectorAll('.month-header');
    
    allMonthHeaders.forEach(otherHeader => {
        if (otherHeader !== header && otherHeader.classList.contains('active')) {
            const otherList = otherHeader.nextElementSibling;
            const otherToggle = otherHeader.querySelector('.month-toggle');
            otherHeader.classList.remove('active');
            otherList.classList.remove('active');
            otherToggle.textContent = '▶';
        }
    });
    
    // Toggle del mes actual
    if (isActive) {
        header.classList.remove('active');
        articleList.classList.remove('active');
        toggle.textContent = '▶';
    } else {
        header.classList.add('active');
        articleList.classList.add('active');
        toggle.textContent = '▼';
    }
}

// ============================================
// ACTUALIZAR WIDGET CUANDO CAMBIAN LAS NOTICIAS
// ============================================
function updateDateArchiveWidget() {
    const sourceData = window.unfilteredNewsData || window.newsData;
    if (sourceData) {
        renderDateArchiveWidget(sourceData);
    }
}

// ============================================
// INTEGRACIÓN CON EL SISTEMA DE NOTICIAS
// ============================================
// Escuchar el evento de carga de noticias
document.addEventListener('newsLoaded', function(e) {
    console.log('📰 Evento newsLoaded recibido, actualizando widget de archivo');
    updateDateArchiveWidget();
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Date Archive Widget (Lista Simple) inicializado');
    
    // Si las noticias ya están cargadas, renderizar inmediatamente
    if (window.unfilteredNewsData || window.newsData) {
        setTimeout(updateDateArchiveWidget, 500);
    }
});

// ============================================
// EXPORT PARA USO GLOBAL
// ============================================
window.DateArchiveWidget = {
    render: renderDateArchiveWidget,
    update: updateDateArchiveWidget
};