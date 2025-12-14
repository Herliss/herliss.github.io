/**
 * RSS News Fetcher for GitHub Actions
 * 
 * Este script:
 * 1. Descarga noticias de 16 fuentes RSS
 * 2. Procesa y enriquece con metadata
 * 3. Guarda en Firebase Firestore
 * 
 * Se ejecuta automáticamente cada hora vía GitHub Actions
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 */

const https = require('https');
const http = require('http');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// ============================================
// CONFIGURACIÓN
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
        color: '#16a085',
        category: 'general'
    },
    cybernews: {
        name: 'Cybernews',
        rss: 'https://cybernews.com/feed/',
        color: '#f39c12',
        category: 'general'
    },
    talos: {
        name: 'Talos Intelligence',
        rss: 'https://blog.talosintelligence.com/feeds/posts/default',
        color: '#d35400',
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
    paloalto: {
        name: 'Palo Alto Unit42',
        rss: 'https://unit42.paloaltonetworks.com/feed/',
        color: '#fa582d',
        category: 'corporate'
    },
    crowdstrike: {
        name: 'CrowdStrike Blog',
        rss: 'https://www.crowdstrike.com/blog/feed/',
        color: '#e01f3d',
        category: 'corporate'
    },
    mandiant: {
        name: 'Mandiant',
        rss: 'https://www.mandiant.com/resources/rss',
        color: '#ff6633',
        category: 'intelligence'
    }
};

const MAX_ARTICLES_PER_SOURCE = 25;
const REQUEST_TIMEOUT = 30000; // 30 segundos

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
    
    return {
        title: getContent('title'),
        link: getLink(),
        description: getContent('description') || getContent('summary'),
        pubDate: getPubDate(),
        author: getContent('author') || getContent('dc:creator')
    };
}

function parseRSS(xmlData, sourceName) {
    const items = [];
    
    // Extraer items
    const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
    const matches = xmlData.match(itemRegex);
    
    if (!matches) {
        console.warn(`⚠️ ${sourceName}: No items found in RSS`);
        return items;
    }
    
    for (let i = 0; i < Math.min(matches.length, MAX_ARTICLES_PER_SOURCE); i++) {
        try {
            const item = parseRSSItem(matches[i]);
            if (item.title && item.link) {
                items.push(item);
            }
        } catch (error) {
            console.error(`❌ Error parsing item from ${sourceName}:`, error);
        }
    }
    
    return items;
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
        iocs: []
    };
    
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
    
    // Threat Actors comunes
    const threatActors = ['apt28', 'apt29', 'apt32', 'apt41', 'lazarus', 'kimsuky', 'fancy bear', 'cozy bear'];
    threatActors.forEach(actor => {
        if (text.includes(actor)) {
            metadata.threatActors.push(actor.toUpperCase());
        }
    });
    
    // Productos afectados
    const products = ['windows', 'linux', 'android', 'ios', 'chrome', 'firefox', 'microsoft', 'google', 'apple'];
    products.forEach(product => {
        if (text.includes(product)) {
            metadata.affectedProducts.push(product.charAt(0).toUpperCase() + product.slice(1));
        }
    });
    
    return metadata;
}

// ============================================
// GUARDAR EN FIRESTORE
// ============================================

function generateNewsId(url) {
    let hash = 0;
    const cleanUrl = url.toLowerCase().trim();
    
    for (let i = 0; i < cleanUrl.length; i++) {
        const char = cleanUrl.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return 'news_' + Math.abs(hash).toString(36);
}

async function saveToFirestore(db, articles) {
    if (articles.length === 0) {
        console.log('📝 No hay noticias para guardar');
        return 0;
    }
    
    console.log(`💾 Guardando ${articles.length} noticias en Firestore...`);
    
    const batch = db.batch();
    let saved = 0;
    
    for (const article of articles) {
        try {
            const newsId = generateNewsId(article.link);
            const newsRef = db.collection('news').doc(newsId);
            
            const pubDate = new Date(article.pubDate);
            if (isNaN(pubDate.getTime())) {
                console.warn(`⚠️ Fecha inválida para: ${article.title}`);
                continue;
            }
            
            const newsData = {
                id: newsId,
                title: article.title,
                link: article.link,
                description: article.description || '',
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
            
            batch.set(newsRef, newsData, { merge: true });
            saved++;
            
            // Commit cada 500 documentos (límite de Firestore)
            if (saved % 500 === 0) {
                await batch.commit();
                console.log(`✅ Batch guardado: ${saved} noticias`);
            }
        } catch (error) {
            console.error(`❌ Error guardando noticia "${article.title}":`, error);
        }
    }
    
    // Commit final
    if (saved % 500 !== 0) {
        await batch.commit();
    }
    
    console.log(`✅ Total guardado: ${saved} noticias en Firestore`);
    return saved;
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('🚀 Iniciando actualización de noticias...');
    console.log(`📅 Fecha: ${new Date().toISOString()}`);
    console.log(`📰 Fuentes: ${Object.keys(NEWS_SOURCES).length}`);
    
    const db = initializeFirebase();
    
    const allArticles = [];
    let successfulSources = 0;
    let failedSources = 0;
    
    for (const [key, source] of Object.entries(NEWS_SOURCES)) {
        try {
            console.log(`\n📡 Descargando: ${source.name}...`);
            
            const xmlData = await fetchRSS(source.rss);
            const articles = parseRSS(xmlData, source.name);
            
            if (articles.length > 0) {
                console.log(`   ✅ ${articles.length} artículos encontrados`);
                
                // Enriquecer con metadata
                const enrichedArticles = articles.map(article => ({
                    ...article,
                    sourceName: source.name,
                    sourceColor: source.color,
                    sourceCategory: source.category,
                    metadata: enrichMetadata(article)
                }));
                
                allArticles.push(...enrichedArticles);
                successfulSources++;
            } else {
                console.log(`   ⚠️ No se encontraron artículos`);
                failedSources++;
            }
            
            // Delay entre requests
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            failedSources++;
        }
    }
    
    console.log('\n📊 Resumen:');
    console.log(`   ✅ Fuentes exitosas: ${successfulSources}`);
    console.log(`   ❌ Fuentes fallidas: ${failedSources}`);
    console.log(`   📄 Total artículos: ${allArticles.length}`);
    
    if (allArticles.length > 0) {
        await saveToFirestore(db, allArticles);
        console.log('\n✅ Actualización completada exitosamente');
    } else {
        console.log('\n⚠️ No se encontraron noticias para guardar');
    }
}

// Ejecutar
main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
