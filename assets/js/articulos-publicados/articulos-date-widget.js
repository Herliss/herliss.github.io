/**
 * Artículos Widget - Estilo "Entradas Mensuales"
 * RÉPLICA EXACTA del diseño de news-date-widget.js
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 * Versión: 3.0 - Formato Entradas Mensuales
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
let lastRenderedArticlesCount = 0;
let currentFilteredArticles = null;

// ============================================
// GENERAR ESTRUCTURA DE ARCHIVO POR FECHA
// ============================================
function generateArticlesArchive(articles) {
    const archive = {};
    
    articles.forEach((article, index) => {
        // Convertir Firestore Timestamp a Date
        const date = article.publishedAt.toDate ? 
            article.publishedAt.toDate() : 
            new Date(article.publishedAt);
        
        // Validar fecha
        if (isNaN(date.getTime())) {
            console.warn(`Fecha inválida en artículo ${index}:`, article.publishedAt);
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
function renderArticlesArchiveWidget(articles) {
    const container = document.getElementById('date-archive-container');
    
    if (!container) {
        console.warn('⚠️ Contenedor date-archive-container no encontrado');
        return;
    }
    
    console.log(`📝 Articles Widget v3.0: Renderizando ${articles ? articles.length : 0} artículos`);
    
    // Guardar artículos
    currentFilteredArticles = articles;
    
    // Si no hay artículos, mostrar estado vacío
    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="archive-empty" style="text-align: center; padding: 2rem; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔭</div>
                <p style="font-size: 0.875rem;">No hay artículos disponibles</p>
            </div>
        `;
        lastRenderedArticlesCount = 0;
        return;
    }
    
    // Actualizar contador
    lastRenderedArticlesCount = articles.length;
    
    // Generar estructura de archivo
    const archive = generateArticlesArchive(articles);
    
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
    
    // CONSTRUIR HTML - ESTILO ENTRADAS MENSUALES
    let html = '';
    
    years.forEach((year, yearIndex) => {
        const yearData = archive[year];
        const isYearOpen = yearIndex === 0;
        const yearId = `articles-year-${year}`;
        
        console.log(`   📅 Año ${year}: ${Object.keys(yearData.months).length} meses, ${yearData.total} artículos`);
        
        // HEADER DEL AÑO (estilo idéntico a noticias)
        html += `
            <div style="margin-bottom: 1rem;">
                <button 
                    onclick="toggleArticlesYear('${yearId}')"
                    style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 1rem; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 0.5rem;">
                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                        <span id="icon-${yearId}" style="transition: transform 0.3s ease; display: inline-block; transform: rotate(${isYearOpen ? '90deg' : '0deg'});">▶</span>
                        <span>📅 ${year}</span>
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
            const monthId = `articles-month-${year}-${monthIndex}`;
            const isMonthOpen = idx === 0 && isYearOpen;
            
            // HEADER DEL MES (estilo idéntico a noticias)
            html += `
                <div style="margin-bottom: 0.5rem;">
                    <button 
                        onclick="toggleArticlesMonth('${monthId}')"
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
            
            // LISTA DE ARTÍCULOS (estilo idéntico a noticias)
            html += `<div id="${monthId}" class="month-articles-list" style="display: ${isMonthOpen ? 'block' : 'none'}; padding: 0.5rem 0 0.5rem 1rem; max-height: 400px; overflow-y: auto;">`;
            html += '<ul style="list-style: none; padding: 0; margin: 0;">';
            
            // Artículos del mes
            monthData.articles
                .sort((a, b) => {
                    const dateA = a.publishedAt.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt);
                    const dateB = b.publishedAt.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt);
                    return dateB - dateA;
                })
                .forEach(article => {
                    const articleDate = article.publishedAt.toDate ? 
                        article.publishedAt.toDate() : 
                        new Date(article.publishedAt);
                    const formattedDate = `${articleDate.getDate()}/${articleDate.getMonth() + 1}`;
                    
                    // Título
                    const displayTitleSource = article.title;
                    
                    // Truncar título
                    const maxLength = 60;
                    let displayTitle = displayTitleSource;
                    if (displayTitle.length > maxLength) {
                        displayTitle = displayTitle.substring(0, maxLength) + '...';
                    }
                    
                    // Item de artículo (estilo idéntico a noticias)
                    html += `
                        <li style="margin-bottom: 0.5rem;">
                            <a href="#" 
                               data-article-slug="${article.slug}"
                               class="article-detail-link"
                               style="display: flex; gap: 0.5rem; padding: 0.625rem; background: #f8f9fa; border-radius: 6px; text-decoration: none; color: #2c3e50; font-size: 0.8rem; line-height: 1.4; transition: all 0.3s ease; border-left: 2px solid transparent;"
                               onmouseover="this.style.background='#e9ecef'; this.style.borderLeftColor='#3498db'; this.style.paddingLeft='0.875rem'"
                               onmouseout="this.style.background='#f8f9fa'; this.style.borderLeftColor='transparent'; this.style.paddingLeft='0.625rem'"
                               title="${displayTitleSource}">
                                <span style="color: #7f8c8d; font-weight: 600; flex-shrink: 0; font-size: 0.7rem;">${formattedDate}</span>
                                <span style="flex: 1; font-weight: 500;">${displayTitle}</span>
                            </a>
                        </li>
                    `;
                });
            
            html += '</ul>';
            html += '</div>'; // Cerrar lista de artículos
            html += '</div>'; // Cerrar mes
        });
        
        html += '</div>'; // Cerrar contenedor de meses
        html += '</div>'; // Cerrar año
    });
    
    // Actualizar contenedor
    container.innerHTML = html;
    
    // Adjuntar event listeners
    attachArticleDetailListeners();
    
    console.log(`✅ Widget renderizado: ${articles.length} artículos, ${years.length} año(s)`);
}

// ============================================
// ADJUNTAR LISTENERS PARA DETALLE
// ============================================
function attachArticleDetailListeners() {
    const articleLinks = document.querySelectorAll('.article-detail-link');
    
    articleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const slug = this.getAttribute('data-article-slug');
            if (slug && typeof window.loadArticleDetail === 'function') {
                window.loadArticleDetail(slug);
            }
        });
    });
}

// ============================================
// TOGGLE AÑO
// ============================================
function toggleArticlesYear(yearId) {
    const yearContainer = document.getElementById(yearId);
    const icon = document.getElementById(`icon-${yearId}`);
    
    if (!yearContainer || !icon) return;
    
    const isVisible = yearContainer.style.display !== 'none';
    
    if (isVisible) {
        yearContainer.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    } else {
        yearContainer.style.display = 'block';
        icon.style.transform = 'rotate(90deg)';
    }
}

// ============================================
// TOGGLE MES
// ============================================
function toggleArticlesMonth(monthId) {
    const monthContainer = document.getElementById(monthId);
    const icon = document.getElementById(`icon-${monthId}`);
    
    if (!monthContainer || !icon) return;
    
    const isVisible = monthContainer.style.display !== 'none';
    
    if (isVisible) {
        monthContainer.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    } else {
        monthContainer.style.display = 'block';
        icon.style.transform = 'rotate(90deg)';
    }
}

// ============================================
// INICIALIZACIÓN CON EVENTO
// ============================================
window.addEventListener('articlesLoaded', function(event) {
    console.log('📢 Evento articlesLoaded recibido en widget');
    const articles = event.detail.articles;
    renderArticlesArchiveWidget(articles);
});

// ============================================
// LOG DE INICIALIZACIÓN
// ============================================
console.log('✅ Artículos Widget v3.0 (Estilo Entradas Mensuales) loaded');

// Exponer funciones globalmente
window.toggleArticlesYear = toggleArticlesYear;
window.toggleArticlesMonth = toggleArticlesMonth;
window.renderArticlesArchiveWidget = renderArticlesArchiveWidget;