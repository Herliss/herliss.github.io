/**
 * Advanced Metadata Extraction & Filtering for CISO
 * Extrae y filtra metadata de seguridad de noticias RSS
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
    'T1078', // Valid Accounts
    'T1190', // Exploit Public-Facing Application
    'T1566', // Phishing
    'T1059', // Command and Scripting Interpreter
    'T1003', // OS Credential Dumping
    'T1486', // Data Encrypted for Impact (Ransomware)
    'T1021', // Remote Services
    'T1027', // Obfuscated Files or Information
    'T1057', // Process Discovery
    'T1087', // Account Discovery
    'T1547', // Boot or Logon Autostart Execution
    'T1053', // Scheduled Task/Job
    'T1569', // System Services
    'T1204', // User Execution
    'T1560', // Archive Collected Data
    'T1048', // Exfiltration Over Alternative Protocol
    'T1567'  // Exfiltration Over Web Service
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
    'SOC 2', 'HIPAA', 'compliance', 'regulation', 'normativa', 'cumplimiento',
    'data protection', 'privacy', 'RGPD', 'protección de datos'
];

// Keywords de impacto crítico
const CRITICAL_IMPACT_KEYWORDS = [
    'critical', 'crítico', 'actively exploited', 'zero-day', 'zero day',
    'mass exploitation', 'widespread', 'emergency patch', 'urgent',
    'immediate action', 'active exploitation', 'in the wild'
];

// ============================================
// EXTRACCIÓN DE METADATA
// ============================================

/**
 * Extrae CVEs del texto
 * @param {string} text - Texto a analizar
 * @returns {Array} Lista de CVEs encontrados
 */
function extractCVEs(text) {
    const cvePattern = /CVE-\d{4}-\d{4,}/gi;
    const matches = text.match(cvePattern);
    return matches ? [...new Set(matches.map(cve => cve.toUpperCase()))] : [];
}

/**
 * Extrae CVSS score del texto
 * @param {string} text - Texto a analizar
 * @returns {number|null} CVSS score o null si no se encuentra
 */
function extractCVSS(text) {
    const cvssPattern = /CVSS[:\s]+(\d+\.?\d*)/i;
    const scorePattern = /score[:\s]+(\d+\.?\d*)/i;
    const severityPattern = /(score|severity)[:\s]+(\d+\.?\d*)\s*\/\s*10/i;
    
    let match = text.match(cvssPattern) || text.match(scorePattern) || text.match(severityPattern);
    if (match) {
        const score = parseFloat(match[1] || match[2]);
        return score >= 0 && score <= 10 ? score : null;
    }
    return null;
}

/**
 * Extrae técnicas MITRE ATT&CK
 * @param {string} text - Texto a analizar
 * @returns {Array} Lista de técnicas MITRE encontradas
 */
function extractMitreAttack(text) {
    const mitrePattern = /T\d{4}(\.\d{3})?/gi;
    const matches = text.match(mitrePattern);
    return matches ? [...new Set(matches.map(t => t.toUpperCase()))] : [];
}

/**
 * Extrae threat actors mencionados
 * @param {string} text - Texto a analizar
 * @returns {Array} Lista de threat actors encontrados
 */
function extractThreatActors(text) {
    const found = [];
    KNOWN_THREAT_ACTORS.forEach(actor => {
        const regex = new RegExp(`\\b${actor}\\b`, 'gi');
        if (regex.test(text)) {
            found.push(actor);
        }
    });
    return [...new Set(found)];
}

/**
 * Extrae productos afectados
 * @param {string} text - Texto a analizar
 * @returns {Array} Lista de productos encontrados
 */
function extractAffectedProducts(text) {
    const found = [];
    CRITICAL_PRODUCTS.forEach(product => {
        const regex = new RegExp(`\\b${product}\\b`, 'gi');
        if (regex.test(text)) {
            found.push(product);
        }
    });
    return [...new Set(found)];
}

/**
 * Detecta si hay parche disponible
 * @param {string} text - Texto a analizar
 * @returns {boolean} True si hay parche disponible
 */
function hasPatchAvailable(text) {
    const patchKeywords = [
        'patch available', 'patch released', 'update available',
        'security update', 'hotfix', 'security patch', 'parche disponible',
        'actualización de seguridad', 'fix available'
    ];
    
    return patchKeywords.some(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
    );
}

/**
 * Extrae IOCs (Indicators of Compromise)
 * @param {string} text - Texto a analizar
 * @returns {Object} IOCs encontrados
 */
function extractIOCs(text) {
    const iocs = {
        ips: [],
        hashes: [],
        domains: []
    };
    
    // IPs v4
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ips = text.match(ipPattern) || [];
    iocs.ips = [...new Set(ips.filter(ip => {
        const parts = ip.split('.');
        return parts.every(part => parseInt(part) <= 255);
    }))];
    
    // MD5/SHA256 hashes
    const hashPattern = /\b[a-f0-9]{32}\b|\b[a-f0-9]{64}\b/gi;
    const hashes = text.match(hashPattern) || [];
    iocs.hashes = [...new Set(hashes)];
    
    // Dominios sospechosos (muy básico)
    const domainPattern = /\b[a-z0-9][-a-z0-9]*\.(com|net|org|xyz|top|tk)\b/gi;
    const domains = text.match(domainPattern) || [];
    iocs.domains = [...new Set(domains)];
    
    return iocs;
}

/**
 * Detecta si es fuente oficial
 * @param {string} sourceName - Nombre de la fuente
 * @returns {boolean} True si es fuente oficial
 */
function isOfficialSource(sourceName) {
    return OFFICIAL_SOURCES.some(official => 
        sourceName.toLowerCase().includes(official.toLowerCase())
    );
}

/**
 * Detecta keywords regulatorios
 * @param {string} text - Texto a analizar
 * @returns {Array} Keywords regulatorios encontrados
 */
function extractRegulatoryKeywords(text) {
    const found = [];
    REGULATORY_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (regex.test(text)) {
            found.push(keyword);
        }
    });
    return [...new Set(found)];
}

/**
 * Calcula nivel de severidad basado en keywords
 * @param {string} text - Texto a analizar
 * @returns {string} Nivel de severidad: critical, high, medium, low
 */
function calculateSeverityLevel(text) {
    const textLower = text.toLowerCase();
    
    // Crítico
    if (CRITICAL_IMPACT_KEYWORDS.some(kw => textLower.includes(kw.toLowerCase()))) {
        return 'critical';
    }
    
    // Alto
    const highKeywords = ['high severity', 'severe', 'dangerous', 'alta severidad', 'peligroso'];
    if (highKeywords.some(kw => textLower.includes(kw))) {
        return 'high';
    }
    
    // Medio
    const mediumKeywords = ['moderate', 'medium', 'moderado', 'media'];
    if (mediumKeywords.some(kw => textLower.includes(kw))) {
        return 'medium';
    }
    
    return 'low';
}

/**
 * Calcula relevance score (0-100)
 * @param {Object} article - Artículo con metadata
 * @returns {number} Score de relevancia
 */
function calculateRelevanceScore(article) {
    let score = 0;
    
    // +30 puntos si tiene CVE
    if (article.metadata.cves.length > 0) score += 30;
    
    // +20 puntos si tiene CVSS >= 8.0
    if (article.metadata.cvssScore >= 8.0) score += 20;
    
    // +15 puntos por threat actor
    if (article.metadata.threatActors.length > 0) score += 15;
    
    // +15 puntos por productos críticos afectados
    if (article.metadata.affectedProducts.length > 0) score += 15;
    
    // +10 puntos si tiene parche disponible
    if (article.metadata.patchAvailable) score += 10;
    
    // +10 puntos si es fuente oficial
    if (article.metadata.isOfficialSource) score += 10;
    
    // +10 puntos por técnicas MITRE ATT&CK
    if (article.metadata.mitreAttackTechniques.length > 0) score += 10;
    
    // +5 puntos por IOCs
    const totalIOCs = article.metadata.iocs.ips.length + 
                      article.metadata.iocs.hashes.length + 
                      article.metadata.iocs.domains.length;
    if (totalIOCs > 0) score += 5;
    
    // +5 puntos por keywords regulatorios
    if (article.metadata.regulatoryKeywords.length > 0) score += 5;
    
    // Bonus por severidad
    if (article.metadata.severityLevel === 'critical') score += 10;
    else if (article.metadata.severityLevel === 'high') score += 5;
    
    return Math.min(score, 100);
}

/**
 * Enriquece un artículo con metadata extraída
 * @param {Object} article - Artículo RSS
 * @returns {Object} Artículo enriquecido con metadata
 */
function enrichArticleMetadata(article) {
    const fullText = `${article.title} ${article.description || ''} ${article.content || ''}`;
    
    // Extraer toda la metadata
    const cves = extractCVEs(fullText);
    const cvssScore = extractCVSS(fullText);
    const mitreAttackTechniques = extractMitreAttack(fullText);
    const threatActors = extractThreatActors(fullText);
    const affectedProducts = extractAffectedProducts(fullText);
    const patchAvailable = hasPatchAvailable(fullText);
    const iocs = extractIOCs(fullText);
    const isOfficialSrc = isOfficialSource(article.sourceName);
    const regulatoryKeywords = extractRegulatoryKeywords(fullText);
    const severityLevel = calculateSeverityLevel(fullText);
    
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
        relevanceScore: 0 // Se calculará después
    };
    
    // Calcular score de relevancia
    article.metadata.relevanceScore = calculateRelevanceScore(article);
    
    return article;
}

// ============================================
// FILTROS AVANZADOS
// ============================================

/**
 * Aplica filtros avanzados de CISO
 * @param {Array} articles - Lista de artículos
 * @param {Object} filters - Filtros a aplicar
 * @returns {Array} Artículos filtrados
 */
function applyAdvancedFilters(articles, filters = {}) {
    let filtered = [...articles];
    
    // Filtro: Solo con CVE
    if (filters.onlyWithCVE) {
        filtered = filtered.filter(a => a.metadata.cves.length > 0);
    }
    
    // Filtro: CVSS mínimo
    if (filters.minCVSS) {
        filtered = filtered.filter(a => 
            a.metadata.cvssScore !== null && a.metadata.cvssScore >= filters.minCVSS
        );
    }
    
    // Filtro: Por threat actor específico
    if (filters.threatActor) {
        filtered = filtered.filter(a => 
            a.metadata.threatActors.some(ta => 
                ta.toLowerCase().includes(filters.threatActor.toLowerCase())
            )
        );
    }
    
    // Filtro: Por producto afectado
    if (filters.product) {
        filtered = filtered.filter(a => 
            a.metadata.affectedProducts.some(p => 
                p.toLowerCase().includes(filters.product.toLowerCase())
            )
        );
    }
    
    // Filtro: Solo con parche disponible
    if (filters.onlyWithPatch) {
        filtered = filtered.filter(a => a.metadata.patchAvailable);
    }
    
    // Filtro: Solo fuentes oficiales
    if (filters.onlyOfficialSources) {
        filtered = filtered.filter(a => a.metadata.isOfficialSource);
    }
    
    // Filtro: Por nivel de severidad
    if (filters.severityLevel) {
        filtered = filtered.filter(a => a.metadata.severityLevel === filters.severityLevel);
    }
    
    // Filtro: Solo últimos N días
    if (filters.maxDaysOld) {
        filtered = filtered.filter(a => a.metadata.daysSincePublished <= filters.maxDaysOld);
    }
    
    // Filtro: Relevance score mínimo
    if (filters.minRelevanceScore) {
        filtered = filtered.filter(a => 
            a.metadata.relevanceScore >= filters.minRelevanceScore
        );
    }
    
    // Filtro: Solo con IOCs
    if (filters.onlyWithIOCs) {
        filtered = filtered.filter(a => {
            const totalIOCs = a.metadata.iocs.ips.length + 
                            a.metadata.iocs.hashes.length + 
                            a.metadata.iocs.domains.length;
            return totalIOCs > 0;
        });
    }
    
    // Filtro: Regulatorio
    if (filters.onlyRegulatory) {
        filtered = filtered.filter(a => a.metadata.regulatoryKeywords.length > 0);
    }
    
    // Filtro: Por técnica MITRE ATT&CK
    if (filters.mitreAttackTechnique) {
        filtered = filtered.filter(a => 
            a.metadata.mitreAttackTechniques.includes(filters.mitreAttackTechnique.toUpperCase())
        );
    }
    
    return filtered;
}

/**
 * Ordena artículos por prioridad de CISO
 * @param {Array} articles - Lista de artículos
 * @returns {Array} Artículos ordenados
 */
function sortByPriority(articles) {
    return articles.sort((a, b) => {
        // Primero por relevance score
        if (b.metadata.relevanceScore !== a.metadata.relevanceScore) {
            return b.metadata.relevanceScore - a.metadata.relevanceScore;
        }
        
        // Luego por severidad
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aSev = severityOrder[a.metadata.severityLevel] || 0;
        const bSev = severityOrder[b.metadata.severityLevel] || 0;
        if (bSev !== aSev) {
            return bSev - aSev;
        }
        
        // Luego por fecha (más reciente primero)
        return new Date(b.pubDate) - new Date(a.pubDate);
    });
}

// ============================================
// ESTADÍSTICAS DE METADATA
// ============================================

/**
 * Calcula estadísticas de metadata
 * @param {Array} articles - Lista de artículos
 * @returns {Object} Estadísticas
 */
function calculateMetadataStats(articles) {
    const stats = {
        totalArticles: articles.length,
        withCVE: 0,
        withHighCVSS: 0,
        withThreatActors: 0,
        withIOCs: 0,
        critical: 0,
        high: 0,
        withPatch: 0,
        avgRelevanceScore: 0,
        topThreatActors: {},
        topProducts: {},
        topCVEs: {}
    };
    
    let totalRelevanceScore = 0;
    
    articles.forEach(article => {
        const meta = article.metadata;
        
        if (meta.cves.length > 0) stats.withCVE++;
        if (meta.cvssScore >= 8.0) stats.withHighCVSS++;
        if (meta.threatActors.length > 0) stats.withThreatActors++;
        
        const totalIOCs = meta.iocs.ips.length + meta.iocs.hashes.length + meta.iocs.domains.length;
        if (totalIOCs > 0) stats.withIOCs++;
        
        if (meta.severityLevel === 'critical') stats.critical++;
        if (meta.severityLevel === 'high') stats.high++;
        if (meta.patchAvailable) stats.withPatch++;
        
        totalRelevanceScore += meta.relevanceScore;
        
        // Contar threat actors
        meta.threatActors.forEach(ta => {
            stats.topThreatActors[ta] = (stats.topThreatActors[ta] || 0) + 1;
        });
        
        // Contar productos
        meta.affectedProducts.forEach(p => {
            stats.topProducts[p] = (stats.topProducts[p] || 0) + 1;
        });
        
        // Contar CVEs
        meta.cves.forEach(cve => {
            stats.topCVEs[cve] = (stats.topCVEs[cve] || 0) + 1;
        });
    });
    
    stats.avgRelevanceScore = articles.length > 0 
        ? Math.round(totalRelevanceScore / articles.length) 
        : 0;
    
    return stats;
}

// ============================================
// EXPORT
// ============================================

if (typeof window !== 'undefined') {
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
        extractIOCs,
        KNOWN_THREAT_ACTORS,
        CRITICAL_PRODUCTS,
        PRIORITY_ATTACK_TECHNIQUES
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        enrichArticleMetadata,
        applyAdvancedFilters,
        sortByPriority,
        calculateMetadataStats
    };
}