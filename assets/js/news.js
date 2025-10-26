/**
 * News Loader - Carga de Noticias desde RSS Feeds
 * Implementación segura siguiendo OWASP
 */

'use strict';

// ============================================
// CONFIGURACIÓN DE FUENTES RSS
// ============================================
const NEWS_SOURCES = {
    thehackernews: {
        name: 'The Hacker News',
        rss: 'https://feeds.feedburner.com/TheHackersNews',
        color: '#e74c3c'
    },
    krebs: {
        name: 'Krebs on Security',
        rss: 'https://krebsonsecurity.com/feed/',
        color: '#3498db'
    },
    darkreading: {
        name: 'Dark Reading',
        rss: 'https://www.darkreading.com/rss.xml',
        color: '#00a86b'
    }
};

// API RSS2JSON (gratis, sin autenticación)
const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json';

// ============================================
// SANITIZACIÓN DE HTML (Prevención XSS)
// ============================================
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Función para limpiar HTML complejo
function stripHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

// ============================================
// CARGAR NOTICIAS DESDE RSS
// ============================================
async function loadNewsFromSource(sourceKey) {
    const source = NEWS_SOURCES[sourceKey];
    const url = `${RSS_TO_JSON_API}?rss_url=${encodeURIComponent(source.rss)}&count=10`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status !== 'ok') {
            throw new Error('Error en la respuesta de la API');
        }
        
        // Agregar información de la fuente a cada artículo
        return data.items.map(item => ({
            ...item,
            source: sourceKey,
            sourceName: source.name,
            sourceColor: source.color
        }));
        
    } catch (error) {
        console.error(`Error cargando ${source.name}:`, error);
        return [];
    }
}

// ============================================
// CARGAR TODAS LAS NOTICIAS
// ============================================
async function loadAllNews() {
    const loading = document.getElementById('loading');
    const newsContainer = document.getElementById('news-container');
    const errorMessage = document.getElementById('error-message');
    
    // Mostrar loading
    loading.style.display = 'flex';
    newsContainer.innerHTML = '';
    errorMessage.style.display = 'none';
    
    try {
        // Cargar todas las fuentes en paralelo
        const promises = Object.keys(NEWS_SOURCES).map(key => loadNewsFromSource(key));
        const results = await Promise.all(promises);
        
        // Combinar todos los artículos
        let allArticles = results.flat();
        
        if (allArticles.length === 0) {
            throw new Error('No se encontraron noticias');
        }
        
        // Ordenar por fecha (más reciente primero)
        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        
        // Guardar en memoria para filtros
        window.newsData = allArticles;
        
        // Renderizar noticias
        renderNews(allArticles);
        
    } catch (error) {
        console.error('Error cargando noticias:', error);
        errorMessage.style.display = 'block';
    } finally {
        loading.style.display = 'none';
    }
}

// ============================================
// CLASIFICACIÓN CIA+NR (Confidencialidad, Integridad, Disponibilidad, No Repudio)
// ============================================
function classifyNewsByCIANR(article) {
    const text = (article.title + ' ' + article.description).toLowerCase();
    const tags = [];
    
    // Confidencialidad - palabras clave relacionadas con robo/exposición de datos
    const confidentialityKeywords = [
        'breach', 'leak', 'exposed', 'stolen', 'data theft', 'credentials',
        'password', 'filtración', 'fuga', 'robo de datos', 'credenciales',
        'contraseñas', 'exposición', 'sensitive data', 'personal information',
        'database', 'dump', 'backdoor'
    ];
    
    // Integridad - palabras clave relacionadas con modificación/corrupción
    const integrityKeywords = [
        'malware', 'ransomware', 'trojan', 'virus', 'worm', 'corruption',
        'modified', 'altered', 'tampering', 'injection', 'modificación',
        'alterado', 'corrupto', 'troyano', 'gusano', 'rootkit', 'backdoor',
        'supply chain', 'compromised', 'infected'
    ];
    
    // Disponibilidad - palabras clave relacionadas con interrupción de servicio
    const availabilityKeywords = [
        'ddos', 'dos', 'outage', 'downtime', 'unavailable', 'disruption',
        'denial of service', 'crashed', 'offline', 'caída', 'interrupción',
        'inaccesible', 'fuera de servicio', 'denegación', 'desconexión'
    ];
    
    // No Repudio - palabras clave relacionadas con autenticación/identidad
    const nonRepudiationKeywords = [
        'authentication', 'identity', 'fraud', 'phishing', 'impersonation',
        'spoofing', 'autenticación', 'identidad', 'fraude', 'suplantación',
        'falsificación', 'mfa', '2fa', 'biometric', 'certificate', 'signature',
        'social engineering', 'ingeniería social'
    ];
    
    if (confidentialityKeywords.some(keyword => text.includes(keyword))) {
        tags.push({ type: 'confidentiality', label: 'Confidencialidad', icon: '🔒' });
    }
    
    if (integrityKeywords.some(keyword => text.includes(keyword))) {
        tags.push({ type: 'integrity', label: 'Integridad', icon: '✅' });
    }
    
    if (availabilityKeywords.some(keyword => text.includes(keyword))) {
        tags.push({ type: 'availability', label: 'Disponibilidad', icon: '⚡' });
    }
    
    if (nonRepudiationKeywords.some(keyword => text.includes(keyword))) {
        tags.push({ type: 'non-repudiation', label: 'No Repudio', icon: '📝' });
    }
    
    // Si no se detecta ninguna categoría, asignar Integridad por defecto
    if (tags.length === 0) {
        tags.push({ type: 'integrity', label: 'Integridad', icon: '✅' });
    }
    
    return tags;
}

// ============================================
// AGRUPAR NOTICIAS POR FECHA
// ============================================
function groupArticlesByDate(articles) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const groups = {
        today: { label: 'Hoy', articles: [] },
        yesterday: { label: 'Ayer', articles: [] },
        thisWeek: { label: 'Esta Semana', articles: [] },
        thisMonth: { label: 'Este Mes', articles: [] },
        older: { label: 'Anteriores', articles: [] }
    };
    
    articles.forEach(article => {
        const articleDate = new Date(article.pubDate);
        const articleDay = new Date(articleDate.getFullYear(), articleDate.getMonth(), articleDate.getDate());
        
        if (articleDay.getTime() === today.getTime()) {
            groups.today.articles.push(article);
        } else if (articleDay.getTime() === yesterday.getTime()) {
            groups.yesterday.articles.push(article);
        } else if (articleDate >= weekAgo) {
            groups.thisWeek.articles.push(article);
        } else if (articleDate >= monthAgo) {
            groups.thisMonth.articles.push(article);
        } else {
            groups.older.articles.push(article);
        }
    });
    
    return groups;
}

// ============================================
// RENDERIZAR NOTICIAS AGRUPADAS POR FECHA
// ============================================
function renderNews(articles) {
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = '';
    
    if (articles.length === 0) {
        newsContainer.innerHTML = '<p class="no-results">No se encontraron noticias con este filtro.</p>';
        return;
    }
    
    // Agrupar por fecha
    const groups = groupArticlesByDate(articles);
    
    // Renderizar cada grupo
    Object.keys(groups).forEach(groupKey => {
        const group = groups[groupKey];
        
        if (group.articles.length > 0) {
            // Crear encabezado de grupo
            const groupHeader = document.createElement('div');
            groupHeader.className = 'news-date-group';
            groupHeader.innerHTML = `
                <h3 class="date-group-header">
                    <span class="date-icon">📅</span>
                    ${group.label}
                    <span class="date-count">(${group.articles.length})</span>
                </h3>
            `;
            newsContainer.appendChild(groupHeader);
            
            // Crear contenedor para artículos del grupo
            const groupContainer = document.createElement('div');
            groupContainer.className = 'news-group-container';
            
            group.articles.forEach(article => {
                const newsCard = createNewsCard(article);
                groupContainer.appendChild(newsCard);
            });
            
            newsContainer.appendChild(groupContainer);
        }
    });
}

// ============================================
// CREAR TARJETA DE NOTICIA
// ============================================
function createNewsCard(article) {
    const card = document.createElement('article');
    card.className = 'news-card';
    
    // Extraer descripción limpia
    const description = stripHTML(article.description || article.content || '');
    const truncatedDesc = description.length > 200 
        ? description.substring(0, 200) + '...' 
        : description;
    
    // Formatear fecha y hora
    const pubDate = new Date(article.pubDate);
    const formattedDate = pubDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = pubDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Extraer imagen si existe
    const thumbnail = article.thumbnail || article.enclosure?.link || '';
    
    // Clasificar por CIA+NR
    const ciaTags = classifyNewsByCIANR(article);
    
    // Generar HTML de tags CIA+NR
    const ciaTagsHTML = ciaTags.map(tag => `
        <span class="cia-tag cia-${tag.type}" title="${tag.label}">
            ${tag.icon} ${tag.label}
        </span>
    `).join('');
    
    card.innerHTML = `
        <div class="news-card-header">
            <div class="header-left">
                <span class="news-source" style="background-color: ${article.sourceColor}">
                    ${sanitizeHTML(article.sourceName)}
                </span>
                <time datetime="${article.pubDate}" class="news-time">
                    ${formattedTime}
                </time>
            </div>
            <div class="cia-tags-container">
                ${ciaTagsHTML}
            </div>
        </div>
        
        ${thumbnail ? `
            <div class="news-image">
                <img src="${sanitizeHTML(thumbnail)}" 
                     alt="${sanitizeHTML(article.title)}"
                     loading="lazy"
                     onerror="this.style.display='none'">
            </div>
        ` : ''}
        
        <div class="news-card-body">
            <h3>
                <a href="${sanitizeHTML(article.link)}" 
                   target="_blank" 
                   rel="noopener noreferrer">
                    ${sanitizeHTML(article.title)}
                </a>
            </h3>
            <p>${sanitizeHTML(truncatedDesc)}</p>
        </div>
        
        <div class="news-card-footer">
            <a href="${sanitizeHTML(article.link)}" 
               class="read-more-btn" 
               target="_blank" 
               rel="noopener noreferrer">
                Leer más →
            </a>
        </div>
    `;
    
    return card;
}

// ============================================
// SISTEMA DE FILTROS
// ============================================
function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover clase active de todos
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Agregar clase active al clickeado
            this.classList.add('active');
            
            const source = this.dataset.source;
            filterNews(source);
        });
    });
}

function filterNews(source) {
    if (!window.newsData) return;
    
    let filteredArticles;
    
    if (source === 'all') {
        filteredArticles = window.newsData;
    } else {
        filteredArticles = window.newsData.filter(article => article.source === source);
    }
    
    renderNews(filteredArticles);
}

// ============================================
// BÚSQUEDA POR TAGS (opcional)
// ============================================
function initTagSearch() {
    const tagLinks = document.querySelectorAll('[data-tag]');
    
    tagLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tag = this.dataset.tag.toLowerCase();
            searchByTag(tag);
        });
    });
}

function searchByTag(tag) {
    if (!window.newsData) return;
    
    const filteredArticles = window.newsData.filter(article => {
        const title = article.title.toLowerCase();
        const description = (article.description || '').toLowerCase();
        return title.includes(tag) || description.includes(tag);
    });
    
    renderNews(filteredArticles);
    
    // Actualizar botón de filtro a "Todas"
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.source === 'all') {
            btn.classList.add('active');
        }
    });
}

// ============================================
// REFRESH AUTOMÁTICO (cada 5 minutos)
// ============================================
function startAutoRefresh() {
    // Refresh cada 5 minutos
    setInterval(() => {
        console.log('Actualizando noticias...');
        loadAllNews();
    }, 5 * 60 * 1000);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Cargar noticias al iniciar
    loadAllNews();
    
    // Inicializar filtros
    initFilters();
    
    // Inicializar búsqueda por tags
    initTagSearch();
    
    // Iniciar refresh automático
    startAutoRefresh();
    
    console.log('✅ News Loader inicializado correctamente');
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================
window.addEventListener('error', function(e) {
    console.error('Error en News Loader:', e.message);
});

// ============================================
// EXPORT PARA TESTS
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadNewsFromSource,
        loadAllNews,
        sanitizeHTML,
        stripHTML
    };
}