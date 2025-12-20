/**
 * News Detail View - Mostrar detalle de noticia en panel principal
 * VERSIÓN 2.1 - Búsqueda por LINK + Estilos unificados
 * 
 * CARACTERÍSTICAS:
 * ✅ Búsqueda por link en lugar de ID
 * ✅ Estilo unificado "Leer más →" (igual que grid principal)
 * ✅ Fallback a memoria si Firebase falla
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
        
        // NUEVA ESTRATEGIA: Buscar por link en lugar de por ID
        const snapshot = await window.db.collection('news')
            .where('link', '==', newsLink)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            console.warn('⚠️ Noticia no encontrada por link:', newsLink);
            
            // FALLBACK: Buscar en el array en memoria
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
        
        // Scroll suave al panel principal
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

/**
 * Busca la noticia en los datos en memoria
 */
function findInMemory(newsLink) {
    // Buscar en unfilteredNewsData
    if (window.unfilteredNewsData && Array.isArray(window.unfilteredNewsData)) {
        const found = window.unfilteredNewsData.find(article => article.link === newsLink);
        if (found) return found;
    }
    
    // Buscar en newsData
    if (window.newsData && Array.isArray(window.newsData)) {
        const found = window.newsData.find(article => article.link === newsLink);
        if (found) return found;
    }
    
    // Buscar en DateArchiveWidget
    if (window.DateArchiveWidget && window.DateArchiveWidget.getCurrentFiltered) {
        const filtered = window.DateArchiveWidget.getCurrentFiltered();
        if (filtered && Array.isArray(filtered)) {
            const found = filtered.find(article => article.link === newsLink);
            if (found) return found;
        }
    }
    
    return null;
}

// ============================================
// RENDERIZADO
// ============================================

/**
 * Renderiza el detalle completo de la noticia
 */
function renderNewsDetail(newsData) {
    const container = document.getElementById('news-detail-container');
    if (!container) {
        console.error('❌ Contenedor #news-detail-container no encontrado');
        return;
    }
    
    // Extraer datos con fallbacks
    const titleEs = newsData.titleEs || newsData.title || 'Sin título';
    const summaryEs = newsData.summaryEs || newsData.summary || newsData.description || 'Sin resumen disponible';
    const link = newsData.link || '#';
    const sourceName = newsData.sourceName || 'Fuente desconocida';
    
    // Manejar fecha
    let pubDate;
    if (newsData.pubDate) {
        if (newsData.pubDate.toDate) {
            pubDate = newsData.pubDate.toDate(); // Firestore Timestamp
        } else if (typeof newsData.pubDate === 'string') {
            pubDate = new Date(newsData.pubDate); // ISO string
        } else {
            pubDate = new Date(newsData.pubDate); // Intentar convertir
        }
    } else {
        pubDate = new Date();
    }
    
    // Formatear fecha
    const formattedDate = pubDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // HTML del detalle
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
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="read-more-btn">
                    Leer más →
                </a>
            </div>
        </article>
    `;
    
    // Insertar y mostrar
    container.innerHTML = detailHTML;
    container.classList.add('active');
    
    // Ocultar grid de noticias
    const newsGrid = document.getElementById('news-container');
    if (newsGrid) {
        newsGrid.style.display = 'none';
    }
    
    currentDetailView = newsData;
}

/**
 * Formatea el resumen en párrafos
 */
function formatSummary(summary) {
    if (!summary) return '<p>Sin resumen disponible</p>';
    
    // Separar por saltos de línea dobles o puntos seguidos de mayúscula
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

/**
 * Muestra estado de carga
 */
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

/**
 * Muestra mensaje de error
 */
function showError(message) {
    const container = document.getElementById('news-detail-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="detail-error">
            <h3>⚠️ ${message}</h3>
            <p>La noticia podría haber sido eliminada o no estar disponible en la base de datos.</p>
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

/**
 * Cierra la vista de detalle y vuelve al grid
 */
function closeDetailView() {
    const container = document.getElementById('news-detail-container');
    const newsGrid = document.getElementById('news-container');
    
    if (container) {
        container.classList.remove('active');
        setTimeout(() => {
            container.innerHTML = '';
        }, 300);
    }
    
    if (newsGrid) {
        newsGrid.style.display = 'grid';
    }
    
    currentDetailView = null;
    console.log('✅ Vista de detalle cerrada');
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Scroll suave al contenedor de detalle
 */
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

/**
 * Inicializa event listeners en el sidebar
 */
function initDetailViewListeners() {
    console.log('🔗 Inicializando listeners para vista de detalle...');
    
    // Esperar a que el sidebar se renderice
    const checkInterval = setInterval(() => {
        const monthContainers = document.querySelectorAll('.month-news-list');
        
        if (monthContainers.length > 0) {
            clearInterval(checkInterval);
            attachDetailListeners();
            console.log('✅ Listeners de detalle inicializados');
        }
    }, 500);
    
    // Timeout después de 10 segundos
    setTimeout(() => clearInterval(checkInterval), 10000);
}

/**
 * Agrega listeners a cada link de noticia en el sidebar
 */
function attachDetailListeners() {
    // Buscar todos los links de noticias en el sidebar
    const newsLinks = document.querySelectorAll('.month-news-list a');
    
    newsLinks.forEach(link => {
        // Extraer el link original del atributo data
        const newsLink = link.getAttribute('data-news-link');
        
        if (newsLink) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showNewsDetail(newsLink);
            });
        }
    });
    
    console.log(`✅ ${newsLinks.length} links de noticias conectados`);
}

/**
 * Re-adjuntar listeners cuando el sidebar se actualiza
 */
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
    console.log('✅ News Detail View v2.1 cargado (búsqueda por link + estilos unificados)');
    
    // Crear contenedor si no existe
    const newsContainer = document.getElementById('news-container');
    if (newsContainer && !document.getElementById('news-detail-container')) {
        const detailContainer = document.createElement('div');
        detailContainer.id = 'news-detail-container';
        detailContainer.className = 'news-detail-container';
        newsContainer.parentNode.insertBefore(detailContainer, newsContainer);
    }
    
    // Inicializar después de un delay
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

console.log('📰 News Detail View API v2.1 expuesta globalmente');