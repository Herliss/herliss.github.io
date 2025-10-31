/**
 * Integración del Widget de Fechas con el Sistema de Noticias
 * Este archivo debe cargarse DESPUÉS de news-integrated.js
 */

(function() {
    'use strict';
    
    // Guardar referencia a la función loadAllNews original
    const originalLoadAllNews = window.loadAllNews;
    
    if (typeof originalLoadAllNews === 'function') {
        // Override de loadAllNews para emitir evento
        window.loadAllNews = async function() {
            await originalLoadAllNews();
            
            // Emitir evento personalizado cuando las noticias están cargadas
            const event = new CustomEvent('newsLoaded', {
                detail: {
                    articles: window.newsData || [],
                    timestamp: new Date()
                }
            });
            document.dispatchEvent(event);
            
            console.log('📢 Evento newsLoaded emitido');
        };
        
        console.log('✅ Integración del widget de fechas activada');
    } else {
        console.warn('⚠️ Función loadAllNews no encontrada - el widget de fechas se actualizará manualmente');
    }
    
    // También observar cambios en window.newsData
    let lastNewsData = null;
    
    setInterval(() => {
        if (window.newsData && window.newsData !== lastNewsData) {
            lastNewsData = window.newsData;
            
            // Actualizar widget
            if (window.DateArchiveWidget && typeof window.DateArchiveWidget.update === 'function') {
                window.DateArchiveWidget.update();
            }
        }
    }, 1000);
    
})();