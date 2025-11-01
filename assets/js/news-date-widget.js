/**
 * Date Archive Widget - VERSIÓN CORREGIDA
 * Correcciones:
 * 1. Traducción automática al español funcional
 * 2. Mostrar contenido completo de la noticia con imagen
 * 3. Orden correcto: Título → Imagen → Noticia → Tags/Botones
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
                           data-article-url="${sanitizeHTML(article.link)}"
                           class="article-link-sidebar"
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
    if (!str) return '';
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
    const articleLinks = document.querySelectorAll('.article-link-sidebar');
    articleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const articleUrl = this.getAttribute('data-article-url');
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
// TOGGLE DE MES (ACORDEÓN REAL)
// ============================================
function toggleMonth(header) {
    const list = header.nextElementSibling;
    const toggle = header.querySelector('.month-toggle');
    const isActive = header.classList.contains('active');
    
    if (isActive) {
        // Cerrar este mes
        header.classList.remove('active');
        list.style.display = 'none';
        toggle.textContent = '▶';
    } else {
        // CERRAR TODOS LOS DEMÁS MESES (ACORDEÓN REAL)
        const allMonthHeaders = document.querySelectorAll('.month-header');
        allMonthHeaders.forEach(otherHeader => {
            if (otherHeader !== header) {
                otherHeader.classList.remove('active');
                const otherList = otherHeader.nextElementSibling;
                if (otherList) {
                    otherList.style.display = 'none';
                }
                const otherToggle = otherHeader.querySelector('.month-toggle');
                if (otherToggle) {
                    otherToggle.textContent = '▶';
                }
            }
        });
        
        // Abrir este mes
        header.classList.add('active');
        list.style.display = 'block';
        toggle.textContent = '▼';
    }
}

// ============================================
// TRADUCCIÓN AUTOMÁTICA AL ESPAÑOL
// ============================================
async function translateToSpanish(text) {
    // Si el texto ya está en español o es muy corto, no traducir
    if (!text || text.length < 20) {
        return { text: text, translated: false };
    }
    
    // Detectar si el texto probablemente está en español
    const spanishWords = ['el', 'la', 'los', 'las', 'de', 'del', 'que', 'para', 'con', 'una', 'un', 'por'];
    const lowerText = text.toLowerCase();
    let spanishWordCount = 0;
    spanishWords.forEach(word => {
        if (lowerText.includes(' ' + word + ' ')) spanishWordCount++;
    });
    
    // Si hay muchas palabras en español, probablemente ya está traducido
    if (spanishWordCount >= 3) {
        return { text: text, translated: false };
    }
    
    try {
        // Usar API de traducción gratuita de LibreTranslate (vía allorigins para CORS)
        const apiUrl = 'https://libretranslate.de/translate';
        
        console.log('🌐 Traduciendo texto al español...');
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                source: 'en',
                target: 'es',
                format: 'text'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn('⚠️ Error en traducción, usando texto original');
            return { text: text, translated: false };
        }
        
        const data = await response.json();
        const translatedText = data.translatedText || text;
        
        console.log('✅ Texto traducido exitosamente');
        return { text: translatedText, translated: true };
        
    } catch (error) {
        console.error('❌ Error al traducir:', error);
        return { text: text, translated: false };
    }
}

// ============================================
// EXTRAER IMAGEN DE LA NOTICIA
// ============================================
function extractImageFromArticle(article) {
    // Intentar obtener imagen del enclosure
    if (article.enclosure && article.enclosure.url) {
        return article.enclosure.url;
    }
    
    // Intentar obtener imagen del contenido HTML
    if (article.description || article.content) {
        const content = article.description || article.content;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        const img = tempDiv.querySelector('img');
        if (img && img.src) {
            return img.src;
        }
    }
    
    // Intentar obtener del campo media:thumbnail o media:content
    if (article['media:thumbnail'] && article['media:thumbnail'].url) {
        return article['media:thumbnail'].url;
    }
    
    if (article['media:content'] && article['media:content'].url) {
        return article['media:content'].url;
    }
    
    return null;
}

// ============================================
// OBTENER CATEGORÍA DE FUENTE
// ============================================
function getSourceCategory(sourceName) {
    const generalSources = ['The Hacker News', 'BleepingComputer', 'SecurityWeek', 'Dark Reading', 'Krebs on Security', 'SC Magazine', 'Cybernews'];
    const intelligenceSources = ['CISA', 'US-CERT', 'Talos', 'VirusTotal'];
    const corporateSources = ['Google', 'Microsoft', 'Cisco', 'Palo Alto', 'CrowdStrike', 'Mandiant'];
    
    const lowerSource = sourceName.toLowerCase();
    
    if (generalSources.some(s => lowerSource.includes(s.toLowerCase()))) {
        return '📰 Noticias Generales';
    }
    if (intelligenceSources.some(s => lowerSource.includes(s.toLowerCase()))) {
        return '🛡️ Inteligencia de Amenazas';
    }
    if (corporateSources.some(s => lowerSource.includes(s.toLowerCase()))) {
        return '🏢 Blogs Corporativos';
    }
    
    return '📄 General';
}

// ============================================
// ANALIZAR IMPACTO DE SEGURIDAD
// ============================================
function analyzeSecurityImpact(title, description) {
    const impacts = [];
    const text = (title + ' ' + description).toLowerCase();
    
    // Confidencialidad (C)
    if (text.match(/leak|breach|exposed|stolen|unauthorized access|data theft|credential|password/i)) {
        impacts.push({ type: 'Confidencialidad', icon: '🔴', color: '#e74c3c' });
    }
    
    // Integridad (I)
    if (text.match(/tamper|modify|corrupt|inject|manipulat|backdoor|trojan/i)) {
        impacts.push({ type: 'Integridad', icon: '🔵', color: '#3498db' });
    }
    
    // Disponibilidad (A)
    if (text.match(/ddos|dos|denial of service|ransomware|outage|downtime|crash/i)) {
        impacts.push({ type: 'Disponibilidad', icon: '🟡', color: '#f39c12' });
    }
    
    // No repudio (NR)
    if (text.match(/audit|log|forensic|evidence|tracking|monitoring/i)) {
        impacts.push({ type: 'No Repudio', icon: '🟣', color: '#9b59b6' });
    }
    
    // Si no hay impactos específicos, agregar general
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
// CORRECCIÓN: Traducir título y contenido, mostrar imagen
// ============================================
async function showArticleSummary(articleUrl, articleTitle) {
    console.log('🔍 Mostrando artículo:', articleUrl);
    
    // Buscar el artículo en los datos cargados
    const sourceData = window.unfilteredNewsData || window.newsData;
    
    if (!sourceData) {
        console.warn('⚠️ No hay datos de noticias disponibles');
        alert('No se encontraron datos de noticias. Por favor, espera a que se carguen las noticias.');
        return;
    }
    
    // Encontrar el artículo por URL
    const article = sourceData.find(item => item.link === articleUrl);
    
    if (!article) {
        console.warn('⚠️ Artículo no encontrado en datos');
        alert('Artículo no encontrado. Por favor, intenta de nuevo.');
        return;
    }
    
    // Obtener el contenedor principal de noticias
    const newsContainer = document.getElementById('news-container');
    
    if (!newsContainer) {
        console.warn('⚠️ Contenedor de noticias no encontrado');
        return;
    }
    
    // Verificar si ya existe un resumen y eliminarlo
    const existingSummary = document.getElementById('featured-article-summary');
    if (existingSummary) {
        existingSummary.remove();
    }
    
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
                <p>Procesando y traduciendo contenido al español...</p>
            </div>
        </div>
    `;
    newsContainer.insertBefore(loadingCard, newsContainer.firstChild);
    loadingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Extraer descripción completa (limpiar HTML pero mantener todo el texto)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.description || article.contentSnippet || article.content || '';
    let description = tempDiv.textContent || tempDiv.innerText || '';
    
    // Si la descripción está vacía, intentar obtener del summary
    if (!description && article.summary) {
        description = article.summary;
    }
    
    // CORRECCIÓN 1: Traducir TANTO el título como el contenido
    console.log('🌐 Iniciando traducción...');
    const titleTranslation = await translateToSpanish(article.title);
    const descriptionTranslation = await translateToSpanish(description);
    
    const translatedTitle = titleTranslation.text;
    const translatedDescription = descriptionTranslation.text;
    const wasTranslated = titleTranslation.translated || descriptionTranslation.translated;
    
    console.log('✅ Traducción completada');
    
    // CORRECCIÓN 2: Extraer imagen de la noticia
    const articleImage = extractImageFromArticle(article);
    
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
    const sourceName = article.source || article.creator || 'Fuente desconocida';
    
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
    
    // CORRECCIÓN 3: Orden correcto - Título → Imagen → Contenido → Tags/Botones
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
            <!-- TÍTULO PRINCIPAL -->
            <div class="featured-main-title">
                ${sanitizeHTML(translatedTitle)}
            </div>
            
            <!-- BADGE DE TRADUCCIÓN -->
            ${wasTranslated ? '<div class="translation-badge">🌐 Traducido automáticamente del inglés al español</div>' : ''}
            
            <!-- IMAGEN DE LA NOTICIA (SI EXISTE) -->
            ${articleImage ? `
            <div class="featured-image">
                <img src="${sanitizeHTML(articleImage)}" 
                     alt="${sanitizeHTML(translatedTitle)}"
                     onerror="this.parentElement.style.display='none'">
            </div>
            ` : ''}
            
            <!-- CONTENIDO COMPLETO DE LA NOTICIA -->
            <div class="featured-description-full">
                <h4>📄 Contenido de la Noticia:</h4>
                <div class="description-text">
                    ${sanitizeHTML(translatedDescription)}
                </div>
            </div>
            
            <!-- METADATOS -->
            <div class="featured-meta-grid">
                <div class="meta-box">
                    <span class="meta-icon">📅</span>
                    <div class="meta-info">
                        <span class="meta-label">Fecha:</span>
                        <span class="meta-value">${formattedDate}</span>
                    </div>
                </div>
                <div class="meta-box">
                    <span class="meta-icon">🔗</span>
                    <div class="meta-info">
                        <span class="meta-label">Fuente:</span>
                        <span class="meta-value">${sanitizeHTML(sourceName)}</span>
                    </div>
                </div>
            </div>
            
            <!-- TAGS Y CATEGORÍAS -->
            <div class="tags-section">
                <div class="tag-group">
                    <h4>🏷️ Tipo de Fuente:</h4>
                    <div class="tags-container">
                        <span class="source-type-tag">${sourceCategory}</span>
                    </div>
                </div>
                
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
            </div>
            
            <!-- BOTÓN PARA LEER ORIGINAL -->
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
    
    console.log('✅ Artículo completo mostrado:', translatedTitle);
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

// ============================================
// AUTO-INICIALIZACIÓN DEL WIDGET
// ============================================

// Función para intentar inicializar el widget
function tryInitializeDateWidget() {
    const container = document.getElementById('date-archive-container');
    
    if (!container) {
        console.warn('⚠️ Contenedor date-archive-container no encontrado');
        return;
    }
    
    // Verificar si hay datos disponibles
    const newsData = window.unfilteredNewsData || window.newsData;
    
    if (newsData && newsData.length > 0) {
        console.log('✅ Datos disponibles, inicializando widget de fechas...');
        renderDateArchiveWidget(newsData);
    } else {
        console.log('⏳ Esperando datos de noticias...');
    }
}

// Intentar inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Esperar un poco para que se carguen los datos
        setTimeout(tryInitializeDateWidget, 1000);
    });
} else {
    // DOM ya está listo
    setTimeout(tryInitializeDateWidget, 1000);
}

// Escuchar evento personalizado de datos cargados (si existe)
window.addEventListener('newsDataLoaded', function(e) {
    console.log('📰 Evento newsDataLoaded recibido');
    if (e.detail && e.detail.articles) {
        renderDateArchiveWidget(e.detail.articles);
    }
});

// Polling para detectar cuando los datos estén disponibles (fallback)
let pollAttempts = 0;
const maxPollAttempts = 30; // 30 segundos máximo
const pollInterval = setInterval(function() {
    pollAttempts++;
    
    const newsData = window.unfilteredNewsData || window.newsData;
    
    if (newsData && newsData.length > 0) {
        console.log('✅ Datos detectados, inicializando widget de fechas...');
        clearInterval(pollInterval);
        renderDateArchiveWidget(newsData);
    } else if (pollAttempts >= maxPollAttempts) {
        console.error('❌ Timeout: No se pudieron cargar los datos después de 30 segundos');
        clearInterval(pollInterval);
        
        // Mostrar mensaje de error
        const container = document.getElementById('date-archive-container');
        if (container) {
            container.innerHTML = `
                <div class="archive-empty">
                    <div class="icon">⚠️</div>
                    <p>No se pudieron cargar las noticias</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🔄 Recargar página
                    </button>
                </div>
            `;
        }
    }
}, 1000);

// Exportar función para uso manual si es necesario
window.renderDateArchiveWidget = renderDateArchiveWidget;