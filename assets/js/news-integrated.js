/**
 * News Loader - SOLUCIÓN DEFINITIVA
 * Parsea RSS directamente sin depender de servicios externos
 * Compatible con TODAS las fuentes RSS
 */

'use strict';

// ============================================
// CONFIGURACIÓN PRINCIPAL
// ============================================

// 🎚️ AJUSTA ESTO SEGÚN TUS NECESIDADES
const MAX_ARTICLES_PER_SOURCE = 20;  // Valores recomendados: 10 (rápido), 20 (balance), 50 (máximo)

// ============================================
// CONFIGURACIÓN DE FUENTES RSS
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
    uscert: {
        name: 'US-CERT (CISA)',
        rss: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
        color: '#c0392b',
        category: 'intelligence',
        priority: 1
    },
    talos: {
        name: 'Talos Intelligence',
        rss: 'https://blog.talosintelligence.com/feeds/posts/default',
        color: '#16a085',
        category: 'intelligence',
        priority: 2
    },
    virustotal: {
        name: 'VirusTotal Blog',
        rss: 'https://blog.virustotal.com/feeds/posts/default',
        color: '#27ae60',
        category: 'intelligence',
        priority: 3
    },
    googlecloud: {
        name: 'Google Cloud Security',
        rss: 'https://cloud.google.com/blog/topics/security/rss/',
        color: '#4285f4',
        category: 'corporate',
        priority: 2
    },
    microsoft: {
        name: 'Microsoft Security',
        rss: 'https://www.microsoft.com/security/blog/feed/',
        color: '#00a4ef',
        category: 'corporate',
        priority: 1
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

// ============================================
// PARSER RSS NATIVO
// ============================================
async function parseRSSFeed(rssUrl) {
    try {
        // Usar CORS proxy para evitar problemas de CORS
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/xml, text/xml, application/rss+xml'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const xmlText = await response.text();
        
        // Parsear XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Verificar errores de parsing
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Error parseando XML');
        }
        
        // Extraer items (funciona con RSS 2.0, Atom, y RSS 1.0)
        const items = [];
        
        // Intentar RSS 2.0
        const rssItems = xmlDoc.querySelectorAll('item');
        if (rssItems.length > 0) {
            rssItems.forEach((item, index) => {
                if (index < MAX_ARTICLES_PER_SOURCE) {
                    items.push(parseRSSItem(item));
                }
            });
        } else {
            // Intentar Atom
            const atomEntries = xmlDoc.querySelectorAll('entry');
            atomEntries.forEach((entry, index) => {
                if (index < MAX_ARTICLES_PER_SOURCE) {
                    items.push(parseAtomEntry(entry));
                }
            });
        }
        
        return items;
        
    } catch (error) {
        console.error('Error parseando RSS:', error);
        return [];
    }
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
    // Intentar varios formatos de imagen
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
// CARGAR NOTICIA DESDE UNA FUENTE
// ============================================
async function loadNewsFromSource(sourceKey) {
    const source = NEWS_SOURCES[sourceKey];
    
    try {
        console.log(`🔄 Cargando ${source.name}...`);
        
        const items = await parseRSSFeed(source.rss);
        
        if (items.length === 0) {
            console.warn(`⚠️ ${source.name}: No se encontraron artículos`);
            return [];
        }
        
        console.log(`✅ ${source.name}: ${items.length} artículos`);
        
        // Agregar información de la fuente a cada artículo
        return items.map(item => ({
            ...item,
            source: sourceKey,
            sourceName: source.name,
            sourceColor: source.color,
            sourceCategory: source.category
        }));
        
    } catch (error) {
        console.error(`❌ ${source.name}: ${error.message}`);
        return [];
    }
}

// ============================================
// SISTEMA DE CACHÉ
// ============================================
const CACHE_KEY = 'cybersec_news_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

function saveToCache(data) {
    try {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('💾 Caché guardado');
    } catch (e) {
        console.warn('⚠️ Error guardando caché:', e.message);
    }
}

function loadFromCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;
        
        if (age < CACHE_DURATION) {
            console.log(`✅ Cargando desde caché (${Math.round(age/60000)} min)`);
            return cacheData.data;
        } else {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
    } catch (e) {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
}

// ============================================
// CARGAR TODAS LAS NOTICIAS
// ============================================
async function loadAllNews() {
    const loading = document.getElementById('loading-indicator');
    const newsContainer = document.getElementById('news-container');
    const errorMessage = document.getElementById('error-message');
    
    if (loading) loading.style.display = 'block';
    if (newsContainer) newsContainer.innerHTML = '';
    if (errorMessage) errorMessage.style.display = 'none';
    
    try {
        // Intentar cargar desde caché
        const cachedData = loadFromCache();
        if (cachedData && cachedData.length > 0) {
            // Enriquecer datos del caché antes de usarlos
            const enrichedCache = await enrichAndSortArticles([...cachedData]);
            window.newsData = enrichedCache;
            window.unfilteredNewsData = [...enrichedCache];
            renderNews(enrichedCache);
            if (loading) loading.style.display = 'none';
            emitNewsLoadedEvent(enrichedCache);
            
            // Actualizar en background
            setTimeout(() => loadNewsInBackground(), 3000);
            return;
        }
        
        console.log('🔄 Cargando noticias desde RSS...');
        
        const allArticles = [];
        const sourceKeys = Object.keys(NEWS_SOURCES);
        
        // Cargar de 2 en 2 con delay de 2 segundos
        for (let i = 0; i < sourceKeys.length; i += 2) {
            const batch = sourceKeys.slice(i, i + 2);
            const promises = batch.map(key => loadNewsFromSource(key));
            const results = await Promise.all(promises);
            
            results.forEach(articles => {
                if (articles.length > 0) {
                    allArticles.push(...articles);
                }
            });
            
            // Actualizar vista cada 2 fuentes
            if (allArticles.length > 0) {
                const enriched = await enrichAndSortArticles([...allArticles]);
                window.newsData = enriched;
                window.unfilteredNewsData = [...enriched];
                renderNews(enriched);
            }
            
            // Delay de 2 segundos entre batches
            if (i + 2 < sourceKeys.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (loading) loading.style.display = 'none';
        
        if (allArticles.length === 0) {
            if (errorMessage) {
                errorMessage.textContent = 'No se pudieron cargar noticias. Intenta recargar la página.';
                errorMessage.style.display = 'block';
            }
            return;
        }
        
        // Guardar en caché y emitir evento con datos ENRIQUECIDOS
        const finalEnriched = await enrichAndSortArticles([...allArticles]);
        window.newsData = finalEnriched;
        window.unfilteredNewsData = [...finalEnriched];
        saveToCache(finalEnriched);
        emitNewsLoadedEvent(finalEnriched);
        renderNews(finalEnriched);
        
        console.log(`✅ ${finalEnriched.length} noticias cargadas y enriquecidas`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        if (errorMessage) {
            errorMessage.textContent = 'Error al cargar noticias. Por favor, recarga la página.';
            errorMessage.style.display = 'block';
        }
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

async function loadNewsInBackground() {
    try {
        console.log('🔄 Actualizando en background...');
        
        const allArticles = [];
        const sourceKeys = Object.keys(NEWS_SOURCES);
        
        for (let i = 0; i < sourceKeys.length; i += 2) {
            const batch = sourceKeys.slice(i, i + 2);
            const promises = batch.map(key => loadNewsFromSource(key));
            const results = await Promise.all(promises);
            
            results.forEach(articles => {
                if (articles.length > 0) {
                    allArticles.push(...articles);
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (allArticles.length > 0) {
            saveToCache(allArticles);
            console.log(`✅ Caché actualizado: ${allArticles.length} noticias`);
        }
    } catch (error) {
        console.error('❌ Error en actualización:', error);
    }
}

// ============================================
// ENRIQUECER ARTÍCULOS
// ============================================
async function enrichAndSortArticles(articles) {
    if (window.AdvancedFilters) {
        articles = articles.map(article => 
            window.AdvancedFilters.enrichArticleMetadata(article)
        );
        articles = window.AdvancedFilters.sortByPriority(articles);
    } else {
        articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }
    return articles;
}

// ============================================
// EMIT EVENT
// ============================================
function emitNewsLoadedEvent(articles) {
    const event = new CustomEvent('newsLoaded', {
        detail: {
            articles: articles,
            timestamp: new Date()
        }
    });
    document.dispatchEvent(event);
}

// ============================================
// CLASIFICACIÓN CIA+NR
// ============================================
function classifyNewsByCIANR(article) {
    const text = (article.title + ' ' + article.description).toLowerCase();
    const tags = [];
    
    const confidentialityKeywords = [
        'breach', 'leak', 'exposed', 'stolen', 'data theft', 'credentials',
        'password', 'filtración', 'fuga', 'sensitive data', 'privacy'
    ];
    
    const integrityKeywords = [
        'malware', 'ransomware', 'trojan', 'virus', 'corruption',
        'modified', 'tamper', 'injection', 'exploit', 'vulnerability', 'cve'
    ];
    
    const availabilityKeywords = [
        'ddos', 'dos', 'outage', 'downtime', 'unavailable', 'disruption',
        'denial of service', 'crashed', 'offline'
    ];
    
    const nonRepudiationKeywords = [
        'authentication', 'identity', 'fraud', 'phishing', 'impersonation',
        'spoofing', 'mfa', '2fa', 'certificate', 'signature'
    ];
    
    if (confidentialityKeywords.some(k => text.includes(k))) {
        tags.push({ type: 'confidentiality', label: 'Confidencialidad', icon: '🔒' });
    }
    
    if (integrityKeywords.some(k => text.includes(k))) {
        tags.push({ type: 'integrity', label: 'Integridad', icon: '✅' });
    }
    
    if (availabilityKeywords.some(k => text.includes(k))) {
        tags.push({ type: 'availability', label: 'Disponibilidad', icon: '⚡' });
    }
    
    if (nonRepudiationKeywords.some(k => text.includes(k))) {
        tags.push({ type: 'non-repudiation', label: 'No Repudio', icon: '📝' });
    }
    
    if (tags.length === 0) {
        tags.push({ type: 'integrity', label: 'Integridad', icon: '✅' });
    }
    
    return tags;
}

// ============================================
// SANITIZACIÓN
// ============================================
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function stripHTML(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

// ============================================
// RENDERIZAR NOTICIAS
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
    const sourceButtons = document.querySelectorAll('[data-filter="source"]');
    sourceButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            sourceButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterNewsBySource(this.dataset.source);
        });
    });
    
    const categoryButtons = document.querySelectorAll('[data-filter="category"]');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterNewsByCategory(this.dataset.category);
        });
    });
}

function filterNewsBySource(source) {
    if (!window.newsData) return;
    
    const filtered = source === 'all' 
        ? window.newsData 
        : window.newsData.filter(article => article.source === source);
    
    renderNews(filtered);
}

function filterNewsByCategory(category) {
    if (!window.newsData) return;
    
    const filtered = category === 'all' 
        ? window.newsData 
        : window.newsData.filter(article => article.sourceCategory === category);
    
    renderNews(filtered);
}

// ============================================
// REFRESH AUTOMÁTICO
// ============================================
function startAutoRefresh() {
    setInterval(() => {
        console.log('🔄 Auto-refresh...');
        loadNewsInBackground();
    }, 10 * 60 * 1000);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ News Loader inicializado (Parser RSS nativo)');
    console.log(`📰 ${Object.keys(NEWS_SOURCES).length} fuentes configuradas`);
    
    loadAllNews();
    initFilters();
    startAutoRefresh();
});

window.addEventListener('error', function(e) {
    console.error('❌ Error:', e.message);
});