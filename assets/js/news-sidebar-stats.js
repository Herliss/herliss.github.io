/**
 * Actualización automática de estadísticas del Sidebar
 * Actualiza "Top Productos Afectados" cuando las noticias se cargan
 * 
 * VERSIÓN CORREGIDA: Maneja metadata faltante y no depende de AdvancedFilters
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 */

'use strict';

// ============================================
// EXTRAER PRODUCTOS DE METADATA
// ============================================

/**
 * Extrae productos afectados directamente de los artículos
 * No depende de AdvancedFilters para mayor robustez
 */
function extractProductsFromArticles(articles) {
    const productCounts = {};
    
    if (!articles || !Array.isArray(articles)) {
        console.warn('⚠️ No hay artículos válidos para procesar');
        return [];
    }
    
    articles.forEach(article => {
        // Verificar que el artículo tiene metadata
        if (!article.metadata) {
            return; // Saltar este artículo
        }
        
        // Verificar que metadata.affectedProducts existe y es un array
        if (!article.metadata.affectedProducts || 
            !Array.isArray(article.metadata.affectedProducts)) {
            return; // Saltar este artículo
        }
        
        // Procesar productos
        article.metadata.affectedProducts.forEach(product => {
            if (product && typeof product === 'string') {
                productCounts[product] = (productCounts[product] || 0) + 1;
            }
        });
    });
    
    // Convertir a array y ordenar
    const topProducts = Object.entries(productCounts)
        .map(([product, count]) => ({ product, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10
    
    return topProducts;
}

// ============================================
// ACTUALIZAR TOP PRODUCTOS AFECTADOS
// ============================================

/**
 * Actualiza el widget de Top Productos en el sidebar
 */
function updateTopProductsWidget() {
    const topProductsList = document.getElementById('top-products');
    
    if (!topProductsList) {
        console.warn('⚠️ Elemento #top-products no encontrado');
        return;
    }
    
    // Verificar que tenemos noticias
    if (!window.newsData || !Array.isArray(window.newsData) || window.newsData.length === 0) {
        console.log('⏳ Esperando datos de noticias...');
        topProductsList.innerHTML = '<li style="color: #999; font-style: italic;">Cargando...</li>';
        return;
    }
    
    try {
        console.log(`📊 Procesando ${window.newsData.length} noticias para productos afectados...`);
        
        // Extraer productos directamente
        const topProducts = extractProductsFromArticles(window.newsData);
        
        // Verificar si hay productos
        if (!topProducts || topProducts.length === 0) {
            topProductsList.innerHTML = '<li style="color: #999; font-style: italic;">No se detectaron productos en las noticias actuales</li>';
            console.log('ℹ️ No se encontraron productos afectados en las noticias');
            return;
        }
        
        // Generar HTML para la lista
        const productsHTML = topProducts.map((item, index) => {
            // Asignar emoji según la posición
            let emoji = '';
            if (index === 0) emoji = '🥇';
            else if (index === 1) emoji = '🥈';
            else if (index === 2) emoji = '🥉';
            else emoji = `${index + 1}.`;
            
            // Determinar el color según la cantidad de noticias
            let colorClass = '';
            if (item.count >= 15) colorClass = 'style="color: #e74c3c; font-weight: bold;"'; // Rojo - Crítico
            else if (item.count >= 10) colorClass = 'style="color: #f39c12; font-weight: bold;"'; // Naranja - Alto
            else if (item.count >= 5) colorClass = 'style="color: #3498db; font-weight: 600;"'; // Azul - Medio
            else colorClass = 'style="color: #666;"'; // Gris - Bajo
            
            return `
                <li ${colorClass}>
                    ${emoji} <strong>${item.product}</strong> 
                    <span style="float: right; background: #f0f0f0; padding: 2px 8px; border-radius: 10px; font-size: 0.85em;">
                        ${item.count} ${item.count === 1 ? 'noticia' : 'noticias'}
                    </span>
                </li>
            `;
        }).join('');
        
        topProductsList.innerHTML = productsHTML;
        
        console.log(`✅ Top Productos actualizados: ${topProducts.length} productos encontrados`);
        
        if (topProducts.length > 0) {
            console.log('📊 Top 3:', topProducts.slice(0, 3).map(p => `${p.product} (${p.count})`).join(', '));
        }
        
    } catch (error) {
        console.error('❌ Error actualizando Top Productos:', error);
        topProductsList.innerHTML = '<li style="color: #e74c3c;">Error al cargar estadísticas</li>';
    }
}

// ============================================
// ACTUALIZAR OTRAS ESTADÍSTICAS (OPCIONAL)
// ============================================

/**
 * Actualiza todas las estadísticas del sidebar
 */
function updateAllSidebarStats() {
    updateTopProductsWidget();
    
    // Aquí puedes agregar más widgets si los creas en el futuro
    // Por ejemplo: updateTopThreatActors(), updateCVEStats(), etc.
}

// ============================================
// LISTENERS DE EVENTOS
// ============================================

/**
 * Escuchar cuando las noticias se cargan
 */
document.addEventListener('newsLoaded', function(event) {
    console.log('📢 Evento newsLoaded detectado, actualizando estadísticas del sidebar...');
    
    // Pequeño delay para asegurar que window.newsData está listo
    setTimeout(() => {
        updateAllSidebarStats();
    }, 100);
});

/**
 * Escuchar cuando se aplican filtros avanzados
 */
document.addEventListener('advancedFiltersApplied', function(event) {
    console.log('🔍 Filtros avanzados aplicados, recalculando estadísticas...');
    updateAllSidebarStats();
});

/**
 * Escuchar cuando se aplican filtros del sidebar
 */
document.addEventListener('sidebarFiltersApplied', function(event) {
    console.log('🔍 Filtros del sidebar aplicados, recalculando estadísticas...');
    updateAllSidebarStats();
});

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Inicializar cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sidebar Stats (FIXED) inicializado');
    
    // Intentar actualizar inmediatamente (por si las noticias ya están cargadas)
    setTimeout(() => {
        updateAllSidebarStats();
    }, 1000);
    
    // Polling cada 3 segundos durante el primer minuto (por si las noticias tardan)
    let attempts = 0;
    const maxAttempts = 20; // 20 intentos x 3 seg = 1 minuto
    
    const pollInterval = setInterval(() => {
        attempts++;
        
        if (window.newsData && Array.isArray(window.newsData) && window.newsData.length > 0) {
            console.log('✅ Datos detectados, actualizando sidebar');
            updateAllSidebarStats();
            clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
            console.warn('⚠️ Timeout: No se detectaron datos de noticias después de 1 minuto');
            clearInterval(pollInterval);
        } else {
            console.log(`⏳ Esperando datos... (intento ${attempts}/${maxAttempts})`);
        }
    }, 3000);
});

// ============================================
// EXPORTAR PARA USO GLOBAL
// ============================================
window.SidebarStats = {
    updateTopProducts: updateTopProductsWidget,
    updateAll: updateAllSidebarStats,
    extractProducts: extractProductsFromArticles
};

console.log('📊 Módulo Sidebar Stats (FIXED v2.0) cargado - Sin dependencia de AdvancedFilters');