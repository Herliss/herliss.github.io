/**
 * RSS News Fetcher with Claude API
 * 
 * Features:
 * - Resumen inteligente con Claude API
 * - Traducción al español
 * - CIA+NR scoring automático
 * - Sistema de protección de costos
 * - Degradación gradual
 * - Logging de uso en Firebase
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2025
 */

const https = require('https');
const http = require('http');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

// ============================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================

const SAFETY_CONFIG = {
    // Límites de presupuesto
    MONTHLY_BUDGET_LIMIT: 4.00,         // $4 USD/mes máximo
    ALERT_THRESHOLD: 3.00,              // Alertar a $3 USD
    DAILY_BUDGET_LIMIT: 0.15,           // ~$4.50/mes si se usa todos los días
    
    // Límites por ejecución
    MAX_CALLS_PER_RUN: 50,              // Máximo 50 llamadas API por workflow
    MAX_CALLS_PER_ARTICLE: 1,           // 1 llamada batch por artículo
    
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
    microsoft: {
        name: 'Microsoft Security',
        rss: 'https://www.microsoft.com/security/blog/feed/',
        color: '#00a4ef',
        category: 'corporate'
    },
    uscert: {
        name: 'US-CERT (CISA)',
        rss: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
        color: '#c0392b',
        category: 'intelligence'
    },
    securityweek: {
        name: 'SecurityWeek',
        rss: 'https://www.securityweek.com/rss/',
        color: '#3498db',
        category: 'general'
    },
    darkreading: {
        name: 'Dark Reading',
        rss: 'https://www.darkreading.com/rss.xml',
        color: '#34495e',
        category: 'general'
    },
    krebsonsecurity: {
        name: 'Krebs on Security',
        rss: 'https://krebsonsecurity.com/feed/',
        color: '#16a085',
        category: 'blog'
    },
    scmagazine: {
        name: 'SC Magazine',
        rss: 'https://www.scmagazine.com/home/feed/',
        color: '#e67e22',
        category: 'general'
    },
    cybernews: {
        name: 'Cybernews',
        rss: 'https://cybernews.com/feed/',
        color: '#9b59b6',
        category: 'general'
    },
    talos: {
        name: 'Talos Intelligence',
        rss: 'https://blog.talosintelligence.com/feeds/posts/default',
        color: '#1abc9c',
        category: 'intelligence'
    },
    virustotal: {
        name: 'VirusTotal Blog',
        rss: 'https://blog.virustotal.com/feeds/posts/default',
        color: '#27ae60',
        category: 'intelligence'
    },
    googlecloud: {
        name: 'Google Cloud Security',
        rss: 'https://cloud.google.com/blog/topics/security/rss/',
        color: '#4285f4',
        category: 'corporate'
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
    crowdstrike: {
        name: 'CrowdStrike',
        rss: 'https://www.crowdstrike.com/blog/feed/',
        color: '#ec1f26',
        category: 'corporate'
    },
    mandiant: {
        name: 'Mandiant',
        rss: 'https://www.mandiant.com/resources/rss',
        color: '#ff6600',
        category: 'intelligence'
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
// CLAUDE API - BATCH PROCESSING
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
        const prompt = buildOptimizedPrompt(article, processingLevel);
        
        // Estimar costo
        const estimatedInputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = processingLevel === 'full' ? 400 : 200;
        const estimatedCallCost = 
            (estimatedInputTokens / 1000000 * SAFETY_CONFIG.PRICE_INPUT) +
            (estimatedOutputTokens / 1000000 * SAFETY_CONFIG.PRICE_OUTPUT);
        
        estimatedCost += estimatedCallCost;
        
        console.log(`   🤖 API call ${apiCallCount}: Nivel ${processingLevel}`);
        
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
        return parseClaudeResponse(result.content, processingLevel);
        
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

function determineProcessingLevel(monthlyBudget) {
    const remaining = SAFETY_CONFIG.MONTHLY_BUDGET_LIMIT - monthlyBudget;
    
    if (remaining >= 2.00) return 'full';      // Resumen + 2 traducciones
    if (remaining >= 1.00) return 'medium';    // Solo resumen + traducción de resumen
    if (remaining >= 0.50) return 'basic';     // Solo resumen en inglés
    return 'none';                             // Fallback extractivo
}

function buildOptimizedPrompt(article, level) {
    const basePrompt = `You are a cybersecurity intelligence assistant processing threat information for CISOs.

Article Title: ${article.title}
Article Description: ${article.description.substring(0, 1000)}

`;
    
    if (level === 'full') {
        return basePrompt + `Tasks:
1. Generate a concise 2-3 sentence English summary focusing on: threat, impact, and affected systems
2. Translate the title to Spanish (keep technical terms like CVE, CVSS, API, IoC in English)
3. Translate your summary to Spanish (keep technical terms in English)

Return ONLY a JSON object (no markdown formatting):
{"summary": "English summary", "titleEs": "Título en español", "summaryEs": "Resumen en español"}`;
    }
    
    if (level === 'medium') {
        return basePrompt + `Tasks:
1. Generate a concise 2-3 sentence English summary focusing on: threat, impact, and affected systems
2. Translate your summary to Spanish (keep technical terms like CVE, CVSS, API in English)

Return ONLY a JSON object:
{"summary": "English summary", "summaryEs": "Resumen en español"}`;
    }
    
    // level === 'basic'
    return basePrompt + `Task: Generate a concise 2-3 sentence English summary focusing on: threat, impact, and affected systems.

Return ONLY a JSON object:
{"summary": "English summary"}`;
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

function parseClaudeResponse(content, level) {
    try {
        const text = content[0].text;
        
        // LOGGING DETALLADO PARA DEBUGGING
        console.log(`   📝 Respuesta cruda de Claude (primeros 200 chars): ${text.substring(0, 200)}`);
        
        // Limpiar markdown y otros formatos
        let cleanText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/^[\s\n]*\{/g, '{')  // Eliminar espacios antes del {
            .replace(/\}[\s\n]*$/g, '}')  // Eliminar espacios después del }
            .trim();
        
        console.log(`   🧹 Texto limpio (primeros 200 chars): ${cleanText.substring(0, 200)}`);
        
        const parsed = JSON.parse(cleanText);
        
        const result = {
            summary: parsed.summary || '',
            titleEs: parsed.titleEs || '',
            summaryEs: parsed.summaryEs || ''
        };
        
        console.log(`   ✅ Parsing exitoso - summary: ${result.summary.length} chars, titleEs: ${result.titleEs.length} chars, summaryEs: ${result.summaryEs.length} chars`);
        
        return result;
    } catch (error) {
        console.error(`   ❌ Error parseando respuesta: ${error.message}`);
        console.error(`   ❌ Stack trace: ${error.stack}`);
        console.error(`   ❌ Contenido problemático: ${JSON.stringify(content).substring(0, 300)}`);
        return { summary: '', titleEs: '', summaryEs: '' };
    }
}

// ============================================
// FALLBACK: RESUMEN EXTRACTIVO
// ============================================

function generateExtractiveSummary(article) {
    const description = article.description || '';
    const sentences = description.match(/[^.!?]+[.!?]+/g) || [];
    const summary = sentences.slice(0, 3).join(' ').trim();
    const truncated = summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
    
    return {
        summary: truncated || description.substring(0, 200) + '...',
        titleEs: '',
        summaryEs: ''
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
                scores.confidentiality = Math.min(scores.confidentiality + group.score, 10);
            }
        });
    });
    
    // INTEGRITY
    const integrityKeywords = [
        { words: ['code injection', 'sql injection', 'malware', 'trojan', 'backdoor', 'tampering'], score: 3 },
        { words: ['modification', 'altered', 'corrupted', 'hijacked', 'compromised system'], score: 2 },
        { words: ['integrity', 'checksum', 'verification', 'validation', 'authentication bypass'], score: 1 }
    ];
    
    integrityKeywords.forEach(group => {
        group.words.forEach(keyword => {
            if (textLower.includes(keyword)) {
                scores.integrity = Math.min(scores.integrity + group.score, 10);
            }
        });
    });
    
    // AVAILABILITY
    const availabilityKeywords = [
        { words: ['ddos', 'denial of service', 'ransomware', 'service outage', 'system down', 'complete shutdown'], score: 3 },
        { words: ['disruption', 'crash', 'downtime', 'unavailable', 'service disruption'], score: 2 },
        { words: ['performance', 'slowdown', 'resource exhaustion', 'availability', 'uptime'], score: 1 }
    ];
    
    availabilityKeywords.forEach(group => {
        group.words.forEach(keyword => {
            if (textLower.includes(keyword)) {
                scores.availability = Math.min(scores.availability + group.score, 10);
            }
        });
    });
    
    // NON-REPUDIATION
    const nonRepudiationKeywords = [
        { words: ['certificate', 'digital signature', 'audit log', 'logging disabled', 'log tampering'], score: 3 },
        { words: ['authentication', 'identity', 'tracking', 'accountability', 'forensic'], score: 2 },
        { words: ['timestamp', 'trace', 'record', 'evidence', 'proof'], score: 1 }
    ];
    
    nonRepudiationKeywords.forEach(group => {
        group.words.forEach(keyword => {
            if (textLower.includes(keyword)) {
                scores.nonRepudiation = Math.min(scores.nonRepudiation + group.score, 10);
            }
        });
    });
    
    // Ajustes basados en CVE/CVSS
    if (textLower.includes('cve-')) {
        scores.confidentiality = Math.min(scores.confidentiality + 1, 10);
        scores.integrity = Math.min(scores.integrity + 1, 10);
    }
    
    const cvssMatch = textLower.match(/cvss[:\s]+(\d+\.?\d*)/i);
    if (cvssMatch) {
        const cvssScore = parseFloat(cvssMatch[1]);
        if (cvssScore >= 9.0) {
            scores.confidentiality = Math.min(scores.confidentiality + 2, 10);
            scores.integrity = Math.min(scores.integrity + 2, 10);
            scores.availability = Math.min(scores.availability + 2, 10);
        } else if (cvssScore >= 7.0) {
            scores.confidentiality = Math.min(scores.confidentiality + 1, 10);
            scores.integrity = Math.min(scores.integrity + 1, 10);
            scores.availability = Math.min(scores.availability + 1, 10);
        }
    }
    
    // Normalización
    if (textLower.includes('cve-') || textLower.includes('vulnerability')) {
        if (scores.confidentiality === 0) scores.confidentiality = 1;
        if (scores.integrity === 0) scores.integrity = 1;
        if (scores.availability === 0) scores.availability = 1;
    }
    
    return scores;
}

// ============================================
// METADATA EXTRACTION
// ============================================

function enrichMetadata(article) {
    const text = `${article.title} ${article.description}`.toLowerCase();
    
    const metadata = {
        cves: [],
        cvss: null,
        threatActors: [],
        affectedProducts: [],
        iocs: [],
        ciaScore: {
            confidentiality: 0,
            integrity: 0,
            availability: 0,
            nonRepudiation: 0
        }
    };
    
    // CIA+NR Score
    const fullText = `${article.title} ${article.description}`;
    metadata.ciaScore = calculateCIAScore(fullText);
    
    // Extraer CVEs
    const cveMatches = text.match(/cve-\d{4}-\d{4,7}/gi);
    if (cveMatches) {
        metadata.cves = [...new Set(cveMatches.map(c => c.toUpperCase()))];
    }
    
    // Extraer CVSS
    const cvssMatch = text.match(/cvss[:\s]+(\d+\.?\d*)/i);
    if (cvssMatch) {
        metadata.cvss = parseFloat(cvssMatch[1]);
    }
    
    // Threat Actors
    const threatActors = ['apt28', 'apt29', 'apt32', 'apt41', 'lazarus', 'kimsuky', 'fancy bear', 'cozy bear'];
    threatActors.forEach(actor => {
        if (text.includes(actor)) {
            metadata.threatActors.push(actor.toUpperCase());
        }
    });
    
    // Productos afectados
    const products = ['windows', 'linux', 'android', 'ios', 'chrome', 'firefox', 'microsoft', 'google', 'apple', 'fortinet', 'cisco'];
    products.forEach(product => {
        if (text.includes(product)) {
            metadata.affectedProducts.push(product.charAt(0).toUpperCase() + product.slice(1));
        }
    });
    
    return metadata;
}

// ============================================
// LOGGING A FIREBASE
// ============================================

async function logAPIUsage(db) {
    try {
        const now = new Date();
        const usageData = {
            timestamp: Timestamp.now(),
            
            // Contadores
            apiCalls: apiCallCount,
            articlesProcessed: articlesProcessed,
            apiErrors: apiErrors,
            fallbackUsed: fallbackUsed,
            
            // Tokens
            estimatedInputTokens: Math.ceil(estimatedCost * 1000000 / SAFETY_CONFIG.PRICE_INPUT),
            estimatedOutputTokens: Math.ceil(estimatedCost * 1000000 / SAFETY_CONFIG.PRICE_OUTPUT),
            actualInputTokens: actualInputTokens,
            actualOutputTokens: actualOutputTokens,
            
            // Costos
            estimatedCost: parseFloat(estimatedCost.toFixed(6)),
            actualCost: parseFloat(actualCost.toFixed(6)),
            
            // Metadata temporal
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            day: now.getDate(),
            hour: now.getHours()
        };
        
        await db.collection('api_usage').add(usageData);
        console.log('\n✅ Uso de API registrado en Firebase');
        
    } catch (error) {
        console.error('⚠️ Error registrando uso de API:', error.message);
    }
}

// ============================================
// FETCH RSS
// ============================================

function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const timeout = setTimeout(() => {
            reject(new Error('Timeout'));
        }, REQUEST_TIMEOUT);
        
        protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; HerlissNewsBot/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            }
        }, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                clearTimeout(timeout);
                resolve(data);
            });
        }).on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

// ============================================
// PARSE RSS
// ============================================

function parseRSSItem(itemXML) {
    const getContent = (tag) => {
        const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i');
        const match = itemXML.match(regex);
        return match ? (match[1] || match[2] || '').trim() : '';
    };
    
    const getLink = () => {
        const linkMatch = itemXML.match(/<link>([^<]+)<\/link>/i);
        if (linkMatch) return linkMatch[1].trim();
        
        const atomLinkMatch = itemXML.match(/<link[^>]+href=["']([^"']+)["']/i);
        if (atomLinkMatch) return atomLinkMatch[1].trim();
        
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
    
    return {
        title: getContent('title'),
        link: getLink(),
        description: getContent('description') || getContent('summary'),
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
    
    const batch = db.batch();
    let saved = 0;
    
    for (const article of articles) {
        try {
            const newsId = `news_${Buffer.from(article.link)
                .toString('base64')
                .replace(/[^a-zA-Z0-9]/g, '')
                .substring(0, 6)}`;
            
            const newsRef = db.collection('news').doc(newsId);
            
            const pubDate = new Date(article.pubDate);
            
            // DEBUG: Log de los primeros 3 artículos
            if (saved < 3) {
                console.log(`\n   🔍 DEBUG Guardando artículo ${saved + 1}:`);
                console.log(`      article.summary: ${article.summary ? `"${article.summary.substring(0, 80)}..."` : 'UNDEFINED/NULL'}`);
                console.log(`      article.titleEs: ${article.titleEs ? `"${article.titleEs}"` : 'UNDEFINED/NULL'}`);
                console.log(`      article.summaryEs: ${article.summaryEs ? `"${article.summaryEs.substring(0, 80)}..."` : 'UNDEFINED/NULL'}`);
            }
            
            const newsData = {
                id: newsId,
                title: article.title,
                titleEs: article.titleEs || '',
                link: article.link,
                description: article.description || '',
                summary: article.summary || '',
                summaryEs: article.summaryEs || '',
                pubDate: Timestamp.fromDate(pubDate),
                sourceName: article.sourceName,
                sourceColor: article.sourceColor,
                sourceCategory: article.sourceCategory,
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
            
            // DEBUG: Log del objeto que se va a guardar
            if (saved < 3) {
                console.log(`      newsData.summary: ${newsData.summary ? `"${newsData.summary.substring(0, 80)}..."` : 'CADENA VACÍA'}`);
                console.log(`      newsData.titleEs: ${newsData.titleEs ? `"${newsData.titleEs}"` : 'CADENA VACÍA'}`);
                console.log(`      newsData.summaryEs: ${newsData.summaryEs ? `"${newsData.summaryEs.substring(0, 80)}..."` : 'CADENA VACÍA'}`);
            }
            
            batch.set(newsRef, newsData, { merge: true });
            saved++;
            
            if (saved % 500 === 0) {
                await batch.commit();
                console.log(`✅ Batch guardado: ${saved} noticias`);
            }
        } catch (error) {
            console.error(`❌ Error guardando noticia "${article.title}":`, error.message);
        }
    }
    
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
    
    const db = initializeFirebase();
    
    // Verificar presupuesto mensual
    const { totalCost: monthlyBudget } = await checkMonthlyBudget(db);
    
    const allArticles = [];
    let successfulSources = 0;
    let failedSources = 0;
    
    console.log('\n📡 Descargando noticias de fuentes RSS...\n');
    
    for (const [key, source] of Object.entries(NEWS_SOURCES)) {
        try {
            console.log(`📥 ${source.name}...`);
            
            const xmlData = await fetchRSS(source.rss);
            const articles = parseRSS(xmlData, source.name);
            
            if (articles.length > 0) {
                console.log(`   ✅ ${articles.length} artículos encontrados`);
                
                const enrichedArticles = [];
                for (const article of articles) {
                    const enriched = {
                        ...article,
                        sourceName: source.name,
                        sourceColor: source.color,
                        sourceCategory: source.category,
                        metadata: enrichMetadata(article)
                    };
                    
                    // Procesar con Claude API
                    const aiResult = await processArticleWithClaude(enriched, monthlyBudget + actualCost);
                    
                    enriched.summary = aiResult.summary;
                    enriched.titleEs = aiResult.titleEs;
                    enriched.summaryEs = aiResult.summaryEs;
                    
                    enrichedArticles.push(enriched);
                    articlesProcessed++;
                    
                    // Delay para evitar rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
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
        console.log(`\n🔍 DEBUG: Verificando contenido antes de guardar en Firebase...`);
        console.log(`   Total artículos: ${allArticles.length}`);
        
        // Verificar los primeros 3 artículos
        for (let i = 0; i < Math.min(3, allArticles.length); i++) {
            const art = allArticles[i];
            console.log(`\n   Artículo ${i + 1}:`);
            console.log(`      title: ${art.title ? art.title.substring(0, 50) : 'VACÍO'}`);
            console.log(`      summary: ${art.summary ? `${art.summary.length} chars` : 'VACÍO/UNDEFINED'}`);
            console.log(`      titleEs: ${art.titleEs ? `${art.titleEs.length} chars` : 'VACÍO/UNDEFINED'}`);
            console.log(`      summaryEs: ${art.summaryEs ? `${art.summaryEs.length} chars` : 'VACÍO/UNDEFINED'}`);
        }
        
        await saveToFirestore(db, allArticles);
    }
    
    // Registrar uso de API
    await logAPIUsage(db);
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE EJECUCIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Fuentes exitosas: ${successfulSources}`);
    console.log(`❌ Fuentes fallidas: ${failedSources}`);
    console.log(`📰 Artículos procesados: ${articlesProcessed}`);
    console.log(`🤖 Llamadas API: ${apiCallCount}`);
    console.log(`⚠️ Errores API: ${apiErrors}`);
    console.log(`🔄 Fallback usado: ${fallbackUsed} veces`);
    console.log('\n💰 COSTOS:');
    console.log(`   Input tokens: ${actualInputTokens.toLocaleString()}`);
    console.log(`   Output tokens: ${actualOutputTokens.toLocaleString()}`);
    console.log(`   Costo estimado: $${estimatedCost.toFixed(6)}`);
    console.log(`   Costo real: $${actualCost.toFixed(6)}`);
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ Proceso completado exitosamente\n');
}

// Ejecutar
main().catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
});
