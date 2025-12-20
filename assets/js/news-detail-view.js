/**
 * News Detail View - Mostrar detalle de noticia en panel principal
 * VERSIÓN 4.0 - CORRECCIÓN: Tarjetas individuales para noticias relacionadas
 * 
 * CAMBIOS v4.0:
 * ✅ Tarjeta de detalle termina después de "Leer más →"
 * ✅ Noticias relacionadas se renderizan como tarjetas INDIVIDUALES
 * ✅ Solo mostrar noticias relacionadas hasta altura del sidebar "Categorías Populares"
 * ✅ Cada noticia relacionada con su propia tarjeta news-card
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 */

'use strict';

// ============================================
// ESTADO GLOBAL
// ============================================
let currentDetailView = null;

// ============================================
// FUNCIÓN PRINCIPAL: MOSTRAR DETALLE
// ============================================

/**
 * Muestra el detalle de una noticia buscando por su link
 * @param {string} newsLink - URL original de la noticia
 */
async function showNewsDetail(newsLink) {
    console.log(`📰 Buscando noticia por link: ${newsLink}`);
    
    // Verificar Firebase
    if (!window.db) {
        console.error('❌ Firebase no disponible');
        showError('Error de conexión con la base de datos');
        return;
    }
    
    try {
        // Mostrar loading
        showDetailLoading();
        
        // Buscar por link
        const snapshot = await window.db.collection('news')
            .where('link', '==', newsLink)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            console.warn('⚠️ Noticia no encontrada por link:', newsLink);
            
            // FALLBACK: Buscar en memoria
            const newsData = findInMemory(newsLink);
            if (newsData) {
                console.log('✅ Noticia encontrada en memoria');
                renderNewsDetail(newsData);
                scrollToDetailView();
                return;
            }
            
            showError('Noticia no encontrada');
            return;
        }
        
        const doc = snapshot.docs[0];
        const newsData = doc.data();
        
        // Renderizar detalle
        renderNewsDetail(newsData);
        
        // Scroll suave
        scrollToDetailView();
        
        console.log('✅ Detalle mostrado exitosamente');
        
    } catch (error) {
        console.error('❌ Error obteniendo noticia:', error);
        
        // FALLBACK: Buscar en memoria
        const newsData = findInMemory(newsLink);
        if (newsData) {
            console.log('✅ Usando datos en memoria como fallback');
            renderNewsDetail(newsData);
            scrollToDetailView();
            return;
        }
        
        showError('Error al cargar la noticia');
    }
}

// ============================================
// BÚSQUEDA EN MEMORIA (FALLBACK)
// ============================================

function findInMemory(newsLink) {
    if (window.unfilteredNewsData && Array.isArray(window.unfilteredNewsData)) {
        const found = window.unfilteredNewsData.find(article => article.link === newsLink);
        if (found) return found;
    }
    
    if (window.newsData && Array.isArray(window.newsData)) {
        const found = window.newsData.find(article => article.link === newsLink);
        if (found) return found;
    }
    
    return null;
}

// ============================================
// NOTICIAS RELACIONADAS
// ============================================

async function getRelatedNews(currentNews, daysBack = 30) {
    console.log('🔍 Buscando noticias relacionadas...');
    
    if (!window.db) {
        console.warn('⚠️ Firebase no disponible');
        return [];
    }
    
    try {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - daysBack);
        
        const snapshot = await window.db.collection('news')
            .where('pubDate', '>=', limitDate)
            .limit(100)
            .get();
        
        if (snapshot.empty) {
            console.log('📭 No hay noticias recientes');
            return [];
        }
        
        const allNews = [];
        snapshot.forEach(doc => {
            const newsData = doc.data();
            if (newsData.link !== currentNews.link) {
                allNews.push(newsData);
            }
        });
        
        const scored = allNews
            .map(news => ({
                news: news,
                score: calculateRelevance(currentNews, news),
                similarities: identifySimilarities(currentNews, news)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);
        
        console.log(`✅ Encontradas ${scored.length} noticias relacionadas`);
        return scored;
        
    } catch (error) {
        console.error('❌ Error obteniendo noticias relacionadas:', error);
        return [];
    }
}

function calculateRelevance(current, other) {
    let score = 0;
    
    const commonCVEs = countCommonItems(current.metadata?.cves, other.metadata?.cves);
    score += commonCVEs * 10;
    
    const commonThreatActors = countCommonItems(current.metadata?.threatActors, other.metadata?.threatActors);
    score += commonThreatActors * 8;
    
    const commonProducts = countCommonItems(current.metadata?.affectedProducts, other.metadata?.affectedProducts);
    score += commonProducts * 5;
    
    if (current.sourceName === other.sourceName) {
        score += 2;
    }
    
    if (current.metadata?.cvssScore && other.metadata?.cvssScore) {
        const diff = Math.abs(current.metadata.cvssScore - other.metadata.cvssScore);
        if (diff < 2.0) score += 3;
    }
    
    return score;
}

function identifySimilarities(current, other) {
    return {
        cves: getCommonItems(current.metadata?.cves, other.metadata?.cves),
        threatActors: getCommonItems(current.metadata?.threatActors, other.metadata?.threatActors),
        products: getCommonItems(current.metadata?.affectedProducts, other.metadata?.affectedProducts)
    };
}

function countCommonItems(arr1, arr2) {
    if (!arr1 || !arr2 || !Array.isArray(arr1) || !Array.isArray(arr2)) {
        return 0;
    }
    return arr1.filter(item => arr2.includes(item)).length;
}

function getCommonItems(arr1, arr2) {
    if (!arr1 || !arr2 || !Array.isArray(arr1) || !Array.isArray(arr2)) {
        return [];
    }
    return arr1.filter(item => arr2.includes(item));
}

// ============================================
// RENDERIZADO - TARJETA PRINCIPAL
// ============================================

/**
 * Renderiza SOLO la tarjeta de detalle (sin noticias relacionadas)
 */
async function renderNewsDetail(newsData) {
    const container = document.getElementById('news-detail-container');
    if (!container) {
        console.error('❌ Contenedor #news-detail-container no encontrado');
        return;
    }
    
    const titleEs = newsData.titleEs || newsData.title || 'Sin título';
    const summaryEs = newsData.summaryEs || newsData.summary || newsData.description || 'Sin resumen disponible';
    const link = newsData.link || '#';
    const sourceName = newsData.sourceName || 'Fuente desconocida';
    
    let pubDate;
    if (newsData.pubDate) {
        if (newsData.pubDate.toDate) {
            pubDate = newsData.pubDate.toDate();
        } else {
            pubDate = new Date(newsData.pubDate);
        }
    } else {
        pubDate = new Date();
    }
    
    const formattedDate = pubDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // HTML - TERMINA DESPUÉS DE "Leer más →"
    const detailHTML = `
        <div class="news-detail-header">
            <button class="close-detail-btn" onclick="window.NewsDetailView.close()">
                ✕ Cerrar
            </button>
        </div>
        
        <article class="news-detail-article">
            <div class="detail-meta">
                <span class="detail-source">${sourceName}</span>
                <span class="detail-date">📅 ${formattedDate}</span>
            </div>
            
            <h1 class="detail-title">${titleEs}</h1>
            
            <div class="detail-summary">
                ${formatSummary(summaryEs)}
            </div>
            
            <div class="detail-actions">
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="btn-read-original">
                    Leer más →
                </a>
            </div>
        </article>
    `;
    
    container.innerHTML = detailHTML;
    container.classList.add('active');
    
    // CRÍTICO: Activar clase en el contenedor principal para grid layout
    const mainContainer = document.querySelector('.news-content .container');
    if (mainContainer) {
        mainContainer.classList.add('detail-view-active');
    }
    
    // Ocultar grid original
    const newsGrid = document.getElementById('news-container');
    if (newsGrid) {
        newsGrid.style.display = 'none';
    }
    
    currentDetailView = newsData;
    
    // Cargar noticias relacionadas COMO TARJETAS INDIVIDUALES
    loadRelatedNewsAsCards(newsData);
}

function formatSummary(summary) {
    if (!summary) return '<p>Sin resumen disponible</p>';
    
    const paragraphs = summary.split(/\n\n+|\. (?=[A-ZÁÉÍÓÚÑ])/);
    
    return paragraphs
        .filter(p => p.trim().length > 0)
        .map(p => {
            const trimmed = p.trim();
            const withPeriod = trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?') 
                ? trimmed 
                : trimmed + '.';
            return `<p>${withPeriod}</p>`;
        })
        .join('');
}

// ============================================
// RENDERIZADO - NOTICIAS RELACIONADAS COMO TARJETAS
// ============================================

/**
 * Carga y renderiza noticias relacionadas como tarjetas individuales
 */
async function loadRelatedNewsAsCards(newsData) {
    const newsGrid = document.getElementById('news-container');
    if (!newsGrid) return;
    
    try {
        // Obtener noticias relacionadas
        const relatedNews = await getRelatedNews(newsData);
        
        if (relatedNews.length === 0) {
            console.log('📭 No hay noticias relacionadas');
            return;
        }
        
        // Calcular cuántas mostrar según altura del sidebar
        const numToShow = calculateMaxRelatedNews();
        const newsToShow = relatedNews.slice(0, numToShow);
        
        console.log(`📊 Mostrando ${newsToShow.length} de ${relatedNews.length} noticias relacionadas`);
        
        // Limpiar grid y mostrar
        newsGrid.style.display = 'grid';
        newsGrid.innerHTML = '';
        
        // Renderizar cada noticia relacionada como tarjeta individual
        newsToShow.forEach(item => {
            const cardHTML = createIndividualRelatedCard(item);
            newsGrid.innerHTML += cardHTML;
        });
        
        console.log('✅ Noticias relacionadas renderizadas como tarjetas individuales');
        
    } catch (error) {
        console.error('❌ Error cargando noticias relacionadas:', error);
    }
}

/**
 * Calcula cuántas noticias relacionadas mostrar
 * Basándose en la altura del sidebar "Categorías Populares"
 */
function calculateMaxRelatedNews() {
    const sidebar = document.querySelector('.news-sidebar');
    if (!sidebar) return 5; // Fallback
    
    const detailContainer = document.getElementById('news-detail-container');
    if (!detailContainer) return 5;
    
    const sidebarHeight = sidebar.offsetHeight;
    const detailHeight = detailContainer.offsetHeight;
    
    // Espacio restante
    const remainingSpace = Math.max(0, sidebarHeight - detailHeight);
    
    // Cada tarjeta ≈ 280px de altura
    const cardHeight = 280;
    const calculatedAmount = Math.floor(remainingSpace / cardHeight);
    
    // Mínimo 3, máximo 10
    return Math.max(3, Math.min(calculatedAmount, 10));
}

/**
 * Crea una tarjeta individual de noticia relacionada
 * Usando el mismo formato de news-card del grid principal
 */
function createIndividualRelatedCard(item) {
    const news = item.news;
    const titleEs = news.titleEs || news.title || 'Sin título';
    const summaryEs = news.summaryEs || news.summary || news.description || '';
    const sourceName = news.sourceName || 'Fuente';
    const link = news.link || '#';
    
    // Truncar resumen a 100 caracteres para tarjetas compactas
    const truncatedSummary = summaryEs.length > 100 
        ? summaryEs.substring(0, 100) + '...' 
        : summaryEs;
    
    // Formatear fecha
    let formattedDate = 'Fecha desconocida';
    if (news.pubDate) {
        let date;
        if (news.pubDate.toDate) {
            date = news.pubDate.toDate();
        } else {
            date = new Date(news.pubDate);
        }
        formattedDate = date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }
    
    // Badges de similitud
    const badges = [];
    if (item.similarities.cves.length > 0) {
        badges.push(`<span class="similarity-badge badge-cve">CVE: ${item.similarities.cves.length}</span>`);
    }
    if (item.similarities.threatActors.length > 0) {
        badges.push(`<span class="similarity-badge badge-threat">Threat: ${item.similarities.threatActors.length}</span>`);
    }
    if (item.similarities.products.length > 0) {
        badges.push(`<span class="similarity-badge badge-product">Prod: ${item.similarities.products.length}</span>`);
    }
    
    // TARJETA COMPACTA CON TÍTULO VISIBLE
    return `
        <article class="news-card related-news-individual">
            <!-- Título de Noticia Relacionada -->
            <div class="related-news-badge">
                📰 Noticia Relacionada
            </div>
            
            <div class="news-card-header">
                <div class="header-left">
                    <span class="news-source">${sourceName}</span>
                    <span class="news-time">📅 ${formattedDate}</span>
                </div>
                <div class="header-right">
                    <span class="related-score-badge">Score: ${item.score}</span>
                </div>
            </div>
            
            <div class="news-card-body">
                <h3>
                    <a href="javascript:void(0)" onclick="window.NewsDetailView.show('${link}')">
                        ${titleEs}
                    </a>
                </h3>
                ${truncatedSummary ? `<p>${truncatedSummary}</p>` : ''}
                ${badges.length > 0 ? `<div class="similarity-badges">${badges.join('')}</div>` : ''}
            </div>
            
            <div class="news-card-footer">
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="read-more-btn">
                    Leer artículo original →
                </a>
            </div>
        </article>
    `;
}

// ============================================
// ESTADOS DE CARGA Y ERROR
// ============================================

function showDetailLoading() {
    const container = document.getElementById('news-detail-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="detail-loading">
            <div class="spinner"></div>
            <p>Cargando noticia...</p>
        </div>
    `;
    container.classList.add('active');
}

function showError(message) {
    const container = document.getElementById('news-detail-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="detail-error">
            <h3>⚠️ ${message}</h3>
            <p>La noticia podría haber sido eliminada o no estar disponible.</p>
            <button onclick="window.NewsDetailView.close()" class="btn-secondary">
                Volver a noticias
            </button>
        </div>
    `;
    container.classList.add('active');
}

// ============================================
// CERRAR VISTA DETALLE
// ============================================

function closeDetailView() {
    const container = document.getElementById('news-detail-container');
    const newsGrid = document.getElementById('news-container');
    
    if (container) {
        container.classList.remove('active');
        setTimeout(() => {
            container.innerHTML = '';
        }, 300);
    }
    
    // CRÍTICO: Desactivar clase del contenedor principal
    const mainContainer = document.querySelector('.news-content .container');
    if (mainContainer) {
        mainContainer.classList.remove('detail-view-active');
    }
    
    if (newsGrid) {
        newsGrid.style.display = 'grid';
        
        // Restaurar noticias originales
        if (window.unfilteredNewsData && typeof window.renderNews === 'function') {
            const recent = window.unfilteredNewsData.slice(0, 5);
            window.renderNews(recent);
        }
    }
    
    currentDetailView = null;
    console.log('✅ Vista de detalle cerrada');
}

// ============================================
// UTILIDADES
// ============================================

function scrollToDetailView() {
    const container = document.getElementById('news-detail-container');
    if (container) {
        container.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ============================================
// INTEGRACIÓN CON DATE WIDGET
// ============================================

function initDetailViewListeners() {
    console.log('🔗 Inicializando listeners para vista de detalle...');
    
    const checkInterval = setInterval(() => {
        const monthContainers = document.querySelectorAll('.month-news-list');
        
        if (monthContainers.length > 0) {
            clearInterval(checkInterval);
            attachDetailListeners();
            console.log('✅ Listeners de detalle inicializados');
        }
    }, 500);
    
    setTimeout(() => clearInterval(checkInterval), 10000);
}

function attachDetailListeners() {
    const newsLinks = document.querySelectorAll('.month-news-list a');
    
    newsLinks.forEach(link => {
        const newsLink = link.getAttribute('data-news-link');
        
        if (newsLink) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showNewsDetail(newsLink);
            });
        }
    });
    
    console.log(`✅ ${newsLinks.length} links conectados`);
}

document.addEventListener('dateArchiveRendered', function() {
    console.log('📢 Sidebar actualizado, re-adjuntando listeners...');
    setTimeout(() => {
        attachDetailListeners();
    }, 100);
});

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ News Detail View v4.0 cargado (tarjetas individuales para relacionadas)');
    
    // IMPORTANTE: No crear contenedor aquí, ya existe en el HTML
    // Solo verificar que existe
    const detailContainer = document.getElementById('news-detail-container');
    if (!detailContainer) {
        console.warn('⚠️ Contenedor de detalle no encontrado en HTML');
    }
    
    setTimeout(() => {
        initDetailViewListeners();
    }, 2000);
});

// ============================================
// API GLOBAL
// ============================================
window.NewsDetailView = {
    show: showNewsDetail,
    close: closeDetailView,
    current: () => currentDetailView
};

console.log('📰 News Detail View API v4.0 expuesta globalmente');