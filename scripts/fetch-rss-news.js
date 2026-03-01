/**
 * RSS News Fetcher with Claude API
 * 
 * Features:
 * - Resumen inteligente con Claude API (en idioma original)
 * - CIA+NR scoring automático
 * - Sistema de protección de costos
 * - Degradación gradual
 * - Logging de uso en Firebase
 * - Filtro PRE-API por keywords (whitelist/blacklist)
 * 
 * CAMBIOS v2.0 (Enero 2026):
 * - ELIMINADA traducción al español
 * - Claude genera solo resumen en idioma original
 * - Reducción de costos: ~62%
 * 
 * CAMBIOS v3.0 (Febrero 2026):
 * - Sistema de filtros PRE-API por keywords críticos
 * - Whitelist técnica (EN+ES): CVEs, APTs, ransomware, sectores críticos
 * - Whitelist negocio (EN+ES): impacto financiero, regulación, operaciones
 * - Blacklist (EN+ES): marketing, tutoriales, listicles, opinión
 * - Reducción adicional de costos: ~57%
 * - Solo noticias relevantes para CISOs y C-Level llegan a Claude API
 *
 * CAMBIOS v3.1 (Febrero 2026):
 * - NIVEL 1: Keywords más precisos en TECHNICAL_WHITELIST (menos falsos positivos)
 * - NIVEL 1: BLACKLIST ampliada con nombramientos, inversión, research, conferencias
 * - NIVEL 2: Sistema de scoring (MIN_RELEVANCE_SCORE=2) reemplaza lógica binaria
 * - Objetivo: reducir volumen de ~900/mes a ~300-380/mes con relevancia >90%
 * - Ahorro estimado: ~60% adicional vs v3.0 en costo Claude API
 *
 * Autor: Herliss Briceño
 * Fecha: Febrero 2026
 * Versión: 3.1
 */

const https = require('https');
const http = require('http');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

// ============================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================

// Detectar si estamos en CI (GitHub Actions)
const IS_CI = process.env.GITHUB_ACTIONS === 'true';

// Función de logging condicional
function debugLog(...args) {
    if (!IS_CI) {
        console.log(...args);
    }
}

const SAFETY_CONFIG = {
    // Límites de presupuesto
    MONTHLY_BUDGET_LIMIT: 5.00,         // $5 USD/mes máximo
    ALERT_THRESHOLD: 4.00,              // Alertar a $4 USD
    DAILY_BUDGET_LIMIT: 0.18,           // ~$5.40/mes si se usa todos los días
    
    // Límites por ejecución
    MAX_CALLS_PER_RUN: 100,             // Máximo 100 llamadas API por workflow
    MAX_CALLS_PER_ARTICLE: 1,           // 1 llamada por artículo
    MAX_ARTICLES_PER_RUN: 150,          // Límite global de artículos a procesar
    
    // Timeouts
    API_TIMEOUT: 30000,                 // 30 segundos por llamada
    
    // Degradación gradual
    ENABLE_GRADUAL_DEGRADATION: true,   // Reducir calidad si se acerca al límite
    ENABLE_FALLBACK: true,              // Usar extractivo si falla API
    
    // Precios Claude 3.5 Haiku (por millón de tokens)
    PRICE_INPUT: 0.80,
    PRICE_OUTPUT: 4.00
};

// ============================================
// SISTEMA DE FILTROS PRE-API (v3.0)
// Decide qué noticias llegan a Claude API
// Regla: BLACKLIST > WHITELIST_TÉCNICA > WHITELIST_NEGOCIO > rechazar
// ============================================

// ── NIVEL 1: Keywords más precisos para reducir falsos positivos ──────────────
const TECHNICAL_WHITELIST = [
    // --- Vulnerabilidades con año reciente (EN) ---
    // CAMBIO v3.1: 'cve-' eliminado (demasiado genérico), solo años activos
    'cve-2025-', 'cve-2026-',
    // CAMBIO v3.1: CVSS solo ≥7.0 (high/critical), eliminado CVSS bajo
    'cvss 7.', 'cvss 8.', 'cvss 9.', 'cvss 10', 'cvss:7', 'cvss:8', 'cvss:9', 'cvss:10',
    'zero-day', '0-day', 'zero day',
    'remote code execution', 'rce vulnerability', 'rce exploit',
    'privilege escalation exploit', 'privilege escalation vulnerability',
    'authentication bypass vulnerability', 'authentication bypass exploit',
    'sql injection attack', 'command injection exploit',
    'critical vulnerability in', 'critical flaw in',
    // CAMBIO v3.1: "actively exploited" = señal fuerte de impacto real
    'actively exploited', 'exploited in the wild', 'exploitation detected',
    'emergency patch', 'out-of-band patch', 'urgent security update',
    // CAMBIO v3.1: solo POC con impacto confirmado
    'poc exploit released', 'exploit code published', 'working exploit',

    // --- Vulnerabilidades (ES) ---
    // CAMBIO v3.1: 'cve-' eliminado del español también
    'día cero explotado', 'vulnerabilidad día cero',
    'ejecución remota de código', 'ejecución de código remoto',
    'escalada de privilegios explotada',
    'bypass de autenticación explotado',
    'vulnerabilidad crítica en', 'fallo crítico en',
    'activamente explotado', 'explotado activamente',
    'parche de emergencia', 'actualización de seguridad urgente',

    // --- Threat Intelligence — Grupos APT nombrados (EN) ---
    // CAMBIO v3.1: grupos específicos conservados (alta señal), sin términos genéricos
    'apt28', 'apt29', 'apt32', 'apt33', 'apt41', 'apt40',
    'lazarus group', 'kimsuky', 'volt typhoon', 'salt typhoon',
    'fancy bear', 'cozy bear', 'sandworm', 'scattered spider',
    'lockbit', 'blackcat', 'alphv', 'cl0p', 'clop', 'rhysida', 'play ransomware',
    // CAMBIO v3.1: ransomware solo con contexto de ataque confirmado
    'hit by ransomware', 'ransomware attack on', 'ransomware struck',
    'ransomware encrypted', 'victim of ransomware',
    // CAMBIO v3.1: 'malware campaign' y 'malware family' reemplazados por más específicos
    'active malware campaign', 'new malware strain', 'malware targeting',
    'supply chain attack', 'supply chain compromise', 'supply chain breach',
    'nation-state attack', 'state-sponsored attack', 'state-sponsored hacking',
    // CAMBIO v3.1: spear phishing conservado (más específico que phishing general)
    'spear phishing campaign', 'targeted phishing attack',
    // CAMBIO v3.1: data breach solo con contexto confirmado
    'confirmed data breach', 'data breach affecting', 'data breach exposes',
    'leaked database', 'exposed records', 'millions of records',
    'data exfiltration detected', 'data stolen from',
    'credential stuffing attack', 'credential theft campaign',
    'botnet takedown', 'botnet dismantled', 'botnet targeting',
    'c2 infrastructure', 'command and control server seized',
    // CAMBIO v3.1: backdoor/rootkit/trojan solo con contexto de descubrimiento real
    'backdoor discovered', 'backdoor deployed', 'backdoor found in',
    'rootkit detected', 'trojan targeting', 'infostealer campaign',
    'ddos attack on', 'massive ddos', 'record-breaking ddos',

    // --- Threat Intelligence (ES) ---
    'ataque ransomware confirmado', 'víctima de ransomware',
    'cifrado por ransomware',
    'ataque a la cadena de suministro',
    'ataque de estado-nación', 'hacking patrocinado por estado',
    'campaña de spear phishing',
    'brecha de datos confirmada', 'filtración de datos expone',
    'millones de registros expuestos',
    'robo de credenciales confirmado',
    'ataque ddos masivo',

    // --- Sectores Críticos — solo con incidente real (EN) ---
    // CAMBIO v3.1: 'healthcare', 'fintech', 'banking sector' eliminados (muy genéricos)
    'hospital attacked', 'hospital ransomware', 'healthcare data breach',
    'medical records exposed', 'patient data leaked',
    'critical infrastructure attack', 'power grid attack', 'water utility hacked',
    'energy company breached', 'oil and gas cyberattack',
    'scada attack', 'ics vulnerability exploited', 'ot network compromised',
    'defense contractor breach', 'military systems hacked',
    'bank cyberattack', 'financial institution breach',

    // --- Sectores Críticos (ES) ---
    'hospital atacado', 'datos de pacientes expuestos',
    'infraestructura crítica atacada', 'red eléctrica hackeada',
    'empresa energética comprometida',
    'banco atacado', 'institución financiera comprometida',

    // --- Tecnologías Afectadas — vulnerabilidad específica (EN+ES) ---
    // CAMBIO v3.1: solo con "vulnerability", "exploit" o "breach" para evitar menciones genéricas
    'active directory vulnerability', 'domain controller compromised',
    'exchange server vulnerability', 'exchange server exploit',
    'vmware esxi vulnerability', 'vcenter exploit',
    'citrix netscaler vulnerability', 'fortinet fortigate exploit',
    'cisco ios vulnerability', 'sap vulnerability', 'oracle database exploit',
    'palo alto vulnerability', 'checkpoint vulnerability',

    // --- Compliance / Regulación — con sanción o acción real (EN) ---
    // CAMBIO v3.1: solo cuando hay multa, violación o acción regulatoria concreta
    'gdpr fine', 'gdpr violation', 'gdpr penalty',
    'hipaa breach penalty', 'hipaa violation fine',
    'sec cybersecurity charges', 'sec enforcement action',
    'nis2 compliance deadline', 'dora compliance requirement',
    'pci-dss violation', 'regulatory sanction',

    // --- Compliance / Regulación (ES) ---
    'multa gdpr', 'sanción gdpr', 'violación gdpr',
    'multa hipaa', 'sanción regulatoria',
    'cumplimiento nis2', 'requisito dora'
];

const BUSINESS_WHITELIST = [
    // --- Impacto Financiero confirmado (EN) ---
    // CAMBIO v3.1: umbrales más altos, solo impacto real documentado
    'million ransom paid', 'billion ransom',
    'ransom paid', 'paid ransom to',
    'fined $', 'million fine', 'billion fine', 'million penalty',
    '$10 million', '$50 million', '$100 million', '$500 million',
    'financial loss of', 'financial damage of',
    'cyber insurance payout', 'insurance claim filed',
    'shares fell', 'stock dropped', 'market cap loss',
    'class action lawsuit', 'sec charges filed', 'ftc charges',

    // --- Impacto Financiero (ES) ---
    'millones de rescate pagado', 'rescate pagado a',
    'multado con', 'multa de', 'sanción de',
    '10 millones de dólares', '50 millones', '100 millones',
    'pérdida financiera de', 'daño económico de',
    'demanda colectiva presentada', 'cargos presentados',

    // --- Interrupción Operacional severa (EN) ---
    // CAMBIO v3.1: requiere contexto de interrupción real, no genérico
    'operations shut down', 'forced to shut down', 'production halted',
    'services taken offline', 'systems taken down',
    'days of downtime', 'weeks of downtime', 'days offline',
    'business operations disrupted', 'supply chain disrupted',

    // --- Interrupción Operacional (ES) ---
    'operaciones detenidas por', 'producción paralizada',
    'sistemas fuera de línea', 'días sin operar', 'semanas sin operar',
    'operaciones interrumpidas',

    // --- Alto Perfil — organizaciones nombradas (EN) ---
    // CAMBIO v3.1: solo con contexto de incidente
    'fortune 500 company breached', 'fortune 100 breach',
    'central bank hacked', 'treasury department breach',
    'government agency hacked', 'federal agency breach',
    'critical national infrastructure compromised',
    'white house cybersecurity', 'pentagon breach',

    // --- Alto Perfil (ES) ---
    'banco central hackeado', 'ministerio hackeado',
    'agencia gubernamental comprometida',
    'infraestructura nacional comprometida',

    // --- Regulación y Cumplimiento — obligaciones nuevas (EN) ---
    'mandatory breach notification', 'breach notification required',
    'new cybersecurity regulation', 'new cybersecurity law',
    'compliance deadline approaching', 'regulatory fine issued',
    'cisa binding directive', 'executive order cybersecurity',

    // --- Regulación y Cumplimiento (ES) ---
    'notificación de brecha obligatoria', 'nueva ley de ciberseguridad',
    'plazo de cumplimiento', 'directiva vinculante',

    // --- Responsabilidad CISO/Ejecutivos (EN+ES) ---
    'ciso arrested', 'ciso charged', 'ciso convicted',
    'ciso liability', 'board cybersecurity liability',
    'director charged for breach', 'executive accountability',
    'ciso detenido', 'responsabilidad del ciso',
    'responsabilidad del consejo', 'ejecutivo procesado'
];

const BLACKLIST = [
    // --- Marketing y Eventos (EN) ---
    'webinar', 'register now', 'sign up now', 'register for free',
    'product launch', 'new product', 'announcing', 'we are excited to',
    'partnership', 'strategic partnership', 'sponsored', 'advertisement',
    'free trial', 'demo available', 'buy now', 'request a demo',
    'limited time offer', 'discount', 'promo code',
    'podcast episode', 'join us for', 'save your seat',
    'early bird', 'use code ', 'get started free',

    // --- Marketing y Eventos (ES) ---
    'webinario', 'regístrate ahora', 'inscríbete', 'regístrate gratis',
    'lanzamiento de producto', 'nuevo producto', 'nos complace anunciar',
    'alianza estratégica', 'patrocinado', 'prueba gratuita',
    'demo disponible', 'solicita una demo',
    'episodio de podcast', 'únete a nosotros',

    // --- Educativo Básico (EN) ---
    'beginner guide', 'introduction to', 'intro to',
    'basics of', 'what is a ', 'getting started with',
    'for beginners', 'learn how to', '101 guide', '101:',
    'step by step', 'how to set up', 'how to configure',
    'tutorial:', 'complete guide to', 'cheat sheet',

    // --- Educativo Básico (ES) ---
    'guía para principiantes', 'introducción a',
    'conceptos básicos', 'qué es un ', 'qué es la ',
    'primeros pasos con', 'para principiantes',
    'aprende cómo', 'paso a paso', 'cómo configurar',
    'tutorial:', 'guía completa de',

    // --- Listicles (EN+ES) ---
    'top 10', 'top 5', 'top 3', 'top 7', 'top 15', 'top 20',
    'best of', 'ultimate guide', 'best practices guide',
    'guía definitiva', 'los 10 mejores', 'los 5 mejores',
    'the best ', 'the top ',

    // --- Updates y Correcciones (EN+ES) ---
    '[updated]', '[actualizado]',
    'correction:', 'corrección:',
    "editor's note:", 'nota del editor:',

    // --- Teórico / Hipotético (EN+ES) ---
    'theoretical attack', 'hypothetical scenario',
    'researchers speculate', 'could potentially',
    'researchers imagine', 'what if scenario',
    'ataque teórico', 'escenario hipotético',
    'predicciones para', 'predictions for ',
    'forecast for ', 'outlook for ',

    // --- Opinión y Editorial (EN+ES) ---
    'opinion:', 'opinión:', 'editorial:',
    'my take:', 'point of view', 'commentary:',
    'mi opinión:', 'punto de vista', 'columna de opinión',

    // --- Roundups (EN+ES) ---
    'weekly roundup', 'weekly recap', 'weekly digest',
    'monthly summary', 'year in review', 'annual recap',
    'resumen semanal', 'resumen mensual', 'resumen anual',
    'lo mejor de la semana', 'digest semanal',

    // --- NUEVO v3.1: Nombramientos y RRHH (EN+ES) ---
    ' appoints ', ' named as ', ' joins as ', ' promoted to ',
    ' hired as ', ' welcomes ', ' announces appointment',
    'new ciso at', 'new cto at', 'new ceo at',
    'nombrado como', 'se une como', 'promovido a',
    'contratado como', 'nuevo ciso en', 'nuevo cto en',

    // --- NUEVO v3.1: Inversión y Financiamiento (EN+ES) ---
    'raises $', 'series a funding', 'series b funding', 'series c funding',
    'funding round', 'million investment', 'billion valuation',
    'venture capital', 'ipo filing', 'goes public',
    'recauda $', 'ronda de financiamiento', 'millones de inversión',
    'capital de riesgo', 'valoración de',

    // --- NUEVO v3.1: Research Académico sin impacto real (EN+ES) ---
    'university researchers', 'academic study shows',
    'researchers demonstrate how', 'researchers show that',
    'proof of concept only', 'theoretical poc',
    'investigadores demuestran cómo', 'estudio académico',
    'demostración teórica',

    // --- NUEVO v3.1: Análisis de Mercado y Analistas (EN+ES) ---
    'market report', 'market research', 'market analysis',
    'gartner report', 'forrester report', 'idc report', 'idc study',
    'industry report', 'analyst report', 'market forecast',
    'informe de mercado', 'análisis de mercado', 'informe gartner',

    // --- NUEVO v3.1: Premios y Reconocimientos (EN+ES) ---
    'award', 'recognized as leader', 'magic quadrant leader',
    'best company', 'named a leader', 'wins award',
    'premio', 'reconocido como líder', 'gana el premio',
    'mejor empresa de', 'líder del cuadrante',

    // --- NUEVO v3.1: Conferencias sin incidente (EN+ES) ---
    // Solo bloqueamos anuncios de conferencias, no reportes de incidentes presentados
    'at defcon: how', 'blackhat presentation', 'rsa conference keynote',
    'speaking at ', 'talk at defcon', 'session at blackhat',
    'presentación en defcon', 'charla en blackhat',

    // --- NUEVO v3.1: Contenido Motivacional / Awareness genérico (EN+ES) ---
    'cyber awareness month', 'security awareness tips',
    'stay safe online', 'cyber hygiene tips', 'best security habits',
    'mes de concienciación', 'consejos de seguridad', 'hábitos de seguridad'
];

// ============================================
// CONTADORES DE FILTRADO
// ============================================

const filterStats = {
    total: 0,
    approved: 0,
    rejected: 0,
    byCategory: { technical: 0, business: 0, blocked: 0, no_match: 0 }
};

// ============================================
// NIVEL 2: SISTEMA DE SCORING (v3.1)
// Umbral mínimo: MIN_RELEVANCE_SCORE = 2
// Reemplaza lógica binaria "1 keyword = aprobado"
// ============================================

const MIN_RELEVANCE_SCORE = 2; // Puntaje mínimo para aprobar

// Señales de ALTO impacto (+2 puntos)
const HIGH_IMPACT_SIGNALS = [
    // Explotación activa confirmada
    'actively exploited', 'exploited in the wild', 'exploitation detected',
    'activamente explotado', 'explotado activamente',
    // CVE con año actual
    'cve-2025-', 'cve-2026-',
    // APT / grupo nombrado con víctima
    'lazarus group', 'volt typhoon', 'salt typhoon', 'apt28', 'apt29',
    'apt41', 'apt40', 'fancy bear', 'cozy bear', 'sandworm', 'scattered spider',
    'kimsuky', 'apt32', 'apt33',
    // Ransomware con víctima confirmada
    'hit by ransomware', 'ransomware attack on', 'ransomware struck',
    'ransomware encrypted', 'victim of ransomware',
    'víctima de ransomware', 'cifrado por ransomware',
    // Impacto financiero documentado (>$1M)
    '$10 million', '$50 million', '$100 million', '$500 million',
    'million ransom paid', 'billion ransom', 'ransom paid to',
    '50 millones', '100 millones', 'rescate pagado',
    // Grupos ransomware activos
    'lockbit', 'blackcat', 'alphv', 'cl0p', 'clop', 'rhysida', 'play ransomware',
    // Supply chain confirmado
    'supply chain attack', 'supply chain compromise', 'supply chain breach',
    'ataque a la cadena de suministro',
    // Emergencia confirmada
    'emergency patch', 'out-of-band patch', 'urgent security update',
    'parche de emergencia', 'actualización de seguridad urgente',
    // CVSS 9+
    'cvss 9.', 'cvss 10', 'cvss:9', 'cvss:10',
];

// Señales de IMPACTO MODERADO (+1 punto)
const MEDIUM_IMPACT_SIGNALS = [
    // CVE CVSS 7-8
    'cvss 7.', 'cvss 8.', 'cvss:7', 'cvss:8',
    // Zero-day
    'zero-day', '0-day', 'zero day', 'día cero',
    // Parches importantes
    'critical patch', 'patch tuesday', 'security advisory',
    // RCE/Privilege escalation
    'remote code execution', 'rce vulnerability', 'rce exploit',
    'privilege escalation exploit', 'ejecución remota de código',
    // Breach confirmada
    'confirmed data breach', 'data breach affecting', 'data breach exposes',
    'leaked database', 'millions of records', 'brecha de datos confirmada',
    // Infraestructura crítica
    'critical infrastructure attack', 'power grid attack', 'water utility hacked',
    'hospital attacked', 'hospital ransomware', 'healthcare data breach',
    'infraestructura crítica atacada', 'hospital atacado',
    // Interrupción operacional
    'operations shut down', 'production halted', 'forced to shut down',
    'days of downtime', 'operaciones detenidas', 'producción paralizada',
    // Regulación con sanción
    'gdpr fine', 'gdpr violation', 'gdpr penalty', 'multa gdpr',
    'hipaa breach penalty', 'sec enforcement action',
    'cisa binding directive', 'executive order cybersecurity',
    // Responsabilidad ejecutiva
    'ciso arrested', 'ciso charged', 'ciso convicted',
    'ciso detenido', 'ejecutivo procesado',
    // Fuentes oficiales con advisory
    'cisa alert', 'us-cert advisory', 'microsoft security advisory',
    'cisco security advisory', 'fortinet security advisory',
];

// Señales NEGATIVAS que restan puntos
const NEGATIVE_SIGNALS = [
    // Verbos condicionales (no es incidente real)
    ' could ', ' may ', ' might ', ' would ', ' should ',
    ' podría ', ' podría ser ', ' posiblemente ',
    // Research sin víctima real
    'researchers say', 'researchers found that', 'researchers discovered that',
    'researchers demonstrate', 'university researchers',
    'investigadores dicen', 'investigadores encontraron',
    // Análisis retrospectivo
    'last year\'s', 'back in 2024', 'back in 2023', 'historically',
    'del año pasado', 'en 2024',
];

/**
 * Sistema de scoring v3.1
 * Evalúa si un artículo es relevante para CISOs/C-Level
 * con puntaje mínimo configurable (MIN_RELEVANCE_SCORE)
 *
 * @param {Object} article - { title, description }
 * @returns {Object} - { process, reason, category, audience, score, matchedKeywords }
 */
function shouldProcessWithClaude(article) {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();

    // ── PASO 1: BLACKLIST — prioridad absoluta, score irrelevante ──────────────
    for (const keyword of BLACKLIST) {
        if (text.includes(keyword.toLowerCase())) {
            return {
                process: false,
                reason: `Blacklist: "${keyword}"`,
                category: 'blocked',
                audience: 'N/A',
                score: -99,
                matchedKeywords: [keyword]
            };
        }
    }

    // ── PASO 2: SCORING — acumular puntos por señales de impacto ──────────────
    let score = 0;
    const matchedKeywords = [];

    // Señales de alto impacto (+2 cada una, máximo 3 matches para evitar inflación)
    let highMatches = 0;
    for (const signal of HIGH_IMPACT_SIGNALS) {
        if (text.includes(signal.toLowerCase())) {
            score += 2;
            matchedKeywords.push(`+2:"${signal}"`);
            highMatches++;
            if (highMatches >= 3) break; // Limitar a 3 señales high
        }
    }

    // Señales de impacto moderado (+1 cada una, máximo 3 matches)
    let medMatches = 0;
    for (const signal of MEDIUM_IMPACT_SIGNALS) {
        if (text.includes(signal.toLowerCase())) {
            score += 1;
            matchedKeywords.push(`+1:"${signal}"`);
            medMatches++;
            if (medMatches >= 3) break;
        }
    }

    // Señales negativas (-1 cada una)
    for (const signal of NEGATIVE_SIGNALS) {
        if (text.includes(signal.toLowerCase())) {
            score -= 1;
            matchedKeywords.push(`-1:"${signal}"`);
        }
    }

    // ── PASO 3: DECISIÓN por umbral ───────────────────────────────────────────
    const approved = score >= MIN_RELEVANCE_SCORE;

    // Determinar categoría y audiencia
    let category = 'no_match';
    let audience = 'N/A';

    if (approved) {
        // ¿Es técnico o negocio?
        const isTechnical = HIGH_IMPACT_SIGNALS.concat(MEDIUM_IMPACT_SIGNALS)
            .filter(s => ['cve', 'cvss', 'rce', 'exploit', 'malware', 'backdoor',
                         'zero-day', 'vulnerability', 'advisory'].some(t => s.includes(t)))
            .some(s => text.includes(s.toLowerCase()));

        category = isTechnical ? 'technical' : 'business';
        audience = isTechnical ? 'CISO/Technical' : 'C-Level/Management';
    }

    return {
        process: approved,
        reason: approved
            ? `Score ${score} ≥ ${MIN_RELEVANCE_SCORE}: ${matchedKeywords.slice(0, 3).join(', ')}`
            : `Score ${score} < ${MIN_RELEVANCE_SCORE}: insuficiente relevancia`,
        category,
        audience,
        score,
        matchedKeywords
    };
}

// ============================================
// CONFIGURACIÓN DE FUENTES RSS
// ============================================

const NEWS_SOURCES = {
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
    uscert: {
        name: 'US-CERT (CISA)',
        rss: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
        color: '#c0392b',
        category: 'intelligence'
    },
    krebsonsecurity: {
        name: 'Krebs on Security',
        rss: 'https://krebsonsecurity.com/feed/',
        color: '#16a085',
        category: 'blog'
    },
    virustotal: {
        name: 'VirusTotal Blog',
        rss: 'https://blog.virustotal.com/feeds/posts/default',
        color: '#27ae60',
        category: 'intelligence'
    },
    cisco: {
        name: 'Cisco Security',
        rss: 'https://blogs.cisco.com/security/feed',
        color: '#049fd9',
        category: 'corporate'
    },
    unit42: {
        name: 'Palo Alto Unit42',
        rss: 'https://unit42.paloaltonetworks.com/feed/',
        color: '#fa582d',
        category: 'intelligence'
    },
    unaaldia: {
        name: 'Una al Día (Hispasec)',
        rss: 'http://feeds.feedburner.com/hispasec/zCAd',
        color: '#3498db',
        category: 'general'
    },
    cybersecuritynews: {
        name: 'Cybersecurity News',
        rss: 'https://cybersecuritynews.com/feed/',
        color: '#9b59b6',
        category: 'general'
    },
    seguinfo: {
        name: 'Segu-Info',
        rss: 'http://feeds.feedburner.com/NoticiasSeguridadInformatica',
        color: '#f39c12',
        category: 'blog'
    }
};

const MAX_ARTICLES_PER_SOURCE = 25;
const REQUEST_TIMEOUT = 30000;

// ============================================
// CONTADORES GLOBALES
// ============================================

let apiCallCount = 0;
let estimatedCost = 0;
let actualInputTokens = 0;
let actualOutputTokens = 0;
let actualCost = 0;
let articlesProcessed = 0;
let apiErrors = 0;
let fallbackUsed = 0;

// ============================================
// INICIALIZAR FIREBASE
// ============================================

function initializeFirebase() {
    try {
        const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
        
        initializeApp({
            credential: cert(firebaseConfig)
        });
        
        const db = getFirestore();
        console.log('✅ Firebase inicializado correctamente');
        return db;
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        process.exit(1);
    }
}

// ============================================
// MONITOREO DE PRESUPUESTO
// ============================================

async function checkMonthlyBudget(db) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    try {
        const snapshot = await db.collection('api_usage')
            .where('timestamp', '>=', Timestamp.fromDate(monthStart))
            .get();
        
        let totalCost = 0;
        let totalCalls = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalCost += data.actualCost || 0;
            totalCalls += data.apiCalls || 0;
        });
        
        console.log(`\n💰 PRESUPUESTO MENSUAL:`);
        console.log(`   Gasto acumulado: $${totalCost.toFixed(4)}`);
        console.log(`   Llamadas totales: ${totalCalls}`);
        console.log(`   Límite mensual: $${SAFETY_CONFIG.MONTHLY_BUDGET_LIMIT}`);
        console.log(`   Disponible: $${(SAFETY_CONFIG.MONTHLY_BUDGET_LIMIT - totalCost).toFixed(4)}`);
        
        // BLOQUEO AUTOMÁTICO
        if (totalCost >= SAFETY_CONFIG.MONTHLY_BUDGET_LIMIT) {
            throw new Error(`🚨 LÍMITE MENSUAL ALCANZADO: $${totalCost.toFixed(2)} / $${SAFETY_CONFIG.MONTHLY_BUDGET_LIMIT}`);
        }
        
        // ALERTA
        if (totalCost >= SAFETY_CONFIG.ALERT_THRESHOLD) {
            console.warn(`⚠️ ALERTA: Has gastado $${totalCost.toFixed(2)} de $${SAFETY_CONFIG.MONTHLY_BUDGET_LIMIT}`);
        }
        
        return { totalCost, totalCalls };
        
    } catch (error) {
        if (error.message.includes('LÍMITE MENSUAL')) {
            throw error;
        }
        console.warn('⚠️ No se pudo verificar presupuesto mensual, continuando...');
        return { totalCost: 0, totalCalls: 0 };
    }
}

// ============================================
// CLAUDE API - PROCESSING
// ============================================

async function processArticleWithClaude(article, monthlyBudget) {
    // Verificar límite por ejecución
    if (apiCallCount >= SAFETY_CONFIG.MAX_CALLS_PER_RUN) {
        console.warn(`⚠️ LÍMITE DE EJECUCIÓN ALCANZADO: ${apiCallCount} llamadas`);
        fallbackUsed++;
        return generateExtractiveSummary(article);
    }
    
    // Degradación gradual según presupuesto
    const processingLevel = determineProcessingLevel(monthlyBudget);
    
    if (processingLevel === 'none') {
        console.warn(`⚠️ Presupuesto agotado, usando método extractivo`);
        fallbackUsed++;
        return generateExtractiveSummary(article);
    }
    
    const claudeApiKey = process.env.CLAUDE_API_KEY;
    if (!claudeApiKey) {
        console.warn('⚠️ CLAUDE_API_KEY no configurado, usando extractivo');
        fallbackUsed++;
        return generateExtractiveSummary(article);
    }
    
    try {
        apiCallCount++;
        
        // Construir prompt optimizado
        const prompt = buildOptimizedPrompt(article);
        
        // Estimar costo (NUEVO: sin traducción, tokens reducidos)
        const estimatedInputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = 150;  // Reducido de 400 a 150
        const estimatedCallCost = 
            (estimatedInputTokens / 1000000 * SAFETY_CONFIG.PRICE_INPUT) +
            (estimatedOutputTokens / 1000000 * SAFETY_CONFIG.PRICE_OUTPUT);
        
        estimatedCost += estimatedCallCost;
        
        console.log(`   🤖 API call ${apiCallCount}`);
        
        // Llamar a Claude API
        const result = await callClaudeAPI(prompt, estimatedOutputTokens);
        
        // Registrar uso real
        actualInputTokens += result.usage.input_tokens;
        actualOutputTokens += result.usage.output_tokens;
        const callCost = 
            (result.usage.input_tokens / 1000000 * SAFETY_CONFIG.PRICE_INPUT) +
            (result.usage.output_tokens / 1000000 * SAFETY_CONFIG.PRICE_OUTPUT);
        actualCost += callCost;
        
        console.log(`   💰 Costo real: $${callCost.toFixed(6)}`);
        
        // Parsear respuesta
        return parseClaudeResponse(result.content);
        
    } catch (error) {
        apiErrors++;
        console.error(`   ❌ Error en Claude API: ${error.message}`);
        
        if (SAFETY_CONFIG.ENABLE_FALLBACK) {
            console.log(`   🔄 Usando fallback extractivo`);
            fallbackUsed++;
            return generateExtractiveSummary(article);
        }
        
        throw error;
    }
}

/**
 * Determina nivel de procesamiento según presupuesto
 * NUEVO: Todos los niveles generan solo summary (sin traducción)
 */
function determineProcessingLevel(monthlyBudget) {
    const remaining = SAFETY_CONFIG.MONTHLY_BUDGET_LIMIT - monthlyBudget;
    
    if (remaining >= 0.25) return 'summary';  // Solo resumen
    return 'none';                            // Fallback extractivo
}

/**
 * Construye prompt optimizado para Claude
 * NUEVO: Solo genera resumen en idioma original (sin traducción)
 */
function buildOptimizedPrompt(article) {
    // Sanitizar inputs para prevenir prompt injection (OWASP)
    const sanitizedTitle = (article.title || '').substring(0, 500);
    const sanitizedDescription = (article.description || '').substring(0, 2000);
    
    const basePrompt = `You are a cybersecurity intelligence assistant processing threat information for CISOs.

Article Title: ${sanitizedTitle}
Article Description: ${sanitizedDescription}

Task:
Generate a concise 2-3 sentence summary in the SAME language as the original article.
Focus on: threat, impact, and affected systems.
Keep technical terms (CVE, CVSS, API, IoC, etc.) in their original form.

Return ONLY a JSON object (no markdown formatting):
{"summary": "Your summary in the same language as the article"}`;
    
    return basePrompt;
}

async function callClaudeAPI(prompt, maxTokens) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: maxTokens,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });
        
        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: SAFETY_CONFIG.API_TIMEOUT
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`JSON parse error: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('API timeout'));
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * Parsea respuesta de Claude
 * NUEVO: Solo extrae summary (sin titleEs ni summaryEs)
 */
function parseClaudeResponse(content) {
    try {
        const text = content[0].text;
        
        // Limpiar markdown y otros formatos
        let cleanText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/^[\s\n]*\{/g, '{')
            .replace(/\}[\s\n]*$/g, '}')
            .trim();
        
        const parsed = JSON.parse(cleanText);
        
        // Validación y sanitización (OWASP)
        const summary = (parsed.summary || '').substring(0, 1000);
        
        const result = {
            summary: summary
        };
        
        debugLog(`   ✅ Parsing exitoso - summary: ${result.summary.length} chars`);
        
        return result;
    } catch (error) {
        console.error(`   ❌ Error parseando respuesta: ${error.message}`);
        return { summary: '' };
    }
}

// ============================================
// FALLBACK: RESUMEN EXTRACTIVO
// ============================================

function generateExtractiveSummary(article) {
    const description = article.description || '';
    
    // Fix: si no hay descripción, usar el título como fallback
    if (!description || description.length < 10) {
        return {
            summary: article.title || 'Summary not available.'
        };
    }
    
    const sentences = description.match(/[^.!?]+[.!?]+/g) || [];
    const summary = sentences.slice(0, 3).join(' ').trim();
    const truncated = summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
    
    return {
        summary: truncated || description.substring(0, 200)
    };
}

// ============================================
// CIA+NR SCORE CALCULATION
// ============================================

function calculateCIAScore(text) {
    const textLower = text.toLowerCase();
    
    const scores = {
        confidentiality: 0,
        integrity: 0,
        availability: 0,
        nonRepudiation: 0
    };
    
    // CONFIDENTIALITY
    const confidentialityKeywords = [
        { words: ['data breach', 'data leak', 'exposed data', 'leaked database', 'credentials leak', 'password dump'], score: 3 },
        { words: ['unauthorized access', 'information disclosure', 'sensitive data', 'personal information', 'privacy breach'], score: 2 },
        { words: ['encryption', 'data exposure', 'confidential', 'private key', 'secret'], score: 1 }
    ];
    
    confidentialityKeywords.forEach(group => {
        group.words.forEach(keyword => {
            if (textLower.includes(keyword)) {
                scores.confidentiality = Math.max(scores.confidentiality, group.score);
            }
        });
    });
    
    // INTEGRITY
    const integrityKeywords = [
        { words: ['backdoor', 'rootkit', 'trojan', 'code injection', 'sql injection', 'command injection'], score: 3 },
        { words: ['malware', 'virus', 'worm', 'file modification', 'tampering'], score: 2 },
        { words: ['integrity check', 'checksum', 'hash'], score: 1 }
    ];
    
    integrityKeywords.forEach(group => {
        group.words.forEach(keyword => {
            if (textLower.includes(keyword)) {
                scores.integrity = Math.max(scores.integrity, group.score);
            }
        });
    });
    
    // AVAILABILITY
    const availabilityKeywords = [
        { words: ['ddos', 'denial of service', 'ransomware', 'system down', 'outage', 'service disruption'], score: 3 },
        { words: ['downtime', 'unavailable', 'crash', 'flooding'], score: 2 },
        { words: ['performance', 'slowdown', 'resource exhaustion'], score: 1 }
    ];
    
    availabilityKeywords.forEach(group => {
        group.words.forEach(keyword => {
            if (textLower.includes(keyword)) {
                scores.availability = Math.max(scores.availability, group.score);
            }
        });
    });
    
    // NON-REPUDIATION
    const nonRepudiationKeywords = [
        { words: ['log deletion', 'log tampering', 'anti-forensics', 'covering tracks'], score: 3 },
        { words: ['logging', 'audit trail', 'forensics', 'attribution'], score: 2 },
        { words: ['timestamp', 'digital signature', 'certificate'], score: 1 }
    ];
    
    nonRepudiationKeywords.forEach(group => {
        group.words.forEach(keyword => {
            if (textLower.includes(keyword)) {
                scores.nonRepudiation = Math.max(scores.nonRepudiation, group.score);
            }
        });
    });
    
    return scores;
}

function enrichMetadata(article) {
    const text = `${article.title} ${article.description}`.toLowerCase();
    
    // Extraer CVEs
    const cvePattern = /cve-\d{4}-\d{4,7}/gi;
    const cves = [...new Set((text.match(cvePattern) || []).map(cve => cve.toUpperCase()))];
    
    // Extraer CVSS scores
    const cvssPattern = /cvss[:\s]+(\d+\.?\d*)/gi;
    const cvssMatches = text.match(cvssPattern) || [];
    const cvssScores = cvssMatches.map(match => {
        const score = parseFloat(match.replace(/cvss[:\s]+/i, ''));
        return isNaN(score) ? null : score;
    }).filter(score => score !== null);
    const cvssScore = cvssScores.length > 0 ? Math.max(...cvssScores) : null;
    
    // Determinar severidad
    let severityLevel = 'low';
    if (cvssScore !== null) {
        if (cvssScore >= 9.0) severityLevel = 'critical';
        else if (cvssScore >= 7.0) severityLevel = 'high';
        else if (cvssScore >= 4.0) severityLevel = 'medium';
    }
    
    // Threat Actors
    const threatActors = [];
    const aptPattern = /apt[-\s]?\d+/gi;
    const apts = text.match(aptPattern) || [];
    threatActors.push(...apts.map(apt => apt.replace(/\s/g, '').toUpperCase()));
    
    // Productos afectados
    const products = [];
    const productKeywords = ['windows', 'linux', 'android', 'ios', 'chrome', 'firefox', 'safari', 
                           'office', 'exchange', 'outlook', 'teams', 'azure', 'aws', 'cisco', 
                           'vmware', 'oracle', 'apache', 'nginx', 'wordpress'];
    
    productKeywords.forEach(product => {
        if (text.includes(product)) {
            products.push(product.charAt(0).toUpperCase() + product.slice(1));
        }
    });
    
    // CIA+NR Score
    const ciaScore = calculateCIAScore(text);
    
    // Calcular relevancia (0-100)
    let relevanceScore = 0;
    if (cves.length > 0) relevanceScore += 30;
    if (cvssScore && cvssScore >= 7.0) relevanceScore += 30;
    if (severityLevel === 'critical') relevanceScore += 20;
    if (threatActors.length > 0) relevanceScore += 10;
    if (products.length > 0) relevanceScore += 10;
    
    return {
        cves,
        cvssScore,
        severityLevel,
        threatActors: [...new Set(threatActors)],
        affectedProducts: [...new Set(products)],
        ciaScore,
        relevanceScore: Math.min(100, relevanceScore),
        hasVulnerability: cves.length > 0,
        hasThreatActor: threatActors.length > 0
    };
}

// ============================================
// REGISTRAR USO DE API
// ============================================

async function logAPIUsage(db) {
    try {
        await db.collection('api_usage').add({
            timestamp: Timestamp.now(),
            apiCalls: apiCallCount,
            estimatedCost: estimatedCost,
            actualCost: actualCost,
            inputTokens: actualInputTokens,
            outputTokens: actualOutputTokens,
            articlesProcessed: articlesProcessed,
            apiErrors: apiErrors,
            fallbackUsed: fallbackUsed,
            // v3.0: estadísticas de filtrado
            filterTotal: filterStats.total,
            filterApproved: filterStats.approved,
            filterRejected: filterStats.rejected,
            filterTechnical: filterStats.byCategory.technical,
            filterBusiness: filterStats.byCategory.business,
            filterBlocked: filterStats.byCategory.blocked,
            filterNoMatch: filterStats.byCategory.no_match
        });
        
        console.log('✅ Uso de API registrado en Firebase');
    } catch (error) {
        console.error('⚠️ Error registrando uso de API:', error.message);
    }
}

// ============================================
// RSS FETCHING
// ============================================

function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const timeout = setTimeout(() => {
            reject(new Error('Request timeout'));
        }, REQUEST_TIMEOUT);
        
        protocol.get(url, { timeout: REQUEST_TIMEOUT }, (res) => {
            clearTimeout(timeout);
            
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

// ============================================
// STRIP HTML - Limpia HTML de contenido RSS
// ============================================

function stripHTML(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]+>/g, ' ')      // eliminar tags HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s{2,}/g, ' ')       // espacios múltiples → uno
        .trim();
}

function parseRSSItem(itemXML) {
    const getContent = (tag) => {
        const regex = new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([^\\]]+)\\]\\]><\\/${tag}>|<${tag}(?:[^>]*)>([^<]+)<\\/${tag}>`, 'i');
        const match = itemXML.match(regex);
        return match ? (match[1] || match[2] || '').trim() : '';
    };
    
    const getLink = () => {
        const linkMatch = itemXML.match(/<link(?:[^>]*)>([^<]+)<\/link>/i);
        if (linkMatch) return linkMatch[1].trim();
        
        const hrefMatch = itemXML.match(/<link[^>]+href=["']([^"']+)["']/i);
        if (hrefMatch) return hrefMatch[1].trim();
        
        return '';
    };
    
    const getPubDate = () => {
        const pubDateMatch = itemXML.match(/<pubDate>([^<]+)<\/pubDate>/i);
        if (pubDateMatch) return new Date(pubDateMatch[1]);
        
        const publishedMatch = itemXML.match(/<published>([^<]+)<\/published>/i);
        if (publishedMatch) return new Date(publishedMatch[1]);
        
        const updatedMatch = itemXML.match(/<updated>([^<]+)<\/updated>/i);
        if (updatedMatch) return new Date(updatedMatch[1]);
        
        return new Date();
    };
    
    const getThumbnail = () => {
        const mediaMatch = itemXML.match(/<media:content[^>]+url=["']([^"']+)["']/i);
        if (mediaMatch) return mediaMatch[1];
        
        const enclosureMatch = itemXML.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i);
        if (enclosureMatch) return enclosureMatch[1];
        
        return '';
    };

    // Fix cybersecuritynews.com y fuentes que usan content:encoded en lugar de description
    const getContentEncoded = () => {
        const regex = /<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i;
        const match = itemXML.match(regex);
        return match ? stripHTML(match[1].trim()) : '';
    };
    
    return {
        title: getContent('title'),
        link: getLink(),
        description: stripHTML(getContent('description') || getContent('summary')) || getContentEncoded(),
        pubDate: getPubDate(),
        author: getContent('author') || getContent('dc:creator'),
        thumbnail: getThumbnail()
    };
}

function parseRSS(xmlData, sourceName) {
    const items = [];
    
    const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
    const matches = xmlData.match(itemRegex);
    
    if (!matches) {
        console.warn(`⚠️ ${sourceName}: No items found in RSS`);
        return items;
    }
    
    for (const match of matches.slice(0, MAX_ARTICLES_PER_SOURCE)) {
        const item = parseRSSItem(match);
        if (item.title && item.link) {
            items.push(item);
        }
    }
    
    return items;
}

// ============================================
// GUARDAR EN FIREBASE
// ============================================

async function saveToFirestore(db, articles) {
    console.log(`\n💾 Guardando ${articles.length} noticias en Firestore...`);
    
    let batch = db.batch();
    let saved = 0;
    
    for (const article of articles) {
        try {
            // Generar ID con SHA256 (OWASP: uso de hash seguro)
            const crypto = require('crypto');
            const newsId = crypto
                .createHash('sha256')
                .update(article.link)
                .digest('hex')
                .substring(0, 16);
            
            const newsRef = db.collection('news').doc(newsId);
            
            const pubDate = new Date(article.pubDate);
            
            // NUEVO: titleEs y summaryEs siempre vacíos (sin traducción)
            const newsData = {
                id: newsId,
                title: article.title || '',
                titleEs: '',  // Siempre vacío - sin traducción
                link: article.link || '',
                description: article.description || '',
                summary: article.summary || '',
                summaryEs: '',  // Siempre vacío - sin traducción
                pubDate: Timestamp.fromDate(pubDate),
                sourceName: article.sourceName || '',
                sourceColor: article.sourceColor || '',
                sourceCategory: article.sourceCategory || '',
                thumbnail: article.thumbnail || '',
                author: article.author || '',
                metadata: article.metadata || {},
                year: pubDate.getFullYear(),
                month: pubDate.getMonth() + 1,
                day: pubDate.getDate(),
                dateKey: `${pubDate.getFullYear()}-${String(pubDate.getMonth() + 1).padStart(2, '0')}-${String(pubDate.getDate()).padStart(2, '0')}`,
                savedAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            
            // Usar set para sobrescribir completamente
            batch.set(newsRef, newsData);
            saved++;
            
            if (saved % 500 === 0) {
                await batch.commit();
                batch = db.batch();
                console.log(`✅ Batch guardado: ${saved} noticias`);
            }
        } catch (error) {
            console.error(`❌ Error guardando noticia "${article.title}":`, error.message);
        }
    }
    
    // Commit final
    if (saved % 500 !== 0) {
        await batch.commit();
    }
    
    console.log(`✅ ${saved} noticias guardadas en Firestore`);
    return saved;
}

// ============================================
// MAIN FUNCTION
// ============================================

async function main() {
    console.log('\n🚀 Iniciando RSS News Fetcher con Claude API...\n');
    console.log('📝 v3.0: Filtros PRE-API + Solo resumen en idioma original\n');
    
    const db = initializeFirebase();
    
    // Verificar presupuesto mensual
    const { totalCost: monthlyBudget } = await checkMonthlyBudget(db);
    
    const allArticles = [];
    let successfulSources = 0;
    let failedSources = 0;
    
    console.log('\n📡 Descargando noticias de fuentes RSS...\n');
    
    for (const [key, source] of Object.entries(NEWS_SOURCES)) {
        // Verificar límite global de artículos
        if (articlesProcessed >= SAFETY_CONFIG.MAX_ARTICLES_PER_RUN) {
            console.log(`\n⚠️ LÍMITE GLOBAL ALCANZADO: ${articlesProcessed} artículos procesados`);
            console.log(`   Deteniendo procesamiento para controlar costos y tiempo de ejecución`);
            break;
        }
        
        try {
            console.log(`📥 ${source.name}...`);
            
            const xmlData = await fetchRSS(source.rss);
            const articles = parseRSS(xmlData, source.name);
            
            if (articles.length > 0) {
                console.log(`   ✅ ${articles.length} artículos encontrados`);
                
                const enrichedArticles = [];
                let sourceApproved = 0;
                let sourceRejected = 0;

                for (const article of articles) {
                    // Verificar límite global antes de procesar cada artículo
                    if (articlesProcessed >= SAFETY_CONFIG.MAX_ARTICLES_PER_RUN) {
                        break;
                    }

                    // ════════════════════════════════════════
                    // FILTRO PRE-API: solo relevantes a Claude
                    // ════════════════════════════════════════
                    filterStats.total++;
                    const filterDecision = shouldProcessWithClaude(article);
                    filterStats.byCategory[filterDecision.category]++;

                    if (!filterDecision.process) {
                        filterStats.rejected++;
                        sourceRejected++;
                        continue; // Descartar — no llama a Claude API
                    }

                    filterStats.approved++;
                    sourceApproved++;
                    
                    const enriched = {
                        ...article,
                        sourceName: source.name,
                        sourceColor: source.color,
                        sourceCategory: source.category,
                        metadata: enrichMetadata(article)
                    };
                    
                    // Procesar con Claude API
                    const aiResult = await processArticleWithClaude(enriched, monthlyBudget + actualCost);
                    
                    // NUEVO: Solo asignar summary (no titleEs ni summaryEs)
                    enriched.summary = aiResult.summary;
                    
                    enrichedArticles.push(enriched);
                    articlesProcessed++;
                    
                    // Delay para evitar rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                console.log(`   🔍 Filtro: ${sourceApproved} aprobadas / ${sourceRejected} rechazadas`);
                
                allArticles.push(...enrichedArticles);
                successfulSources++;
            } else {
                console.log(`   ⚠️ No se encontraron artículos`);
                failedSources++;
            }
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            failedSources++;
        }
    }
    
    // Guardar en Firebase
    if (allArticles.length > 0) {
        await saveToFirestore(db, allArticles);
    }
    
    // Registrar uso de API
    await logAPIUsage(db);
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE EJECUCIÓN v3.1');
    console.log('='.repeat(60));
    console.log(`✅ Fuentes exitosas: ${successfulSources}`);
    console.log(`❌ Fuentes fallidas: ${failedSources}`);
    console.log(`\n🔍 FILTRADO PRE-API (Nivel 1 + Nivel 2 | Score mínimo: ${MIN_RELEVANCE_SCORE}):`);
    console.log(`   Total evaluadas:  ${filterStats.total}`);
    console.log(`   ✅ Aprobadas:     ${filterStats.approved} (${filterStats.total > 0 ? Math.round(filterStats.approved / filterStats.total * 100) : 0}%)`);
    console.log(`   ❌ Rechazadas:    ${filterStats.rejected} (${filterStats.total > 0 ? Math.round(filterStats.rejected / filterStats.total * 100) : 0}%)`);
    console.log(`   - Técnicas:       ${filterStats.byCategory.technical}`);
    console.log(`   - Negocio:        ${filterStats.byCategory.business}`);
    console.log(`   - Bloqueadas BL:  ${filterStats.byCategory.blocked}`);
    console.log(`   - Score bajo:     ${filterStats.byCategory.no_match}`);
    console.log(`\n🤖 CLAUDE API:`);
    console.log(`   Artículos procesados: ${articlesProcessed}`);
    console.log(`   Llamadas API: ${apiCallCount}`);
    console.log(`   Errores API: ${apiErrors}`);
    console.log(`   Fallback usado: ${fallbackUsed} veces`);
    console.log('\n💰 COSTOS:');
    console.log(`   Input tokens: ${actualInputTokens.toLocaleString()}`);
    console.log(`   Output tokens: ${actualOutputTokens.toLocaleString()}`);
    console.log(`   Costo estimado: $${estimatedCost.toFixed(6)}`);
    console.log(`   Costo real: $${actualCost.toFixed(6)}`);
    console.log(`   💡 Ahorro acumulado vs v1.0: ~88% (62% sin traducción + filtros v3.1)`);
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ Proceso completado exitosamente\n');
}

// Ejecutar
main().catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
});
