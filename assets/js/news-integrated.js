/**
 * News Loader OPTIMIZADO v2.2 - VERSIÓN CORREGIDA PARA 16 FUENTES
 * 
 * CORRECCIONES CRÍTICAS:
 * ✅ Timeout aumentado a 20 segundos
 * ✅ 2 reintentos por fuente (en lugar de 1)
 * ✅ Logging detallado para diagnóstico
 * ✅ Proxy CORS más tolerante
 * ✅ Garantiza mostrar noticias aunque fallen algunas fuentes
 * 
 * Autor: Herliss Briceño
 * Fecha: Noviembre 2025
 */

'use strict';

// ============================================
// CONFIGURACIÓN DE PERFORMANCE - MEJORADA
// ============================================

const PERFORMANCE_CONFIG = {
    // Caché
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
    CACHE_KEY: 'herliss_news_cache',
    
    // Carga - VALORES OPTIMIZADOS
    BATCH_SIZE: 4, // Cargar 4 fuentes en paralelo (aumentado de 3)
    ARTICLES_PER_SOURCE_FIRST_LOAD: 15, // Más artículos por fuente
    ARTICLES_PER_SOURCE_FULL: 25, 
    REQUEST_TIMEOUT: 20000, // 20 segundos (aumentado de 15)
    MAX_RETRIES: 2, // 2 reintentos (aumentado de 1)
    
    // Proxy principal
    PRIMARY_PROXY: 'https://api.allorigins.win/raw?url='
};

// ============================================
// CONFIGURACIÓN DE FUENTES RSS (16 FUENTES)
// ============================================
const NEWS_SOURCES = {
    thehackernews: {
        name: 'The Hacker News',
        rss: 'https://feeds.feedburner.com/TheHackersNews',
        color: '#e74c3c',
        category: 'general',
        priority: 1
    },
    bleepingcomputer: {
        name: 'BleepingComputer',
        rss: 'https://www.bleepingcomputer.com/feed/',
        color: '#2ecc71',
        category: 'general',
        priority: 1
    },
    microsoft: {
        name: 'Microsoft Security',
        rss: 'https://www.microsoft.com/security/blog/feed/',
        color: '#00a4ef',
        category: 'corporate',
        priority: 1
    },
    uscert: {
        name: 'US-CERT (CISA)',
        rss: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
        color: '#c0392b',
        category: 'intelligence',
        priority: 1
    },
    securityweek: {
        name: 'SecurityWeek',
        rss: 'https://www.securityweek.com/rss/',
        color: '#e67e22',
        category: 'general',
        priority: 2
    },
    darkreading: {
        name: 'Dark Reading',
        rss: 'https://www.darkreading.com/rss.xml',
        color: '#9b59b6',
        category: 'general',
        priority: 2
    },
    krebs: {
        name: 'Krebs on Security',
        rss: 'https://krebsonsecurity.com/feed/',
        color: '#3498db',
        category: 'general',
        priority: 2
    },
    googlecloud: {
        name: 'Google Cloud Security',
        rss: 'https://cloud.google.com/blog/topics/security/rss/',
        color: '#4285f4',
        category: 'corporate',
        priority: 2
    },
    cisco: {
        name: 'Cisco Security',
        rss: 'https://blogs.cisco.com/security/feed',
        color: '#049fd9',
        category: 'corporate',
        priority: 2
    },
    paloalto: {
        name: 'Palo Alto Unit42',
        rss: 'https://unit42.paloaltonetworks.com/feed/',
        color: '#fa582d',
        category: 'corporate',
        priority: 2
    },
    talos: {
        name: 'Talos Intelligence',
        rss: 'https://blog.talosintelligence.com/feeds/posts/default',
        color: '#16a085',
        category: 'intelligence',
        priority: 2
    },
    scmagazine: {
        name: 'SC Magazine',
        rss: 'https://www.scmagazine.com/home/feed/',
        color: '#1abc9c',
        category: 'general',
        priority: 3
    },
    cybernews: {
        name: 'Cybernews',
        rss: 'https://cybernews.com/feed/',
        color: '#34495e',
        category: 'general',
        priority: 3
    },
    virustotal: {
        name: 'VirusTotal Blog',
        rss: 'https://blog.virustotal.com/feeds/posts/default',
        color: '#27ae60',
        category: 'intelligence',
        priority: 3
    },
    crowdstrike: {
        name: 'CrowdStrike Blog',
        rss: 'https://www.crowdstrike.com/blog/feed/',
        color: '#e01f3d',
        category: 'corporate',
        priority: 3
    },
    mandiant: {
        name: 'Mandiant',
        rss: 'https://www.mandiant.com/resources/rss',
        color: '#ff6600',
        category: 'corporate',
        priority: 3
    }
};

// Verificar que tenemos 16 fuentes
console.log(`📊 Total de fuentes configuradas: ${Object.keys(NEWS_SOURCES).length}`);

// ============================================
// GESTIÓN DE CACHÉ
// ============================================

function saveToCache(data) {
    try {
        const cache = {
            timestamp: Date.now(),
            data: data,
            sourceCount: Object.keys(NEWS_SOURCES).length
        };
        localStorage.setItem(PERFORMANCE_CONFIG.CACHE_KEY, JSON.stringify(cache));
        console.log(`✅ ${data.length} noticias guardadas en caché`);
    } catch (error) {
        console.warn('⚠️ Error guardando en caché:', error);
    }
}

function getFromCache() {
    try {
        const cached = localStorage.getItem(PERFORMANCE_CONFIG.CACHE_KEY);
        if (!cached) return null;
        
        const cache = JSON.parse(cached);
        const age = Date.now() - cache.timestamp;
        
        if (age < PERFORMANCE_CONFIG.CACHE_DURATION) {
            console.log(`✅ Usando caché (edad: ${Math.round(age / 1000)}s, ${cache.data.length} noticias)`);
            return cache.data;
        } else {
            console.log('⏰ Caché expirado, recargando...');
            localStorage.removeItem(PERFORMANCE_CONFIG.CACHE_KEY);
            return null;
        }
    } catch (error) {
        console.warn('⚠️ Error leyendo caché:', error);
        return null;
    }
}

function clearCache() {
    localStorage.removeItem(PERFORMANCE_CONFIG.CACHE_KEY);
    console.log('🗑️ Caché limpiado');
}

// ============================================
// PARSER RSS CON TIMEOUT Y RETRY MEJORADO
// ============================================

async function fetchWithTimeout(url, timeout = PERFORMANCE_CONFIG.REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Accept': 'application/xml, text/xml, application/rss+xml'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function parseRSSFeed(rssUrl, sourceName, maxArticles = PERFORMANCE_CONFIG.ARTICLES_PER_SOURCE_FIRST_LOAD) {
    let lastError = null;
    
    // Intentar múltiples veces
    for (let attempt = 0; attempt <= PERFORMANCE_CONFIG.MAX_RETRIES; attempt++) {
        try {
            const proxyUrl = `${PERFORMANCE_CONFIG.PRIMARY_PROXY}${encodeURIComponent(rssUrl)}`;
            
            if (attempt > 0) {
                console.log(`🔄 ${sourceName}: Reintento ${attempt}/${PERFORMANCE_CONFIG.MAX_RETRIES}`);
                await new Promise(resolve => setTimeout(resolve, 1500)); // Esperar 1.5s entre reintentos
            }
            
            const startTime = Date.now();
            const response = await fetchWithTimeout(proxyUrl);
            const fetchTime = Date.now() - startTime;
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Error parseando XML');
            }
            
            // Extraer items
            const items = [];
            const rssItems = xmlDoc.querySelectorAll('item');
            
            if (rssItems.length > 0) {
                rssItems.forEach((item, index) => {
                    if (index < maxArticles) {
                        items.push(parseRSSItem(item));
                    }
                });
            } else {
                const atomEntries = xmlDoc.querySelectorAll('entry');
                atomEntries.forEach((entry, index) => {
                    if (index < maxArticles) {
                        items.push(parseAtomEntry(entry));
                    }
                });
            }
            
            // Éxito
            if (items.length > 0) {
                console.log(`✅ ${sourceName}: ${items.length} artículos cargados (${fetchTime}ms)`);
                return items;
            }
            
            throw new Error('No se encontraron items en el feed');
            
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ ${sourceName}: Intento ${attempt + 1}/${PERFORMANCE_CONFIG.MAX_RETRIES + 1} falló: ${error.message}`);
        }
    }
    
    // Todos los intentos fallaron
    console.error(`❌ ${sourceName}: Falló después de ${PERFORMANCE_CONFIG.MAX_RETRIES + 1} intentos`);
    return [];
}

function parseRSSItem(item) {
    const getElementText = (tagName) => {
        const element = item.querySelector(tagName);
        return element ? element.textContent.trim() : '';
    };
    
    return {
        title: getElementText('title'),
        link: getElementText('link'),
        description: getElementText('description') || getElementText('content:encoded'),
        pubDate: getElementText('pubDate') || getElementText('dc:date') || new Date().toISOString(),
        author: getElementText('author') || getElementText('dc:creator'),
        thumbnail: extractThumbnail(item)
    };
}

function parseAtomEntry(entry) {
    const getElementText = (tagName) => {
        const element = entry.querySelector(tagName);
        return element ? element.textContent.trim() : '';
    };
    
    const getLinkHref = () => {
        const link = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
        return link ? link.getAttribute('href') : '';
    };
    
    return {
        title: getElementText('title'),
        link: getLinkHref(),
        description: getElementText('summary') || getElementText('content'),
        pubDate: getElementText('published') || getElementText('updated') || new Date().toISOString(),
        author: getElementText('author name'),
        thumbnail: extractThumbnail(entry)
    };
}

function extractThumbnail(item) {
    const mediaContent = item.querySelector('media\\:content, content');
    if (mediaContent) {
        const url = mediaContent.getAttribute('url');
        if (url) return url;
    }
    
    const mediaThumbnail = item.querySelector('media\\:thumbnail, thumbnail');
    if (mediaThumbnail) {
        const url = mediaThumbnail.getAttribute('url');
        if (url) return url;
    }
    
    const enclosure = item.querySelector('enclosure[type^="image"]');
    if (enclosure) {
        const url = enclosure.getAttribute('url');
        if (url) return url;
    }
    
    return '';
}

// ============================================
// BARRA DE PROGRESO MEJORADA
// ============================================

function updateProgressBar(loaded, total, successful) {
    const loadingElement = document.getElementById('loading');
    if (!loadingElement) return;
    
    const percentage = Math.round((loaded / total) * 100);
    const successRate = loaded > 0 ? Math.round((successful / loaded) * 100) : 0;
    
    loadingElement.innerHTML = `
        <div class="spinner"></div>
        <p>Cargando noticias de 16 fuentes de ciberseguridad...</p>
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${percentage}%"></div>
        </div>
        <p class="progress-text">
            ${loaded} de ${total} fuentes procesadas | ${successful} exitosas (${successRate}%)
        </p>
    `;
}

function hideProgressBar() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// ============================================
// CARGA PROGRESIVA DE NOTICIAS - MEJORADA
// ============================================

async function loadAllNewsProgressive() {
    console.log('🚀 Iniciando carga progresiva de 16 fuentes RSS...');
    console.log(`⚙️ Config: Timeout ${PERFORMANCE_CONFIG.REQUEST_TIMEOUT/1000}s | Reintentos ${PERFORMANCE_CONFIG.MAX_RETRIES} | Lote ${PERFORMANCE_CONFIG.BATCH_SIZE}`);
    
    // Verificar caché primero
    const cached = getFromCache();
    if (cached && cached.length > 0) {
        console.log(`✅ ${cached.length} noticias cargadas desde caché`);
        processAndRenderNews(cached);
        hideProgressBar();
        return;
    }
    
    // Preparar fuentes ordenadas por prioridad
    const sources = Object.entries(NEWS_SOURCES)
        .map(([key, config]) => ({ key, ...config }))
        .sort((a, b) => a.priority - b.priority);
    
    const totalSources = sources.length;
    let loadedSources = 0;
    let successfulSources = 0;
    let allArticles = [];
    
    console.log(`📰 Cargando ${totalSources} fuentes en lotes de ${PERFORMANCE_CONFIG.BATCH_SIZE}...`);
    
    // Cargar en lotes
    for (let i = 0; i < sources.length; i += PERFORMANCE_CONFIG.BATCH_SIZE) {
        const batch = sources.slice(i, i + PERFORMANCE_CONFIG.BATCH_SIZE);
        const batchNum = Math.floor(i / PERFORMANCE_CONFIG.BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(sources.length / PERFORMANCE_CONFIG.BATCH_SIZE);
        
        console.log(`\n📦 Lote ${batchNum}/${totalBatches}: ${batch.map(s => s.name).join(', ')}`);
        
        // Cargar batch en paralelo
        const batchPromises = batch.map(async (source) => {
            try {
                const items = await parseRSSFeed(source.rss, source.name);
                
                if (items && items.length > 0) {
                    return {
                        success: true,
                        sourceName: source.name,
                        articles: items.map(item => ({
                            ...item,
                            source: source.key,
                            sourceName: source.name,
                            sourceColor: source.color,
                            sourceCategory: source.category
                        }))
                    };
                } else {
                    console.warn(`⚠️ ${source.name}: Sin artículos`);
                    return { success: false, sourceName: source.name, articles: [] };
                }
            } catch (error) {
                console.error(`❌ ${source.name}: Error crítico - ${error.message}`);
                return { success: false, sourceName: source.name, articles: [] };
            }
        });
        
        // Esperar a que el batch termine
        const batchResults = await Promise.all(batchPromises);
        
        // Agregar resultados exitosos
        batchResults.forEach(result => {
            if (result.success) {
                successfulSources++;
                allArticles = allArticles.concat(result.articles);
                console.log(`   ✅ ${result.sourceName}: ${result.articles.length} noticias`);
            } else {
                console.log(`   ❌ ${result.sourceName}: Falló`);
            }
        });
        
        // Actualizar progreso
        loadedSources += batch.length;
        updateProgressBar(loadedSources, totalSources, successfulSources);
        
        // Renderizar noticias parciales (UX incremental)
        if (allArticles.length > 0) {
            processAndRenderNews(allArticles);
        }
    }
    
    // Finalizar
    console.log(`\n✅ Carga completa:`);
    console.log(`   📊 ${allArticles.length} noticias totales`);
    console.log(`   ✅ ${successfulSources}/${totalSources} fuentes exitosas`);
    console.log(`   ❌ ${totalSources - successfulSources} fuentes fallidas`);
    
    // CRÍTICO: Mostrar noticias aunque solo algunas fuentes funcionen
    if (allArticles.length > 0) {
        saveToCache(allArticles);
        processAndRenderNews(allArticles);
        hideProgressBar();
        
        // Mostrar advertencia si no todas las fuentes cargaron
        if (successfulSources < totalSources) {
            showPartialLoadWarning(successfulSources, totalSources);
        }
    } else {
        // Solo mostrar error si TODAS las fuentes fallaron
        console.error('❌ CRÍTICO: No se pudo cargar ninguna noticia de ninguna fuente');
        showError();
    }
}

function showPartialLoadWarning(successful, total) {
    const banner = document.createElement('div');
    banner.style.cssText = `
        background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
        color: white;
        padding: 0.75rem 1.5rem;
        margin-bottom: 1rem;
        border-radius: 6px;
        text-align: center;
        font-size: 0.875rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    banner.innerHTML = `
        ⚠️ <strong>${successful} de ${total}</strong> fuentes cargadas correctamente. 
        Algunas fuentes no respondieron (${total - successful} fallidas).
    `;
    
    const newsContainer = document.getElementById('news-container');
    if (newsContainer && newsContainer.parentNode) {
        newsContainer.parentNode.insertBefore(banner, newsContainer);
        
        // Remover después de 10 segundos
        setTimeout(() => banner.remove(), 10000);
    }
}

function processAndRenderNews(articles) {
    // Enriquecer con metadata si está disponible
    if (window.AdvancedFilters && typeof window.AdvancedFilters.enrichArticleMetadata === 'function') {
        articles = articles.map(article => window.AdvancedFilters.enrichArticleMetadata(article));
    }
    
    // Ordenar por fecha
    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Guardar globalmente
    window.newsData = articles;
    window.unfilteredNewsData = [...articles];
    
    // Renderizar
    renderNews(articles);
    
    // Emitir evento
    const event = new CustomEvent('newsLoaded', {
        detail: {
            articles: articles,
            timestamp: new Date(),
            totalSources: Object.keys(NEWS_SOURCES).length
        }
    });
    document.dispatchEvent(event);
    
    console.log(`📢 Evento newsLoaded emitido: ${articles.length} noticias`);
}

function showError() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.style.display = 'block';
    }
}

// ============================================
// UTILIDADES
// ============================================

function stripHTML(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function sanitizeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;'
    };
    return String(text).replace(/[&<>"'\/]/g, (s) => map[s]);
}

function classifyNewsByCIANR(article) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    const tags = [];
    
    const confidentialityKeywords = ['leak', 'breach', 'data exposure', 'filtración', 'exposición', 'stolen data', 'data theft'];
    const integrityKeywords = ['malware', 'ransomware', 'tampering', 'modificación', 'corruption', 'altered'];
    const availabilityKeywords = ['ddos', 'outage', 'downtime', 'caída', 'denegación', 'denial of service'];
    const nonRepudiationKeywords = ['phishing', 'spoofing', 'impersonation', 'suplantación', 'fraud', 'fake'];
    
    if (confidentialityKeywords.some(k => text.includes(k))) {
        tags.push({ type: 'confidentiality', label: 'C', icon: '🔴' });
    }
    if (integrityKeywords.some(k => text.includes(k))) {
        tags.push({ type: 'integrity', label: 'I', icon: '🔵' });
    }
    if (availabilityKeywords.some(k => text.includes(k))) {
        tags.push({ type: 'availability', label: 'A', icon: '🟠' });
    }
    if (nonRepudiationKeywords.some(k => text.includes(k))) {
        tags.push({ type: 'non-repudiation', label: 'NR', icon: '🟣' });
    }
    
    return tags;
}

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

function renderNews(articles) {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;
    
    newsContainer.innerHTML = '';
    
    if (!articles || articles.length === 0) {
        newsContainer.innerHTML = '<p style="text-align: center; padding: 3rem; color: #999;">No se encontraron noticias.</p>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    const groups = groupArticlesByDate(articles);
    
    Object.keys(groups).forEach(groupKey => {
        const group = groups[groupKey];
        
        if (group.articles.length > 0) {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'news-date-group';
            groupHeader.innerHTML = `
                <h3 class="date-group-header">
                    <span class="date-icon">📅</span>
                    ${group.label}
                    <span class="date-count">(${group.articles.length})</span>
                </h3>
            `;
            fragment.appendChild(groupHeader);
            
            const groupContainer = document.createElement('div');
            groupContainer.className = 'news-group-container';
            
            group.articles.forEach(article => {
                const newsCard = createNewsCard(article);
                groupContainer.appendChild(newsCard);
            });
            
            fragment.appendChild(groupContainer);
        }
    });
    
    newsContainer.appendChild(fragment);
}

function createNewsCard(article) {
    const card = document.createElement('article');
    card.className = 'news-card';
    
    const description = stripHTML(article.description || '');
    const truncatedDesc = description.length > 200 ? description.substring(0, 200) + '...' : description;
    
    const pubDate = new Date(article.pubDate);
    const formattedTime = pubDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const thumbnail = article.thumbnail || '';
    const ciaTags = classifyNewsByCIANR(article);
    
    const ciaTagsHTML = ciaTags.map(tag => `
        <span class="cia-tag cia-${tag.type}" title="${tag.label}">
            ${tag.icon} ${tag.label}
        </span>
    `).join('');
    
    let metadataBadgesHTML = '';
    if (article.metadata) {
        const meta = article.metadata;
        const badges = [];
        
        if (meta.relevanceScore >= 80) {
            badges.push(`<span class="meta-badge priority-high">⭐ ${meta.relevanceScore}%</span>`);
        }
        
        if (meta.cves.length > 0) {
            badges.push(`<span class="meta-badge cve-badge">${meta.cves.length} CVE</span>`);
        }
        
        if (meta.cvssScore !== null) {
            const cvssClass = meta.cvssScore >= 9.0 ? 'critical' : meta.cvssScore >= 7.0 ? 'high' : 'medium';
            badges.push(`<span class="meta-badge cvss-${cvssClass}">CVSS: ${meta.cvssScore.toFixed(1)}</span>`);
        }
        
        if (meta.patchAvailable) {
            badges.push(`<span class="meta-badge patch-available">✅ Parche</span>`);
        }
        
        metadataBadgesHTML = badges.length > 0 ? `
            <div class="metadata-badges">
                ${badges.join('')}
            </div>
        ` : '';
    }
    
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
        
        ${metadataBadgesHTML}
        
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
// FILTROS
// ============================================
function initFilters() {
    const categoryButtons = document.querySelectorAll('[data-filter="category"]');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterNewsByCategory(this.dataset.category);
        });
    });
}

function filterNewsByCategory(category) {
    if (!window.newsData) return;
    
    const filtered = category === 'all' 
        ? window.newsData 
        : window.newsData.filter(article => article.sourceCategory === category);
    
    renderNews(filtered);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ News Loader OPTIMIZADO v2.2 - 16 FUENTES inicializado');
    console.log(`📰 ${Object.keys(NEWS_SOURCES).length} fuentes configuradas`);
    console.log(`⚡ Timeout: ${PERFORMANCE_CONFIG.REQUEST_TIMEOUT / 1000}s | Reintentos: ${PERFORMANCE_CONFIG.MAX_RETRIES}`);
    
    loadAllNewsProgressive();
    initFilters();
});

// Exponer funciones globales
window.loadAllNews = loadAllNewsProgressive;
window.clearNewsCache = clearCache;
window.renderNews = renderNews;

console.log('🚀 News Loader OPTIMIZADO v2.2 - 16 FUENTES cargado');