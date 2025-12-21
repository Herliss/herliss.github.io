/**
 * Artículos Date Widget - Clasificación por Mes en Sidebar
 * Widget de archivo mensual para artículos publicados
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 * Versión: 1.0
 */

'use strict';

// ============================================
// VARIABLES GLOBALES
// ============================================

let dateArchiveData = {};

// ============================================
// GENERAR WIDGET DE FECHAS
// ============================================

async function generateDateArchiveWidget() {
    const container = document.getElementById('date-archive-container');
    if (!container) return;
    
    // Esperar a que los artículos estén cargados
    await waitForArticles();
    
    if (!window.allArticles || window.allArticles.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No hay artículos disponibles</p>';
        return;
    }
    
    // Agrupar artículos por mes
    dateArchiveData = groupByMonth(window.allArticles);
    
    // Renderizar lista
    renderDateArchive(dateArchiveData);
}

// ============================================
// ESPERAR ARTÍCULOS
// ============================================

function waitForArticles() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (window.allArticles && window.allArticles.length > 0) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        
        // Timeout después de 10 segundos
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 10000);
    });
}

// ============================================
// AGRUPAR POR MES
// ============================================

function groupByMonth(articles) {
    const grouped = {};
    
    articles.forEach(article => {
        const date = new Date(article.publishedAt);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        if (!grouped[monthKey]) {
            grouped[monthKey] = {
                year: year,
                month: month,
                monthName: date.toLocaleDateString('es-ES', { month: 'long' }),
                count: 0,
                articles: []
            };
        }
        
        grouped[monthKey].count++;
        grouped[monthKey].articles.push(article);
    });
    
    return grouped;
}

// ============================================
// RENDERIZAR ARCHIVO DE FECHAS
// ============================================

function renderDateArchive(data) {
    const container = document.getElementById('date-archive-container');
    if (!container) return;
    
    // Ordenar por fecha descendente
    const sortedKeys = Object.keys(data).sort((a, b) => b.localeCompare(a));
    
    if (sortedKeys.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No hay artículos disponibles</p>';
        return;
    }
    
    let html = '<ul class="date-archive-list">';
    
    sortedKeys.forEach(key => {
        const monthData = data[key];
        const monthLabel = capitalize(monthData.monthName) + ' ' + monthData.year;
        
        html += `
            <li class="archive-month-item" data-month="${key}">
                <a href="#" onclick="filterByMonth('${key}'); return false;">
                    <span class="month-label">${monthLabel}</span>
                    <span class="month-count">${monthData.count}</span>
                </a>
            </li>
        `;
    });
    
    html += '</ul>';
    
    container.innerHTML = html;
}

// ============================================
// FILTRAR POR MES
// ============================================

function filterByMonth(monthKey) {
    if (!dateArchiveData[monthKey]) {
        console.error('❌ Mes no encontrado:', monthKey);
        return;
    }
    
    const monthData = dateArchiveData[monthKey];
    
    console.log(`📅 Filtrando por: ${monthData.monthName} ${monthData.year}`);
    
    // Actualizar artículos mostrados
    if (window.displayedArticles !== undefined && window.renderArticles) {
        window.displayedArticles = monthData.articles;
        window.renderArticles(monthData.articles);
    }
    
    // Actualizar UI
    updateActiveMonth(monthKey);
    
    // Scroll al contenedor de artículos
    const articlesContainer = document.getElementById('articles-container');
    if (articlesContainer) {
        articlesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// ACTUALIZAR MES ACTIVO
// ============================================

function updateActiveMonth(activeKey) {
    document.querySelectorAll('.archive-month-item').forEach(item => {
        const monthKey = item.getAttribute('data-month');
        
        if (monthKey === activeKey) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ============================================
// LIMPIAR FILTRO DE FECHA
// ============================================

function clearDateFilter() {
    console.log('🗑️ Limpiando filtro de fecha');
    
    // Restaurar todos los artículos
    if (window.allArticles && window.renderArticles) {
        window.displayedArticles = [...window.allArticles];
        window.renderArticles(window.displayedArticles);
    }
    
    // Limpiar selección activa
    document.querySelectorAll('.archive-month-item').forEach(item => {
        item.classList.remove('active');
    });
}

// ============================================
// UTILIDADES
// ============================================

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 Artículos Date Widget v1.0 cargado');
    
    // Generar widget después de un pequeño delay
    setTimeout(() => {
        generateDateArchiveWidget();
    }, 1000);
});

// Exponer funciones globalmente
window.filterByMonth = filterByMonth;
window.clearDateFilter = clearDateFilter;

console.log('✅ Artículos Date Widget module loaded');