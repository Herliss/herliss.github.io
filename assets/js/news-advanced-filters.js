/**
 * Advanced Metadata Extraction & Filtering for CISO
 * VERSIÓN OPTIMIZADA con caché de regex y procesamiento eficiente
 * 
 * Autor: Herliss Briceño
 * Fecha: Octubre 2025
 */

'use strict';

// ============================================
// CONFIGURACIÓN DE FILTROS AVANZADOS
// ============================================

// Threat Actors conocidos y activos
const KNOWN_THREAT_ACTORS = [
    'Lazarus', 'APT29', 'APT28', 'APT41', 'APT38', 'FIN7', 'FIN8', 'TA505', 
    'Carbanak', 'Sandworm', 'Turla', 'Kimsuky', 'Winnti', 'Cozy Bear', 
    'Fancy Bear', 'Equation Group', 'DarkSide', 'REvil', 'Conti', 'LockBit',
    'BlackCat', 'ALPHV', 'Cl0p', 'Hive', 'Vice Society', 'BlackBasta'
];

// Productos/Tecnologías críticas a monitorear
const CRITICAL_PRODUCTS = [
    'Windows Server', 'Exchange', 'Active Directory', 'SharePoint', 'Azure',
    'Office 365', 'Microsoft 365', 'Fortinet', 'FortiGate', 'Cisco', 'Palo Alto',
    'VMware', 'vSphere', 'ESXi', 'Citrix', 'VPN', 'Firewall', 'Apache', 'nginx',
    'SAP', 'Oracle', 'PostgreSQL', 'MySQL', 'Redis', 'MongoDB', 'Kubernetes',
    'Docker', 'Jenkins', 'GitLab', 'Linux', 'Ubuntu', 'Red Hat', 'CentOS'
];

// Técnicas MITRE ATT&CK de alta prioridad
const PRIORITY_ATTACK_TECHNIQUES = [
    'T1078', 'T1190', 'T1566', 'T1059', 'T1003', 'T1486', 'T1021',
    'T1027', 'T1057', 'T1087', 'T1547', 'T1053', 'T1569', 'T1204',
    'T1560', 'T1048', 'T1567'
];

// Fuentes oficiales de alta confianza
const OFFICIAL_SOURCES = [
    'US-CERT (CISA)', 'Microsoft Security', 'Google Cloud Security',
    'NIST', 'ENISA', 'Cisco Security', 'Palo Alto Unit42',
    'CrowdStrike', 'Mandiant', 'Talos Intelligence'
];

// Keywords regulatorios
const REGULATORY_KEYWORDS = [
    'DORA', 'NIS2', 'GDPR', 'ISO 27001', 'ISO 27002', 'NIST', 'PCI DSS',
    'SOC 2', 'HIPAA', 'compliance', 'regulation', 'normativa', 'cumplimiento'
];

// Keywords de impacto crítico
const CRITICAL_IMPACT_KEYWORDS = [
    'critical', 'crítico', 'actively exploited', 'zero-day', 'zero day',
    'mass exploitation', 'widespread', 'emergency patch', 'urgent',
    'immediate action', 'active exploitation', 'in the wild'
];

// ============================================
// CACHÉ DE REGEX (Optimización)
// ============================================
const REGEX_CACHE = {
    cve: /CVE-\d{4}-\d{4,}/gi,
    cvss: /CVSS[:\s]+(\d+\.?\d*)/i,
    mitre: /T\d{4}(\.\d{3})?/gi,
    ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi,
    hash: /\b[a-f0-9]{32}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{64}\b/gi,
    patch: /\b(patch|update|fixed|patched|actualización|parche)\b/i
};

// ============================================
// EXTRACCIÓN DE METADATA (OPTIMIZADO)
// ============================================

/**
 * Extrae CVEs del texto
 */
function extractCVEs(text) {
    const matches = text.match(REGEX_CACHE.cve);
    return matches ? [...new Set(matches.map(cve => cve.toUpperCase()))] : [];
}

/**
 * Extrae CVSS score del texto
 */
function extractCVSS(text) {
    const match = text.match(REGEX_CACHE.cvss);
    if (match) {
        const score = parseFloat(match[1]);
        return score >= 0 && score <= 10 ? score : null;
    }
    return null;
}

/**
 * Extrae técnicas MITRE ATT&CK
 */
function extractMitreAttack(text) {
    const matches = text.match(REGEX_CACHE.mitre);
    return matches ? [...new Set(matches.map(t => t.toUpperCase()))] : [];
}

/**
 * Extrae threat actors mencionados (OPTIMIZADO)
 */
function extractThreatActors(text) {
    const textLower = text.toLowerCase();
    const found = [];
    
    // Optimización: hacer búsqueda de substring antes de regex
    for (const actor of KNOWN_THREAT_ACTORS) {
        if (textLower.includes(actor.toLowerCase())) {
            found.push(actor);
        }
    }
    
    return found;
}

/**
 * Extrae productos afectados (OPTIMIZADO)
 */
function extractAffectedProducts(text) {
    const textLower = text.toLowerCase();
    const found = [];
    
    // Optimización: búsqueda de substring antes de regex
    for (const product of CRITICAL_PRODUCTS) {
        if (textLower.includes(product.toLowerCase())) {
            found.push(product);
        }
    }
    
    return found;
}

/**
 * Detecta si hay parche disponible
 */
function hasPatchAvailable(text) {
    return REGEX_CACHE.patch.test(text);
}

/**
 * Extrae IOCs (IPs, dominios, hashes)
 */
function extractIOCs(text) {
    const ips = text.match(REGEX_CACHE.ip) || [];
    const domains = text.match(REGEX_CACHE.domain) || [];
    const hashes = text.match(REGEX_CACHE.hash) || [];
    
    return {
        ips: [...new Set(ips)].slice(0, 10), // Limitar a 10
        domains: [...new Set(domains)].slice(0, 10),
        hashes: [...new Set(hashes)].slice(0, 10)
    };
}

/**
 * Detecta si es fuente oficial
 */
function isOfficialSource(sourceName) {
    const lower = sourceName.toLowerCase();
    return OFFICIAL_SOURCES.some(official => 
        lower.includes(official.toLowerCase())
    );
}

/**
 * Detecta keywords regulatorios (OPTIMIZADO)
 */
function extractRegulatoryKeywords(text) {
    const textLower = text.toLowerCase();
    const found = [];
    
    for (const keyword of REGULATORY_KEYWORDS) {
        if (textLower.includes(keyword.toLowerCase())) {
            found.push(keyword);
        }
    }
    
    return found;
}

/**
 * Calcula nivel de severidad basado en keywords
 */
function calculateSeverityLevel(text) {
    const textLower = text.toLowerCase();
    
    // Crítico
    if (CRITICAL_IMPACT_KEYWORDS.some(kw => textLower.includes(kw.toLowerCase()))) {
        return 'critical';
    }
    
    // Alto
    const highKeywords = ['high severity', 'severe', 'dangerous'];
    if (highKeywords.some(kw => textLower.includes(kw))) {
        return 'high';
    }
    
    // Medio
    const mediumKeywords = ['moderate', 'medium'];
    if (mediumKeywords.some(kw => textLower.includes(kw))) {
        return 'medium';
    }
    
    return 'low';
}

/**
 * Calcula relevance score (0-100)
 */
function calculateRelevanceScore(article) {
    let score = 0;
    const meta = article.metadata;
    
    if (meta.cves.length > 0) score += 30;
    if (meta.cvssScore >= 8.0) score += 20;
    if (meta.threatActors.length > 0) score += 15;
    if (meta.affectedProducts.length > 0) score += 15;
    if (meta.patchAvailable) score += 10;
    if (meta.isOfficialSource) score += 10;
    if (meta.mitreAttackTechniques.length > 0) score += 10;
    
    const totalIOCs = meta.iocs.ips.length + meta.iocs.hashes.length + meta.iocs.domains.length;
    if (totalIOCs > 0) score += 5;
    if (meta.regulatoryKeywords.length > 0) score += 5;
    
    if (meta.severityLevel === 'critical') score += 10;
    else if (meta.severityLevel === 'high') score += 5;
    
    return Math.min(score, 100);
}

/**
 * Enriquece un artículo con metadata extraída (OPTIMIZADO)
 */
function enrichArticleMetadata(article) {
    // Evitar procesar dos veces
    if (article.metadata && article.metadata.processed) {
        return article;
    }
    
    const fullText = `${article.title} ${article.description || ''}`;
    
    // Extraer metadata (solo lo esencial primero)
    const cves = extractCVEs(fullText);
    const cvssScore = extractCVSS(fullText);
    const severityLevel = calculateSeverityLevel(fullText);
    
    // Solo extraer detalles adicionales si hay CVEs o alta severidad
    let mitreAttackTechniques = [];
    let threatActors = [];
    let affectedProducts = [];
    let iocs = { ips: [], domains: [], hashes: [] };
    
    if (cves.length > 0 || severityLevel === 'critical' || severityLevel === 'high') {
        mitreAttackTechniques = extractMitreAttack(fullText);
        threatActors = extractThreatActors(fullText);
        affectedProducts = extractAffectedProducts(fullText);
        iocs = extractIOCs(fullText);
    }
    
    const patchAvailable = hasPatchAvailable(fullText);
    const isOfficialSrc = isOfficialSource(article.sourceName);
    const regulatoryKeywords = extractRegulatoryKeywords(fullText);
    
    // Calcular días desde publicación
    const pubDate = new Date(article.pubDate);
    const now = new Date();
    const daysSincePublished = Math.floor((now - pubDate) / (1000 * 60 * 60 * 24));
    
    // Agregar metadata al artículo
    article.metadata = {
        cves,
        cvssScore,
        mitreAttackTechniques,
        threatActors,
        affectedProducts,
        patchAvailable,
        iocs,
        isOfficialSource: isOfficialSrc,
        regulatoryKeywords,
        severityLevel,
        daysSincePublished,
        relevanceScore: 0,
        processed: true // Flag para evitar reprocesar
    };
    
    // Calcular score de relevancia
    article.metadata.relevanceScore = calculateRelevanceScore(article);
    
    return article;
}

// ============================================
// FILTROS AVANZADOS
// ============================================

/**
 * Aplica filtros avanzados a un conjunto de artículos
 */
function applyAdvancedFilters(articles, filters) {
    return articles.filter(article => {
        const meta = article.metadata;
        
        // Filtro: Solo con CVE
        if (filters.onlyWithCVE && meta.cves.length === 0) {
            return false;
        }
        
        // Filtro: CVSS mínimo
        if (filters.minCVSS && (meta.cvssScore === null || meta.cvssScore < filters.minCVSS)) {
            return false;
        }
        
        // Filtro: Solo con parche
        if (filters.onlyWithPatch && !meta.patchAvailable) {
            return false;
        }
        
        // Filtro: Solo fuentes oficiales
        if (filters.onlyOfficialSources && !meta.isOfficialSource) {
            return false;
        }
        
        // Filtro: Días máximos
        if (filters.maxDaysOld && meta.daysSincePublished > filters.maxDaysOld) {
            return false;
        }
        
        // Filtro: Nivel de severidad
        if (filters.severityLevel && filters.severityLevel !== 'all') {
            if (meta.severityLevel !== filters.severityLevel) {
                return false;
            }
        }
        
        // Filtro: Relevance score mínimo
        if (filters.minRelevanceScore && meta.relevanceScore < filters.minRelevanceScore) {
            return false;
        }
        
        // Filtro: Solo con IOCs
        if (filters.onlyWithIOCs) {
            const totalIOCs = meta.iocs.ips.length + meta.iocs.hashes.length + meta.iocs.domains.length;
            if (totalIOCs === 0) {
                return false;
            }
        }
        
        // Filtro: Solo regulatorio
        if (filters.onlyRegulatory && meta.regulatoryKeywords.length === 0) {
            return false;
        }
        
        return true;
    });
}

/**
 * Ordena artículos por prioridad de CISO
 */
function sortByPriority(articles) {
    return articles.sort((a, b) => {
        // Primero por relevance score
        if (b.metadata.relevanceScore !== a.metadata.relevanceScore) {
            return b.metadata.relevanceScore - a.metadata.relevanceScore;
        }
        
        // Luego por severidad
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityA = severityOrder[a.metadata.severityLevel] || 0;
        const severityB = severityOrder[b.metadata.severityLevel] || 0;
        
        if (severityB !== severityA) {
            return severityB - severityA;
        }
        
        // Finalmente por fecha
        return new Date(b.pubDate) - new Date(a.pubDate);
    });
}

/**
 * Calcula estadísticas de metadata
 */
function calculateMetadataStats(articles) {
    const stats = {
        totalArticles: articles.length,
        withCVE: 0,
        withHighCVSS: 0,
        withThreatActors: 0,
        withIOCs: 0,
        official: 0,
        regulatory: 0,
        criticalSeverity: 0,
        topProducts: []
    };
    
    const productCount = {};
    
    articles.forEach(article => {
        const meta = article.metadata;
        
        if (meta.cves.length > 0) stats.withCVE++;
        if (meta.cvssScore >= 8.0) stats.withHighCVSS++;
        if (meta.threatActors.length > 0) stats.withThreatActors++;
        if (meta.isOfficialSource) stats.official++;
        if (meta.regulatoryKeywords.length > 0) stats.regulatory++;
        if (meta.severityLevel === 'critical') stats.criticalSeverity++;
        
        const totalIOCs = meta.iocs.ips.length + meta.iocs.hashes.length + meta.iocs.domains.length;
        if (totalIOCs > 0) stats.withIOCs++;
        
        // Contar productos
        meta.affectedProducts.forEach(product => {
            productCount[product] = (productCount[product] || 0) + 1;
        });
    });
    
    // Top 10 productos
    stats.topProducts = Object.entries(productCount)
        .map(([product, count]) => ({ product, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    return stats;
}

// ============================================
// EXPORT PARA USO GLOBAL
// ============================================
window.AdvancedFilters = {
    enrichArticleMetadata,
    applyAdvancedFilters,
    sortByPriority,
    calculateMetadataStats,
    extractCVEs,
    extractCVSS,
    extractMitreAttack,
    extractThreatActors,
    extractAffectedProducts,
    extractIOCs
};

console.log('✅ Advanced Filters OPTIMIZADO cargado');