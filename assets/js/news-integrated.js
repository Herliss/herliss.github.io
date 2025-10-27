/**
 * News Loader - Carga de Noticias desde RSS Feeds
 * Implementación segura siguiendo OWASP
 * Actualizado con múltiples fuentes de ciberseguridad
 */

'use strict';

// ============================================
// CONFIGURACIÓN DE FUENTES RSS
// ============================================
const NEWS_SOURCES = {
    // === NOTICIAS GENERALES ===
    thehackernews: {
        name: 'The Hacker News',
        rss: 'https://feeds.feedburner.com/TheHackersNews',
        color: '#e74c3c',
        category: 'general'
    },
    bleepingcomputer: {
        name: 'BleepingComputer',
        rss: 'https://www.bleepingcomputer.com/feed/',
        color: '#2ecc71',
        category: 'general'
    },
    securityweek: {
        name: 'SecurityWeek',
        rss: 'https://www.securityweek.com/rss/',
        color: '#e67e22',
        category: 'general'
    },
    darkreading: {
        name: 'Dark Reading',
        rss: 'https://www.darkreading.com/rss.xml',
        color: '#9b59b6',
        category: 'general'
    },
    krebs: {
        name: 'Krebs on Security',
        rss: 'https://krebsonsecurity.com/feed/',
        color: '#3498db',
        category: 'general'
    },
    scmagazine: {
        name: 'SC Magazine',
        rss: 'https://www.scmagazine.com/home/feed/',
        color: '#1abc9c',
        category: 'general'
    },
    cybernews: {
        name: 'Cybernews',
        rss: 'https://cybernews.com/feed/',
        color: '#34495e',
        category: 'general'
    },
    
    // === INTELIGENCIA DE AMENAZAS ===
    uscert: {
        name: 'US-CERT (CISA)',
        rss: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
        color: '#c0392b',
        category: 'intelligence'
    },
    talos: {
        name: 'Talos Intelligence',
        rss: 'https://blog.talosintelligence.com/feeds/posts/default',
        color: '#16a085',
        category: 'intelligence'
    },
    virustotal: {
        name: 'VirusTotal Blog',
        rss: 'https://blog.virustotal.com/feeds/posts/default',
        color: '#27ae60',
        category: 'intelligence'
    },
    
    // === BLOGS CORPORATIVOS ===
    googlecloud: {
        name: 'Google Cloud Security',
        rss: 'https://cloud.google.com/blog/topics/security/rss/',
        color: '#4285f4',
        category: 'corporate'
    },
    microsoft: {
        name: 'Microsoft Security',
        rss: 'https://www.microsoft.com/security/blog/feed/',
        color: '#00a4ef',
        category: 'corporate'
    },
    cisco: {
        name: 'Cisco Security',
        rss: 'https://blogs.cisco.com/security/feed',
        color: '#049fd9',
        category: 'corporate'
    },
    paloalto: {
        name: 'Palo Alto Unit42',
        rss: 'https://unit42.paloaltonetworks.com/feed/',
        color: '#fa582d',
        category: 'corporate'
    },
    crowdstrike: {
        name: 'CrowdStrike',
        rss: 'https://www.crowdstrike.com/blog/feed/',
        color: '#e01f3d',
        category: 'corporate'
    },
    mandiant: {
        name: 'Mandiant',
        rss: 'https://www.mandiant.com/resources/rss',
        color: '#ff6b35',
        category: 'corporate'
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
            sourceColor: source.color,
            sourceCategory: source.category
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
        
        // NUEVO: Enriquecer cada artículo con metadata avanzada
        if (window.AdvancedFilters) {
            allArticles = allArticles.map(article => 
                window.AdvancedFilters.enrichArticleMetadata(article)
            );
            
            // Ordenar por prioridad de CISO
            allArticles = window.AdvancedFilters.sortByPriority(allArticles);
            
            // Calcular estadísticas
            const stats = window.AdvancedFilters.calculateMetadataStats(allArticles);
            console.log('📊 Estadísticas de Metadata:', stats);
            
            // Actualizar estadísticas en el sidebar
            updateMetadataStats(stats);
        } else {
            // Fallback: ordenar solo por fecha
            allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        }
        
        // Guardar en memoria para filtros
        window.newsData = allArticles;
        window.unfilteredNewsData = [...allArticles]; // Copia sin filtrar
        
        // Mostrar contador de noticias cargadas
        console.log(`✅ ${allArticles.length} noticias cargadas y enriquecidas`);
        
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
        'database', 'dump', 'backdoor', 'unauthorized access', 'privacy',
        'confidential', 'secret', 'classified'
    ];
    
    // Integridad - palabras clave relacionadas con modificación/corrupción
    const integrityKeywords = [
        'malware', 'ransomware', 'trojan', 'virus', 'worm', 'corruption',
        'modified', 'altered', 'tampering', 'injection', 'modificación',
        'alterado', 'corrupto', 'troyano', 'gusano', 'rootkit', 'backdoor',
        'supply chain', 'compromised', 'infected', 'exploit', 'vulnerability',
        'zero-day', 'patch', 'update', 'cve'
    ];
    
    // Disponibilidad - palabras clave relacionadas con interrupción de servicio
    const availabilityKeywords = [
        'ddos', 'dos', 'outage', 'downtime', 'unavailable', 'disruption',
        'denial of service', 'crashed', 'offline', 'caída', 'interrupción',
        'inaccesible', 'fuera de servicio', 'denegación', 'desconexión',
        'failure', 'disaster', 'recovery'
    ];
    
    // No Repudio - palabras clave relacionadas con autenticación/identidad
    const nonRepudiationKeywords = [
        'authentication', 'identity', 'fraud', 'phishing', 'impersonation',
        'spoofing', 'autenticación', 'identidad', 'fraude', 'suplantación',
        'falsificación', 'mfa', '2fa', 'biometric', 'certificate', 'signature',
        'social engineering', 'ingeniería social', 'scam', 'fake'
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
    
    // NUEVO: Generar badges de metadata (CVE, CVSS, Threat Actors, etc.)
    let metadataBadgesHTML = '';
    if (article.metadata) {
        const meta = article.metadata;
        const badges = [];
        
        // Relevance Score
        if (meta.relevanceScore >= 80) {
            badges.push(`<span class="meta-badge priority-high" title="Alta Prioridad">⭐ ${meta.relevanceScore}%</span>`);
        } else if (meta.relevanceScore >= 50) {
            badges.push(`<span class="meta-badge priority-medium" title="Prioridad Media">📊 ${meta.relevanceScore}%</span>`);
        }
        
        // CVEs
        if (meta.cves.length > 0) {
            badges.push(`<span class="meta-badge cve-badge" title="${meta.cves.join(', ')}">${meta.cves.length} CVE${meta.cves.length > 1 ? 's' : ''}</span>`);
        }
        
        // CVSS Score
        if (meta.cvssScore !== null) {
            const cvssClass = meta.cvssScore >= 9.0 ? 'critical' : meta.cvssScore >= 7.0 ? 'high' : 'medium';
            badges.push(`<span class="meta-badge cvss-${cvssClass}" title="CVSS Score">CVSS: ${meta.cvssScore.toFixed(1)}</span>`);
        }
        
        // Threat Actors
        if (meta.threatActors.length > 0) {
            badges.push(`<span class="meta-badge threat-actor" title="${meta.threatActors.join(', ')}">👤 ${meta.threatActors[0]}${meta.threatActors.length > 1 ? ' +' + (meta.threatActors.length - 1) : ''}</span>`);
        }
        
        // Productos Afectados
        if (meta.affectedProducts.length > 0) {
            badges.push(`<span class="meta-badge product-badge" title="${meta.affectedProducts.join(', ')}">💻 ${meta.affectedProducts.length} Productos</span>`);
        }
        
        // Parche Disponible
        if (meta.patchAvailable) {
            badges.push(`<span class="meta-badge patch-available" title="Parche Disponible">✅ Parche</span>`);
        }
        
        // IOCs
        const totalIOCs = meta.iocs.ips.length + meta.iocs.hashes.length + meta.iocs.domains.length;
        if (totalIOCs > 0) {
            badges.push(`<span class="meta-badge ioc-badge" title="Indicadores de Compromiso">🔍 ${totalIOCs} IOCs</span>`);
        }
        
        // MITRE ATT&CK
        if (meta.mitreAttackTechniques.length > 0) {
            badges.push(`<span class="meta-badge mitre-badge" title="${meta.mitreAttackTechniques.join(', ')}">🎯 ${meta.mitreAttackTechniques.length} MITRE</span>`);
        }
        
        // Fuente Oficial
        if (meta.isOfficialSource) {
            badges.push(`<span class="meta-badge official-source" title="Fuente Oficial">✓ Oficial</span>`);
        }
        
        // Regulatorio
        if (meta.regulatoryKeywords.length > 0) {
            badges.push(`<span class="meta-badge regulatory" title="${meta.regulatoryKeywords.join(', ')}">📋 Regulatorio</span>`);
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
// ACTUALIZAR ESTADÍSTICAS DE METADATA
// ============================================
function updateMetadataStats(stats) {
    // Actualizar contador de noticias con CVE
    const cveCountEl = document.getElementById('stat-cve-count');
    if (cveCountEl) cveCountEl.textContent = stats.withCVE;
    
    // Actualizar contador de noticias críticas
    const criticalCountEl = document.getElementById('stat-critical-count');
    if (criticalCountEl) criticalCountEl.textContent = stats.critical;
    
    // Actualizar score promedio de relevancia
    const avgScoreEl = document.getElementById('stat-avg-score');
    if (avgScoreEl) avgScoreEl.textContent = `${stats.avgRelevanceScore}%`;
    
    // Actualizar contador de IOCs
    const iocCountEl = document.getElementById('stat-ioc-count');
    if (iocCountEl) iocCountEl.textContent = stats.withIOCs;
    
    // Actualizar top threat actors
    const topThreatsEl = document.getElementById('top-threat-actors');
    if (topThreatsEl) {
        const sorted = Object.entries(stats.topThreatActors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        topThreatsEl.innerHTML = sorted.length > 0 
            ? sorted.map(([name, count]) => `<li>👤 ${name} (${count})</li>`).join('')
            : '<li>Sin amenazas detectadas</li>';
    }
    
    // Actualizar top productos
    const topProductsEl = document.getElementById('top-products');
    if (topProductsEl) {
        const sorted = Object.entries(stats.topProducts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        topProductsEl.innerHTML = sorted.length > 0
            ? sorted.map(([name, count]) => `<li>💻 ${name} (${count})</li>`).join('')
            : '<li>Sin productos detectados</li>';
    }
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
            
            const filterType = this.dataset.filter;
            const filterValue = this.dataset.source || this.dataset.category;
            
            if (filterType === 'source') {
                filterNewsBySource(filterValue);
            } else if (filterType === 'category') {
                filterNewsByCategory(filterValue);
            }
        });
    });
    
    // NUEVO: Inicializar filtros avanzados de CISO
    initAdvancedFilters();
}

// ============================================
// FILTROS AVANZADOS DE CISO
// ============================================
function initAdvancedFilters() {
    // Filtro: Solo con CVE
    const cveCheckbox = document.getElementById('filter-only-cve');
    if (cveCheckbox) {
        cveCheckbox.addEventListener('change', applyCurrentFilters);
    }
    
    // Filtro: CVSS mínimo
    const cvssSlider = document.getElementById('filter-min-cvss');
    const cvssValue = document.getElementById('cvss-value');
    if (cvssSlider && cvssValue) {
        cvssSlider.addEventListener('input', function() {
            cvssValue.textContent = this.value;
            applyCurrentFilters();
        });
    }
    
    // Filtro: Solo con parche
    const patchCheckbox = document.getElementById('filter-only-patch');
    if (patchCheckbox) {
        patchCheckbox.addEventListener('change', applyCurrentFilters);
    }
    
    // Filtro: Solo fuentes oficiales
    const officialCheckbox = document.getElementById('filter-only-official');
    if (officialCheckbox) {
        officialCheckbox.addEventListener('change', applyCurrentFilters);
    }
    
    // Filtro: Últimos N días
    const daysSelect = document.getElementById('filter-max-days');
    if (daysSelect) {
        daysSelect.addEventListener('change', applyCurrentFilters);
    }
    
    // Filtro: Nivel de severidad
    const severitySelect = document.getElementById('filter-severity');
    if (severitySelect) {
        severitySelect.addEventListener('change', applyCurrentFilters);
    }
    
    // Filtro: Relevance score mínimo
    const relevanceSlider = document.getElementById('filter-min-relevance');
    const relevanceValue = document.getElementById('relevance-value');
    if (relevanceSlider && relevanceValue) {
        relevanceSlider.addEventListener('input', function() {
            relevanceValue.textContent = this.value + '%';
            applyCurrentFilters();
        });
    }
    
    // Filtro: Solo con IOCs
    const iocCheckbox = document.getElementById('filter-only-iocs');
    if (iocCheckbox) {
        iocCheckbox.addEventListener('change', applyCurrentFilters);
    }
    
    // Filtro: Solo regulatorio
    const regulatoryCheckbox = document.getElementById('filter-only-regulatory');
    if (regulatoryCheckbox) {
        regulatoryCheckbox.addEventListener('change', applyCurrentFilters);
    }
    
    // Botón: Limpiar filtros
    const clearButton = document.getElementById('clear-advanced-filters');
    if (clearButton) {
        clearButton.addEventListener('click', clearAdvancedFilters);
    }
    
    // Botón: Aplicar filtros (redundante pero útil para UX)
    const applyButton = document.getElementById('apply-advanced-filters');
    if (applyButton) {
        applyButton.addEventListener('click', applyCurrentFilters);
    }
}

function applyCurrentFilters() {
    if (!window.unfilteredNewsData || !window.AdvancedFilters) return;
    
    // Construir objeto de filtros
    const filters = {};
    
    // Solo con CVE
    const cveCheckbox = document.getElementById('filter-only-cve');
    if (cveCheckbox && cveCheckbox.checked) {
        filters.onlyWithCVE = true;
    }
    
    // CVSS mínimo
    const cvssSlider = document.getElementById('filter-min-cvss');
    if (cvssSlider && cvssSlider.value > 0) {
        filters.minCVSS = parseFloat(cvssSlider.value);
    }
    
    // Solo con parche
    const patchCheckbox = document.getElementById('filter-only-patch');
    if (patchCheckbox && patchCheckbox.checked) {
        filters.onlyWithPatch = true;
    }
    
    // Solo fuentes oficiales
    const officialCheckbox = document.getElementById('filter-only-official');
    if (officialCheckbox && officialCheckbox.checked) {
        filters.onlyOfficialSources = true;
    }
    
    // Últimos N días
    const daysSelect = document.getElementById('filter-max-days');
    if (daysSelect && daysSelect.value !== 'all') {
        filters.maxDaysOld = parseInt(daysSelect.value);
    }
    
    // Nivel de severidad
    const severitySelect = document.getElementById('filter-severity');
    if (severitySelect && severitySelect.value !== 'all') {
        filters.severityLevel = severitySelect.value;
    }
    
    // Relevance score mínimo
    const relevanceSlider = document.getElementById('filter-min-relevance');
    if (relevanceSlider && relevanceSlider.value > 0) {
        filters.minRelevanceScore = parseInt(relevanceSlider.value);
    }
    
    // Solo con IOCs
    const iocCheckbox = document.getElementById('filter-only-iocs');
    if (iocCheckbox && iocCheckbox.checked) {
        filters.onlyWithIOCs = true;
    }
    
    // Solo regulatorio
    const regulatoryCheckbox = document.getElementById('filter-only-regulatory');
    if (regulatoryCheckbox && regulatoryCheckbox.checked) {
        filters.onlyRegulatory = true;
    }
    
    // Aplicar filtros
    let filtered = window.AdvancedFilters.applyAdvancedFilters(
        window.unfilteredNewsData, 
        filters
    );
    
    // Guardar en memoria
    window.newsData = filtered;
    
    // Actualizar contador
    const countEl = document.getElementById('filtered-count');
    if (countEl) {
        countEl.textContent = `${filtered.length} de ${window.unfilteredNewsData.length}`;
    }
    
    // Renderizar
    renderNews(filtered);
    
    console.log(`🔍 Filtros aplicados: ${filtered.length} noticias mostradas`, filters);
}

function clearAdvancedFilters() {
    // Limpiar todos los controles
    const cveCheckbox = document.getElementById('filter-only-cve');
    if (cveCheckbox) cveCheckbox.checked = false;
    
    const cvssSlider = document.getElementById('filter-min-cvss');
    const cvssValue = document.getElementById('cvss-value');
    if (cvssSlider && cvssValue) {
        cvssSlider.value = 0;
        cvssValue.textContent = '0.0';
    }
    
    const patchCheckbox = document.getElementById('filter-only-patch');
    if (patchCheckbox) patchCheckbox.checked = false;
    
    const officialCheckbox = document.getElementById('filter-only-official');
    if (officialCheckbox) officialCheckbox.checked = false;
    
    const daysSelect = document.getElementById('filter-max-days');
    if (daysSelect) daysSelect.value = 'all';
    
    const severitySelect = document.getElementById('filter-severity');
    if (severitySelect) severitySelect.value = 'all';
    
    const relevanceSlider = document.getElementById('filter-min-relevance');
    const relevanceValue = document.getElementById('relevance-value');
    if (relevanceSlider && relevanceValue) {
        relevanceSlider.value = 0;
        relevanceValue.textContent = '0%';
    }
    
    const iocCheckbox = document.getElementById('filter-only-iocs');
    if (iocCheckbox) iocCheckbox.checked = false;
    
    const regulatoryCheckbox = document.getElementById('filter-only-regulatory');
    if (regulatoryCheckbox) regulatoryCheckbox.checked = false;
    
    // Restaurar todas las noticias
    if (window.unfilteredNewsData) {
        window.newsData = [...window.unfilteredNewsData];
        renderNews(window.newsData);
        
        const countEl = document.getElementById('filtered-count');
        if (countEl) {
            countEl.textContent = `${window.newsData.length} de ${window.unfilteredNewsData.length}`;
        }
    }
    
    console.log('🔄 Filtros limpiados');
}

function filterNewsBySource(source) {
    if (!window.newsData) return;
    
    let filteredArticles;
    
    if (source === 'all') {
        filteredArticles = window.newsData;
    } else {
        filteredArticles = window.newsData.filter(article => article.source === source);
    }
    
    renderNews(filteredArticles);
}

function filterNewsByCategory(category) {
    if (!window.newsData) return;
    
    let filteredArticles;
    
    if (category === 'all') {
        filteredArticles = window.newsData;
    } else {
        filteredArticles = window.newsData.filter(article => article.sourceCategory === category);
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
        if (btn.dataset.source === 'all' || btn.dataset.category === 'all') {
            btn.classList.add('active');
        }
    });
}

// ============================================
// REFRESH AUTOMÁTICO (cada 10 minutos)
// ============================================
function startAutoRefresh() {
    // Refresh cada 10 minutos
    setInterval(() => {
        console.log('🔄 Actualizando noticias...');
        loadAllNews();
    }, 10 * 60 * 1000);
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
    console.log(`📰 Fuentes disponibles: ${Object.keys(NEWS_SOURCES).length}`);
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
        stripHTML,
        NEWS_SOURCES
    };
}