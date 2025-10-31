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
    
    // Event listeners para clics en artículos (mostrar resumen)
    const articleLinks = document.querySelectorAll('.article-item a');
    articleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const articleUrl = this.getAttribute('href');
            const articleTitle = this.getAttribute('title');
            showArticleSummary(articleUrl, articleTitle);
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

// ============================================
// DETECTAR IDIOMA Y TRADUCIR SI ES NECESARIO
// ============================================
async function translateToSpanish(text) {
    // Detectar si el texto está en inglés (simple detección)
    const englishWords = ['the', 'and', 'or', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'been', 'being', 'this', 'that'];
    const spanishWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'es', 'son', 'que'];
    
    const lowerText = text.toLowerCase();
    let englishCount = 0;
    let spanishCount = 0;
    
    englishWords.forEach(word => {
        if (lowerText.includes(' ' + word + ' ')) englishCount++;
    });
    
    spanishWords.forEach(word => {
        if (lowerText.includes(' ' + word + ' ')) spanishCount++;
    });
    
    // Si parece estar en inglés, intentar traducir
    if (englishCount > spanishCount) {
        try {
            // Usar API de traducción gratuita (MyMemory)
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.responseStatus === 200 && data.responseData.translatedText) {
                return {
                    translated: true,
                    text: data.responseData.translatedText
                };
            }
        } catch (error) {
            console.warn('Error en traducción, usando texto original:', error);
        }
    }
    
    return {
        translated: false,
        text: text
    };
}

// ============================================
// DETERMINAR CATEGORÍA DE FUENTE
// ============================================
function getSourceCategory(sourceName) {
    const generalSources = ['The Hacker News', 'BleepingComputer', 'SecurityWeek', 'Dark Reading', 'Krebs on Security', 'SC Magazine', 'Cybernews'];
    const intelligenceSources = ['US-CERT', 'CISA', 'Talos Intelligence', 'VirusTotal'];
    const corporateSources = ['Google Cloud Security', 'Microsoft Security', 'Cisco Security', 'Palo Alto', 'Unit42', 'CrowdStrike', 'Mandiant'];
    
    if (generalSources.some(s => sourceName.includes(s))) return 'Noticias Generales';
    if (intelligenceSources.some(s => sourceName.includes(s))) return 'Inteligencia';
    if (corporateSources.some(s => sourceName.includes(s))) return 'Corporativas';
    
    return 'General';
}

// ============================================
// ANALIZAR IMPACTO EN CIA (Confidencialidad, Integridad, Disponibilidad)
// ============================================
function analyzeSecurityImpact(title, description) {
    const impacts = [];
    const text = (title + ' ' + description).toLowerCase();
    
    // Confidencialidad
    if (text.match(/breach|leak|exposure|credential|password|data theft|exfiltration|confidential|privacy|steal/i)) {
        impacts.push({ type: 'Confidencialidad', icon: '🔒', color: '#e74c3c' });
    }
    
    // Integridad
    if (text.match(/tamper|modify|alter|manipulate|inject|corruption|integrity|falsif|forge/i)) {
        impacts.push({ type: 'Integridad', icon: '✓', color: '#f39c12' });
    }
    
    // Disponibilidad
    if (text.match(/ddos|denial|outage|ransomware|unavailable|downtime|availability|crash|disruption/i)) {
        impacts.push({ type: 'Disponibilidad', icon: '⚡', color: '#9b59b6' });
    }
    
    // No Repudio
    if (text.match(/audit|log|trace|accountability|non-repudiation|forensic|evidence/i)) {
        impacts.push({ type: 'No Repudio', icon: '📝', color: '#3498db' });
    }
    
    // Si no se detecta ninguno, agregar "General"
    if (impacts.length === 0) {
        impacts.push({ type: 'Seguridad General', icon: '🛡️', color: '#95a5a6' });
    }
    
    return impacts;
}

// ============================================
// DETECTAR CATEGORÍAS POPULARES
// ============================================
function detectPopularCategories(title, description) {
    const categories = [];
    const text = (title + ' ' + description).toLowerCase();
    
    const categoryMap = {
        'Vulnerabilidades': /vulnerabilit|cve-|exploit|flaw|bug|patch/i,
        'Ransomware': /ransomware|encrypt|ransom|lockbit|blackcat/i,
        'Data Breach': /breach|leak|exposed|stolen data|data theft/i,
        'Malware': /malware|trojan|virus|backdoor|spyware/i,
        'Zero-Day': /zero-day|0day|zero day/i,
        'Phishing': /phishing|phish|spear-phish|social engineering/i,
        'APT': /apt|advanced persistent|nation-state|state-sponsored/i,
        'Exploit': /exploit|poc|proof of concept/i
    };
    
    for (const [category, regex] of Object.entries(categoryMap)) {
        if (text.match(regex)) {
            categories.push(category);
        }
    }
    
    if (categories.length === 0) {
        categories.push('General');
    }
    
    return categories;
}

// ============================================
// MOSTRAR RESUMEN DE ARTÍCULO EN ÁREA PRINCIPAL
// ============================================
async function showArticleSummary(articleUrl, articleTitle) {
    // Buscar el artículo en los datos cargados
    const sourceData = window.unfilteredNewsData || window.newsData;
    
    if (!sourceData) {
        console.warn('No hay datos de noticias disponibles');
        return;
    }
    
    // Encontrar el artículo por URL
    const article = sourceData.find(item => item.link === articleUrl);
    
    if (!article) {
        console.warn('Artículo no encontrado');
        return;
    }
    
    // Obtener el contenedor principal de noticias
    const newsContainer = document.getElementById('news-container');
    
    if (!newsContainer) {
        console.warn('Contenedor de noticias no encontrado');
        return;
    }
    
    // Verificar si ya existe un resumen y eliminarlo
    const existingSummary = document.getElementById('featured-article-summary');
    if (existingSummary) {
        existingSummary.remove();
    }
    
    // Extraer descripción completa (limpiar HTML pero mantener todo el texto)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.description || article.contentSnippet || article.content || '';
    let description = tempDiv.textContent || tempDiv.innerText || '';
    
    // Mostrar indicador de carga
    const loadingCard = document.createElement('div');
    loadingCard.id = 'featured-article-summary';
    loadingCard.className = 'featured-article-summary';
    loadingCard.innerHTML = `
        <div class="featured-header">
            <div class="featured-title-section">
                <span class="featured-icon">⭐</span>
                <h2>Cargando artículo...</h2>
            </div>
        </div>
        <div class="featured-content">
            <div class="loading-content">
                <div class="spinner-large"></div>
                <p>Procesando y traduciendo contenido...</p>
            </div>
        </div>
    `;
    newsContainer.insertBefore(loadingCard, newsContainer.firstChild);
    loadingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Traducir si es necesario
    const translationResult = await translateToSpanish(description);
    const finalDescription = translationResult.text;
    
    // Formatear fecha
    const date = new Date(article.pubDate);
    const formattedDate = date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Obtener nombre de la fuente
    const sourceName = article.source || 'Fuente desconocida';
    
    // Analizar impactos de seguridad
    const securityImpacts = analyzeSecurityImpact(article.title, description);
    
    // Detectar categorías populares
    const popularCategories = detectPopularCategories(article.title, description);
    
    // Determinar categoría de fuente
    const sourceCategory = getSourceCategory(sourceName);
    
    // Construir HTML de impactos
    const impactsHTML = securityImpacts.map(impact => 
        `<span class="impact-tag" style="background: ${impact.color};">
            ${impact.icon} ${impact.type}
        </span>`
    ).join('');
    
    // Construir HTML de categorías
    const categoriesHTML = popularCategories.map(cat => 
        `<span class="category-tag">${cat}</span>`
    ).join('');
    
    // Reemplazar con contenido completo
    loadingCard.innerHTML = `
        <div class="featured-header">
            <div class="featured-title-section">
                <span class="featured-icon">⭐</span>
                <h2>Artículo Destacado</h2>
            </div>
            <button class="featured-close" onclick="closeFeaturedArticle()" aria-label="Cerrar">
                ✕ Cerrar
            </button>
        </div>
        <div class="featured-content">
            <div class="featured-main-title">
                ${sanitizeHTML(article.title)}
            </div>
            
            ${translationResult.translated ? '<div class="translation-badge">🌐 Traducido automáticamente del inglés</div>' : ''}
            
            <div class="featured-meta-grid">
                <div class="meta-box">
                    <span class="meta-icon">🔗</span>
                    <div class="meta-info">
                        <span class="meta-label">Fuente:</span>
                        <a href="${sanitizeHTML(articleUrl)}" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           class="meta-value meta-link">
                            ${sanitizeHTML(sourceName)}
                        </a>
                    </div>
                </div>
                <div class="meta-box">
                    <span class="meta-icon">📅</span>
                    <div class="meta-info">
                        <span class="meta-label">Fecha:</span>
                        <span class="meta-value">${formattedDate}</span>
                    </div>
                </div>
            </div>
            
            <div class="tags-section">
                <div class="tag-group">
                    <h4>🎯 Impacto en Seguridad:</h4>
                    <div class="tags-container">
                        ${impactsHTML}
                    </div>
                </div>
                
                <div class="tag-group">
                    <h4>📂 Categorías:</h4>
                    <div class="tags-container">
                        ${categoriesHTML}
                    </div>
                </div>
                
                <div class="tag-group">
                    <h4>🏷️ Tipo de Fuente:</h4>
                    <div class="tags-container">
                        <span class="source-type-tag">${sourceCategory}</span>
                    </div>
                </div>
            </div>
            
            <div class="featured-description-full">
                <h4>📄 Contenido Completo:</h4>
                <div class="description-text">
                    ${sanitizeHTML(finalDescription)}
                </div>
            </div>
            
            <div class="featured-actions">
                <a href="${sanitizeHTML(articleUrl)}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="featured-btn">
                    📖 Leer artículo original en la fuente
                </a>
            </div>
        </div>
    `;
    
    console.log('✅ Artículo completo mostrado en área principal:', article.title);
}

// ============================================
// CERRAR ARTÍCULO DESTACADO
// ============================================
function closeFeaturedArticle() {
    const summaryCard = document.getElementById('featured-article-summary');
    if (summaryCard) {
        summaryCard.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            summaryCard.remove();
        }, 300);
    }
}

// Exportar función global para el botón de cierre
window.closeFeaturedArticle = closeFeaturedArticle;