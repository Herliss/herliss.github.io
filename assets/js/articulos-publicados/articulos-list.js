/**
 * Artículos List - Sistema de Carga y Renderizado desde Firestore
 * Carga artículos publicados desde collection "articles"
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 * Versión: 1.2 - IDs corregidos para articulos-list-container
 */

'use strict';

// ============================================
// VARIABLES GLOBALES
// ============================================

let allArticles = [];
let displayedArticles = [];
let selectedCategory = null;

// ============================================
// CARGAR ARTÍCULOS DESDE FIRESTORE
// ============================================

async function loadArticlesFromFirestore() {
    if (!window.db) {
        console.error('❌ Firestore no disponible');
        showError();
        return;
    }
    
    showLoading();
    
    try {
        console.log('📖 Cargando artículos desde Firestore...');
        
        const snapshot = await window.db.collection('articles')
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            console.warn('⚠️ No hay artículos publicados');
            showNoResults();
            return;
        }
        
        allArticles = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            allArticles.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✅ ${allArticles.length} artículos cargados`);
        
        displayedArticles = [...allArticles];
        
        renderArticles(displayedArticles);
        updateStats();
        hideLoading();
        
        // Emitir evento cuando artículos están listos
        window.dispatchEvent(new CustomEvent('articlesLoaded', { 
            detail: { articles: allArticles } 
        }));
        console.log('📢 Evento articlesLoaded emitido');
        
    } catch (error) {
        console.error('❌ Error cargando artículos:', error);
        showError();
    }
}

// ============================================
// RENDERIZAR ARTÍCULOS
// ============================================

function renderArticles(articles) {
    const container = document.getElementById('articles-list-container');
    if (!container) {
        console.error('❌ Contenedor articles-list-container no encontrado');
        return;
    }
    
    if (articles.length === 0) {
        showNoResults();
        return;
    }
    
    // Agrupar por fecha
    const groupedByDate = groupArticlesByMonth(articles);
    
    let html = '';
    
    Object.keys(groupedByDate).forEach(monthKey => {
        const monthArticles = groupedByDate[monthKey];
        const firstArticle = monthArticles[0];
        const publishedDate = firstArticle.publishedAt.toDate ? firstArticle.publishedAt.toDate() : new Date(firstArticle.publishedAt);
        
        const monthName = publishedDate.toLocaleDateString('es-ES', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        html += `
            <div class="news-date-group">
                <div class="date-group-header">
                    <span class="date-icon">📅</span>
                    <span>${capitalize(monthName)}</span>
                    <span class="date-count">(${monthArticles.length} artículo${monthArticles.length > 1 ? 's' : ''})</span>
                </div>
                <div class="news-group-container">
                    ${monthArticles.map(article => createArticleCard(article)).join('')}
                </div>
            </div>
        `;
    });
    
    container.className = 'articles-list-loaded';
    container.innerHTML = html;
}

// ============================================
// CREAR TARJETA DE ARTÍCULO
// ============================================

function createArticleCard(article) {
    const publishedDate = article.publishedAt.toDate ? article.publishedAt.toDate() : new Date(article.publishedAt);
    
    // Formatear fecha sobria
    const dayName = publishedDate.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = publishedDate.getDate();
    const month = publishedDate.toLocaleDateString('es-ES', { month: 'long' });
    const year = publishedDate.getFullYear();
    
    const formattedDate = `${capitalize(dayName)}, ${day} de ${capitalize(month)} de ${year}`;
    
    // Generar badges de impacto en negocio
    const impactBadges = generateImpactBadges(article.businessImpact);
    
    // Generar badge de categoría
    const categoryBadge = article.category ? 
        `<span class="meta-badge product-badge">${article.category}</span>` : '';
    
    return `
        <article class="news-card">
            <div class="news-card-header">
                <div class="header-left">
                    <span class="news-source-text">${article.author || 'Herliss Briceño'}</span>
                    <span class="news-date">${formattedDate}</span>
                </div>
            </div>
            
            ${impactBadges || categoryBadge ? `
                <div class="metadata-badges">
                    ${categoryBadge}
                    ${impactBadges}
                </div>
            ` : ''}
            
            <div class="news-card-body">
                <h3>
                    <a href="/articulo.html?slug=${article.slug}" onclick="loadArticleDetail('${article.slug}'); return false;">
                        ${article.title}
                    </a>
                </h3>
                <p>${article.excerpt}</p>
            </div>
            
            <div class="news-card-footer">
                <a href="/articulo.html?slug=${article.slug}" 
                   onclick="loadArticleDetail('${article.slug}'); return false;" 
                   class="read-more-btn">
                    Leer análisis completo →
                </a>
            </div>
        </article>
    `;
}

// ============================================
// GENERAR BADGES DE IMPACTO
// ============================================

function generateImpactBadges(businessImpact) {
    if (!businessImpact) return '';
    
    const badges = [];
    
    if (businessImpact.financial) badges.push('<span class="meta-badge priority-high">💰 Financiero</span>');
    if (businessImpact.operational) badges.push('<span class="meta-badge priority-medium">⚙️ Operativo</span>');
    if (businessImpact.reputational) badges.push('<span class="meta-badge threat-actor">🎯 Reputacional</span>');
    if (businessImpact.regulatory) badges.push('<span class="meta-badge regulatory">⚖️ Regulatorio</span>');
    
    return badges.join('');
}

// ============================================
// AGRUPAR POR MES
// ============================================

function groupArticlesByMonth(articles) {
    const grouped = {};
    
    articles.forEach(article => {
        const date = article.publishedAt.toDate ? article.publishedAt.toDate() : new Date(article.publishedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!grouped[monthKey]) {
            grouped[monthKey] = [];
        }
        
        grouped[monthKey].push(article);
    });
    
    return grouped;
}

// ============================================
// FILTRAR POR CATEGORÍA
// ============================================

function filterByCategory(category) {
    if (selectedCategory === category) {
        // Limpiar filtro
        selectedCategory = null;
        displayedArticles = [...allArticles];
    } else {
        selectedCategory = category;
        displayedArticles = allArticles.filter(article => article.category === category);
    }
    
    renderArticles(displayedArticles);
    updateCategoryButtons();
}

function updateCategoryButtons() {
    document.querySelectorAll('[data-category]').forEach(btn => {
        const category = btn.getAttribute('data-category');
        if (category === selectedCategory) {
            btn.style.background = 'var(--primary-color)';
            btn.style.color = 'white';
        } else {
            btn.style.background = '';
            btn.style.color = '';
        }
    });
}

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================

function updateStats() {
    // Widget de estadísticas eliminado - función deshabilitada
    // Los elementos #total-articles, #total-categories, #total-views ya no existen
}

// ============================================
// CARGAR DETALLE DE ARTÍCULO (VISTA INTEGRADA)
// ============================================

function loadArticleDetail(slug) {
    const article = allArticles.find(a => a.slug === slug);
    if (!article) {
        console.error('❌ Artículo no encontrado:', slug);
        return;
    }
    
    console.log('📖 Mostrando detalle:', article.title);
    
    // Llamar al sistema de vista de detalle integrada
    if (window.showArticleDetailIntegrated) {
        window.showArticleDetailIntegrated(article);
    } else {
        console.error('❌ Sistema de vista de detalle no disponible');
    }
}

// ============================================
// ESTADOS DE UI - CORREGIDOS PARA articles-list-container
// ============================================

function showLoading() {
    const container = document.getElementById('articles-list-container');
    if (container) {
        container.className = 'articles-list-loading';
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando artículos...</p>
            </div>
        `;
    }
}

function hideLoading() {
    const container = document.getElementById('articles-list-container');
    if (container) {
        container.className = 'articles-list-loaded';
    }
}

function showError() {
    const container = document.getElementById('articles-list-container');
    if (container) {
        container.className = 'articles-list-error';
        container.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Error al cargar artículos</h3>
                <p>Por favor, recarga la página o intenta más tarde.</p>
            </div>
        `;
    }
}

function showNoResults() {
    const container = document.getElementById('articles-list-container');
    if (container) {
        container.className = 'articles-list-loaded';
        container.innerHTML = `
            <div class="no-results">
                <h3>🔍 No hay artículos publicados</h3>
                <p>Vuelve pronto para leer nuevos análisis de ciberseguridad.</p>
            </div>
        `;
    }
}

// ============================================
// UTILIDADES
// ============================================

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 Artículos List v1.2 cargado');
    
    // Cargar artículos
    setTimeout(() => {
        loadArticlesFromFirestore();
    }, 500);
    
    // Event listener para filtros de categoría
    document.querySelectorAll('[data-category]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category');
            filterByCategory(category);
        });
    });
});

// Exponer funciones globalmente
window.loadArticleDetail = loadArticleDetail;
window.allArticles = allArticles;

console.log('✅ Artículos List module loaded');