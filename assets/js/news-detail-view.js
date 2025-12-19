/**
 * News Detail View - Mostrar detalle de noticia en panel principal
 * Al hacer clic en sidebar "Entradas Mensuales"
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
 * Muestra el detalle de una noticia en el panel principal
 * @param {string} newsId - ID del documento en Firebase
 */
async function showNewsDetail(newsId) {
    console.log(`📰 Mostrando detalle de noticia: ${newsId}`);
    
    // Verificar Firebase
    if (!window.db) {
        console.error('❌ Firebase no disponible');
        showError('Error de conexión con la base de datos');
        return;
    }
    
    try {
        // Mostrar loading
        showDetailLoading();
        
        // Obtener documento de Firebase
        const doc = await window.db.collection('news').doc(newsId).get();
        
        if (!doc.exists) {
            console.warn('⚠️ Noticia no encontrada:', newsId);
            showError('Noticia no encontrada');
            return;
        }
        
        const newsData = doc.data();
        
        // Renderizar detalle
        renderNewsDetail(newsData);
        
        // Scroll suave al panel principal
        scrollToDetailView();
        
        console.log('✅ Detalle mostrado exitosamente');
        
    } catch (error) {
        console.error('❌ Error obteniendo noticia:', error);
        showError('Error al cargar la noticia');
    }
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
    
    // Extraer datos
    const titleEs = newsData.titleEs || newsData.title || 'Sin título';
    const summaryEs = newsData.summaryEs || newsData.summary || newsData.description || 'Sin resumen disponible';
    const link = newsData.link || '#';
    const sourceName = newsData.sourceName || 'Fuente desconocida';
    const pubDate = newsData.pubDate ? newsData.pubDate.toDate() : new Date();
    
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
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="btn-read-original">
                    🔗 Leer artículo original
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
    // Separar por saltos de línea dobles o puntos seguidos
    const paragraphs = summary.split(/\n\n+|\. (?=[A-ZÁ-Ú])/);
    
    return paragraphs
        .map(p => `<p>${p.trim()}${p.endsWith('.') ? '' : '.'}</p>`)
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
        // Extraer ID del documento del atributo data
        const newsId = link.getAttribute('data-news-id');
        
        if (newsId) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showNewsDetail(newsId);
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
    console.log('✅ News Detail View cargado');
    
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

console.log('📰 News Detail View API expuesta globalmente');
