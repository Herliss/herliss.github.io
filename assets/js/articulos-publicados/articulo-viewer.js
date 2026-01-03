/**
 * ============================================
 * ARTICULO VIEWER - Sistema de Vista de Detalle Integrada
 * ============================================
 * 
 * Renderiza artículos completos dentro de la misma página
 * Similar al sistema de noticias (news-detail-view.js)
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 * Versión: 2.1 - Con campo Source
 */

'use strict';

// ============================================
// VARIABLES GLOBALES
// ============================================

let currentArticle = null;

// ============================================
// MOSTRAR DETALLE DE ARTÍCULO (FUNCIÓN PÚBLICA)
// ============================================

function showArticleDetailIntegrated(article) {
    if (!article) {
        console.error('❌ Artículo inválido');
        return;
    }
    
    currentArticle = article;
    
    console.log('📖 Renderizando detalle:', article.title);
    
    const container = document.getElementById('article-detail-container');
    if (!container) {
        console.error('❌ Contenedor de detalle no encontrado');
        return;
    }
    
    // Renderizar contenido
    container.innerHTML = generateArticleHTML(article);
    
    // Mostrar contenedor con animación
    container.classList.add('active');
    
    // Reorganizar grid para vista de detalle
    const mainContainer = document.querySelector('.news-content .container');
    if (mainContainer) {
        mainContainer.classList.add('detail-view-active');
    }
    
    // Scroll al detalle
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Incrementar vistas en Firestore
    incrementArticleViews(article.id);
}

// ============================================
// GENERAR HTML DEL ARTÍCULO
// ============================================

function generateArticleHTML(article) {
    // Formatear fecha - Conversión correcta de Firestore Timestamp
    const publishedDate = article.publishedAt.toDate ? 
        article.publishedAt.toDate() : 
        new Date(article.publishedAt);
    const formattedDate = publishedDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    // Generar badges de impacto
    const impactBadges = generateImpactBadgesHTML(article.businessImpact);
    
    // Generar perfil de amenaza
    const threatProfile = generateThreatProfileHTML(article.threatProfile);
    
    // Generar fuente original
    const sourceHTML = generateSourceHTML(article.Source);
    
    // Generar controles recomendados
    const controlsHTML = generateControlsHTML(article.recommendedControls);
    
    // Generar referencias
    const referencesHTML = generateReferencesHTML(article.references);
    
    return `
        <!-- Header con botón cerrar -->
        <div class="news-detail-header">
            <button class="close-detail-btn" onclick="closeArticleDetail()">
                ✕ Cerrar
            </button>
        </div>
        
        <!-- Contenido del artículo -->
        <article class="news-detail-article">
            
            <!-- Metadata -->
            <div class="detail-meta">
                <span class="detail-source-text">${article.author || 'Herliss Briceño'}</span>
                <span class="detail-date">${formattedDate}</span>
                ${article.readingTime ? `<span class="detail-date">⏱️ ${article.readingTime} min lectura</span>` : ''}
            </div>
            
            <!-- Título -->
            <h1 class="detail-title">${sanitizeHTML(article.title)}</h1>
            
            <!-- Categoría y Subcategorías -->
            ${article.category || (article.subcategories && article.subcategories.length > 0) ? `
                <div class="metadata-badges">
                    ${article.category ? `<span class="meta-badge product-badge">${article.category}</span>` : ''}
                    ${article.subcategories ? article.subcategories.map(sub => 
                        `<span class="meta-badge threat-actor">${sub}</span>`
                    ).join('') : ''}
                </div>
            ` : ''}
            
            <!-- Impacto en Negocio -->
            ${impactBadges ? `
                <div class="alert alert-info" style="margin-top: 1.5rem;">
                    <strong>💼 Impacto en Negocio:</strong> ${impactBadges}
                    ${article.businessImpact?.description ? `<br><small>${article.businessImpact.description}</small>` : ''}
                </div>
            ` : ''}
            
            <!-- Perfil de Amenaza -->
            ${threatProfile}
            
            <!-- Resumen -->
            <div class="detail-summary">
                ${article.excerpt ? `<p>${sanitizeHTML(article.excerpt)}</p>` : ''}
            </div>
            
            <!-- Contenido Principal -->
            <div class="detail-summary">
                ${article.content}
            </div>
            
            <!-- Fuente Original -->
            ${sourceHTML}
            
            <!-- Controles Recomendados -->
            ${controlsHTML}
            
            <!-- Referencias -->
            ${referencesHTML}
            
            <!-- Acciones -->
            <div class="detail-actions">
                <button class="read-more-btn" onclick="closeArticleDetail()">
                    ← Volver a artículos
                </button>
            </div>
        </article>
    `;
}

// ============================================
// GENERAR BADGES DE IMPACTO
// ============================================

function generateImpactBadgesHTML(businessImpact) {
    if (!businessImpact) return '';
    
    const impacts = [];
    if (businessImpact.financial) impacts.push('💰 Financiero');
    if (businessImpact.operational) impacts.push('⚙️ Operativo');
    if (businessImpact.reputational) impacts.push('🎯 Reputacional');
    if (businessImpact.regulatory) impacts.push('⚖️ Regulatorio');
    
    return impacts.join(' | ');
}

// ============================================
// GENERAR PERFIL DE AMENAZA
// ============================================

function generateThreatProfileHTML(threatProfile) {
    if (!threatProfile) return '';
    
    const badges = [];
    
    if (threatProfile.threatType) {
        badges.push(`<strong>Tipo:</strong> ${threatProfile.threatType}`);
    }
    
    if (threatProfile.malwareFamily) {
        badges.push(`<strong>Familia:</strong> ${threatProfile.malwareFamily}`);
    }
    
    if (threatProfile.severity) {
        const severityIcons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };
        const icon = severityIcons[threatProfile.severity] || '⚪';
        badges.push(`<strong>Severidad:</strong> ${icon} ${threatProfile.severity.toUpperCase()}`);
    }
    
    if (threatProfile.targetRegions && threatProfile.targetRegions.length > 0) {
        badges.push(`<strong>Regiones:</strong> ${threatProfile.targetRegions.join(', ')}`);
    }
    
    if (threatProfile.targetSectors && threatProfile.targetSectors.length > 0) {
        badges.push(`<strong>Sectores:</strong> ${threatProfile.targetSectors.join(', ')}`);
    }
    
    if (badges.length === 0) return '';
    
    return `
        <div class="alert alert-warning" style="margin-top: 1.5rem;">
            <strong>⚠️ Perfil de Amenaza:</strong><br>
            ${badges.join('<br>')}
        </div>
    `;
}

// ============================================
// GENERAR FUENTE ORIGINAL
// ============================================

function generateSourceHTML(source) {
    if (!source) return '';
    
    // Extraer dominio para mostrar nombre legible
    let displayName = source;
    try {
        const url = new URL(source);
        displayName = url.hostname.replace('www.', '');
    } catch (e) {
        // Si no es una URL válida, usar el texto tal cual
    }
    
    return `
        <div class="alert alert-info" style="margin-top: 2rem; border-left: 4px solid #3498db;">
            <strong>📌 Fuente Original del Análisis</strong><br>
            <a href="${source}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                ${displayName}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
            </a>
        </div>
    `;
}

// ============================================
// GENERAR CONTROLES RECOMENDADOS
// ============================================

function generateControlsHTML(controls) {
    if (!controls) return '';
    
    let html = '<div class="cta-box" style="margin-top: 2rem;">';
    html += '<h3>🛡️ Controles Recomendados</h3>';
    
    if (controls.technical && controls.technical.length > 0) {
        html += '<h4 style="color: white; margin-top: 1.5rem; margin-bottom: 0.75rem;">Controles Técnicos</h4>';
        html += '<ul style="text-align: left; margin: 0 auto; max-width: 600px;">';
        controls.technical.forEach(control => {
            html += `<li style="margin-bottom: 0.5rem;">${control}</li>`;
        });
        html += '</ul>';
    }
    
    if (controls.administrative && controls.administrative.length > 0) {
        html += '<h4 style="color: white; margin-top: 1.5rem; margin-bottom: 0.75rem;">Controles Administrativos</h4>';
        html += '<ul style="text-align: left; margin: 0 auto; max-width: 600px;">';
        controls.administrative.forEach(control => {
            html += `<li style="margin-bottom: 0.5rem;">${control}</li>`;
        });
        html += '</ul>';
    }
    
    html += '</div>';
    return html;
}

// ============================================
// GENERAR REFERENCIAS
// ============================================

function generateReferencesHTML(references) {
    if (!references || references.length === 0) return '';
    
    let html = '<div class="alert alert-info" style="margin-top: 2rem;">';
    html += '<h4>📚 Referencias y Fuentes</h4><ul>';
    
    references.forEach(ref => {
        html += `<li><a href="${ref.url}" target="_blank" rel="noopener noreferrer">${ref.title}</a>`;
        if (ref.sourceType) {
            html += ` <small>(${ref.sourceType})</small>`;
        }
        html += '</li>';
    });
    
    html += '</ul></div>';
    return html;
}

// ============================================
// CERRAR VISTA DE DETALLE
// ============================================

function closeArticleDetail() {
    console.log('✕ Cerrando vista de detalle');
    
    const container = document.getElementById('article-detail-container');
    if (container) {
        container.classList.remove('active');
        
        // Limpiar contenido después de animación
        setTimeout(() => {
            container.innerHTML = '';
        }, 300);
    }
    
    // Restaurar grid normal
    const mainContainer = document.querySelector('.news-content .container');
    if (mainContainer) {
        mainContainer.classList.remove('detail-view-active');
    }
    
    // Scroll al grid de artículos
    const articlesContainer = document.getElementById('articles-container');
    if (articlesContainer) {
        articlesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    currentArticle = null;
}

// ============================================
// INCREMENTAR VISTAS EN FIRESTORE
// ============================================

async function incrementArticleViews(articleId) {
    if (!window.db || !articleId) return;
    
    try {
        await window.db.collection('articles').doc(articleId).update({
            views: firebase.firestore.FieldValue.increment(1)
        });
        console.log('✅ Vista registrada para artículo:', articleId);
    } catch (error) {
        console.warn('⚠️ No se pudo incrementar vistas:', error);
    }
}

// ============================================
// SANITIZACIÓN DE HTML
// ============================================

function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================

window.showArticleDetailIntegrated = showArticleDetailIntegrated;
window.closeArticleDetail = closeArticleDetail;

// ============================================
// LOG DE INICIALIZACIÓN
// ============================================

console.log('✅ Articulo Viewer v2.1 (Con Source) loaded');