/**
 * Filtrado de Noticias por Producto - VERSIÓN MINIMALISTA
 * Solo agrega funcionalidad de clic SIN modificar estilos existentes
 * 
 * Autor: Herliss Briceño
 * Fecha: Noviembre 2025
 */

'use strict';

// ============================================
// ESTADO GLOBAL
// ============================================
let currentProductFilter = null;

// ============================================
// FUNCIÓN PRINCIPAL: AGREGAR FILTRADO
// ============================================

/**
 * Agrega funcionalidad de clic a los productos existentes
 */
function enableProductFiltering() {
    // Esperar a que el widget se haya renderizado
    const checkInterval = setInterval(() => {
        const topProductsList = document.getElementById('top-products');
        
        if (topProductsList && topProductsList.children.length > 0) {
            clearInterval(checkInterval);
            attachClickListeners();
        }
    }, 500);
    
    // Timeout después de 30 segundos
    setTimeout(() => clearInterval(checkInterval), 30000);
}

/**
 * Agregar event listeners a cada producto
 */
function attachClickListeners() {
    const topProductsList = document.getElementById('top-products');
    if (!topProductsList) return;
    
    const productItems = topProductsList.querySelectorAll('li');
    
    productItems.forEach(item => {
        // Extraer el nombre del producto del HTML existente
        const productName = extractProductName(item);
        if (!productName) return;
        
        // Hacer el item clickeable
        item.style.cursor = 'pointer';
        item.setAttribute('data-product', productName);
        
        // Agregar event listener
        item.addEventListener('click', function() {
            const product = this.getAttribute('data-product');
            
            // Toggle: si ya está filtrado, limpiar
            if (currentProductFilter === product) {
                clearProductFilter();
            } else {
                filterNewsByProduct(product);
            }
        });
    });
    
    console.log('✅ Filtrado por productos habilitado');
}

/**
 * Extrae el nombre del producto del HTML existente
 */
function extractProductName(listItem) {
    const text = listItem.textContent.trim();
    
    // El formato actual es: "🥇 Linux 3 noticias"
    // Necesitamos extraer "Linux"
    
    // Remover emojis y números
    let productName = text
        .replace(/[🥇🥈🥉]/g, '') // Remover medallas
        .replace(/^\d+\.\s*/, '') // Remover "4. " o "5. "
        .replace(/\d+\s*(noticia|noticias)\s*$/g, '') // Remover contador
        .trim();
    
    return productName || null;
}

// ============================================
// FILTRADO DE NOTICIAS
// ============================================

/**
 * Filtra las noticias por producto
 */
function filterNewsByProduct(productName) {
    if (!window.newsData || !window.unfilteredNewsData) {
        console.warn('⚠️ Datos de noticias no disponibles');
        return;
    }
    
    console.log(`🔍 Filtrando por: ${productName}`);
    
    currentProductFilter = productName;
    
    // Filtrar noticias
    const filteredNews = window.unfilteredNewsData.filter(article => {
        if (article.metadata && article.metadata.affectedProducts) {
            return article.metadata.affectedProducts.includes(productName);
        }
        return false;
    });
    
    console.log(`📰 ${filteredNews.length} noticias encontradas`);
    
    // Renderizar noticias filtradas
    if (typeof window.renderNews === 'function') {
        window.renderNews(filteredNews);
    }
    
    // Mostrar indicador simple
    showFilterBanner(productName, filteredNews.length);
}

/**
 * Limpia el filtro
 */
function clearProductFilter() {
    console.log('🔄 Limpiando filtro');
    
    currentProductFilter = null;
    
    // Restaurar todas las noticias
    if (window.unfilteredNewsData && typeof window.renderNews === 'function') {
        window.renderNews(window.unfilteredNewsData);
    }
    
    // Ocultar indicador
    removeFilterBanner();
}

// ============================================
// INDICADOR VISUAL SIMPLE
// ============================================

/**
 * Muestra un banner simple arriba de las noticias
 */
function showFilterBanner(productName, newsCount) {
    // Remover banner anterior si existe
    removeFilterBanner();
    
    // Crear banner simple
    const banner = document.createElement('div');
    banner.id = 'product-filter-banner';
    banner.innerHTML = `
        <div style="
            background: #3498db;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.95rem;
        ">
            <span>
                <strong>🔍 Filtrado por: ${productName}</strong>
                <span style="opacity: 0.9; margin-left: 1rem;">
                    ${newsCount} ${newsCount === 1 ? 'noticia' : 'noticias'}
                </span>
            </span>
            <button onclick="window.ProductFilter.clear()" style="
                background: white;
                color: #3498db;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.875rem;
            ">
                ❌ Limpiar
            </button>
        </div>
    `;
    
    // Insertar antes del contenedor de noticias
    const newsContainer = document.getElementById('news-container');
    if (newsContainer && newsContainer.parentNode) {
        newsContainer.parentNode.insertBefore(banner, newsContainer);
    }
}

/**
 * Remueve el banner de filtro
 */
function removeFilterBanner() {
    const banner = document.getElementById('product-filter-banner');
    if (banner) {
        banner.remove();
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Módulo de Filtrado por Productos cargado');
    
    // Esperar a que las noticias y el widget se carguen
    setTimeout(() => {
        enableProductFiltering();
    }, 2000);
});

// Escuchar cuando se actualiza el widget
document.addEventListener('newsLoaded', function() {
    setTimeout(() => {
        enableProductFiltering();
    }, 1000);
});

// ============================================
// API GLOBAL
// ============================================
window.ProductFilter = {
    filter: filterNewsByProduct,
    clear: clearProductFilter
};

console.log('📊 Filtrado por Productos - Versión Minimalista');