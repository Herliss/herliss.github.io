/**
 * Herliss Briceño - Blog de Ciberseguridad
 * JavaScript Principal con Enfoque en Seguridad
 * 
 * Prácticas de seguridad implementadas:
 * - Sanitización de entradas
 * - Prevención de XSS
 * - Validación estricta de datos
 * - Gestión segura del DOM
 */

'use strict';

// ============================================
// 1. MOBILE MENU TOGGLE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            const isExpanded = navMenu.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', isExpanded);
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Cerrar menú al hacer clic en un enlace
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }
});

// ============================================
// 2. SCROLL SUAVE PARA ANCLAS
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ============================================
// 3. HEADER SCROLL EFFECT
// ============================================
let lastScrollTop = 0;
const header = document.querySelector('.main-header');

window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scroll hacia abajo
        header.style.transform = 'translateY(-100%)';
    } else {
        // Scroll hacia arriba
        header.style.transform = 'translateY(0)';
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}, { passive: true });

// ============================================
// 4. SANITIZACIÓN DE STRINGS (Prevención XSS)
// ============================================
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// ============================================
// 5. VALIDACIÓN DE EMAIL (para formularios futuros)
// ============================================
function isValidEmail(email) {
    // Regex robusto para emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

// ============================================
// 6. PROTECCIÓN CONTRA CLICKJACKING
// ============================================
if (window.self !== window.top) {
    // Si la página está en un iframe, redirigir al top
    window.top.location = window.self.location;
}

// ============================================
// 7. LAZY LOADING PARA IMÁGENES
// ============================================
if ('loading' in HTMLImageElement.prototype) {
    // El navegador soporta lazy loading nativo
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src || img.src;
    });
} else {
    // Fallback para navegadores antiguos
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
    script.integrity = 'sha512-q583ppKrCRc7N5O0n2nzUiJ+suUv7Et1JGels4bXOaMFQcamPk9HjdUknZuuFjBNs7tsMuadge5k9RzdmO+1GQ==';
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
}

// ============================================
// 8. DETECCIÓN DE MODO OSCURO DEL SISTEMA
// ============================================
function detectDarkMode() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
    }
}

// Escuchar cambios en el modo oscuro
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (e.matches) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });
}

detectDarkMode();

// ============================================
// 9. COPY CODE BUTTON (para bloques de código)
// ============================================
function addCopyButtons() {
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(codeBlock => {
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.textContent = 'Copiar';
        button.setAttribute('aria-label', 'Copiar código');
        
        button.addEventListener('click', function() {
            const code = codeBlock.textContent;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(() => {
                    button.textContent = '✓ Copiado';
                    button.classList.add('copied');
                    
                    setTimeout(() => {
                        button.textContent = 'Copiar';
                        button.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Error al copiar:', err);
                    button.textContent = '✗ Error';
                });
            } else {
                // Fallback para navegadores antiguos
                const textarea = document.createElement('textarea');
                textarea.value = code;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                
                try {
                    document.execCommand('copy');
                    button.textContent = '✓ Copiado';
                } catch (err) {
                    button.textContent = '✗ Error';
                }
                
                document.body.removeChild(textarea);
            }
        });
        
        const pre = codeBlock.parentElement;
        pre.style.position = 'relative';
        pre.insertBefore(button, codeBlock);
    });
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCopyButtons);
} else {
    addCopyButtons();
}

// ============================================
// 10. ANALYTICS BÁSICO (sin cookies - privacy-friendly)
// ============================================
function trackPageView() {
    // Implementación básica de analytics que respeta privacidad
    // Solo registra páginas vistas sin identificar usuarios
    const pageData = {
        url: window.location.pathname,
        title: document.title,
        timestamp: new Date().toISOString(),
        referrer: document.referrer || 'direct'
    };
    
    // Aquí podrías enviar a tu propio endpoint de analytics
    // O usar servicios que respeten privacidad como Plausible o Fathom
    console.log('Page view:', pageData);
}

// Rastrear página vista
trackPageView();

// ============================================
// 11. GESTIÓN DE ERRORES GLOBAL
// ============================================
window.addEventListener('error', function(e) {
    // Log de errores (en producción, enviar a servicio de monitoreo)
    console.error('Error detectado:', {
        message: e.message,
        source: e.filename,
        line: e.lineno,
        column: e.colno
    });
    
    // No mostrar errores técnicos al usuario
    return true;
});

// ============================================
// 12. PROTECCIÓN CONTRA CONSOLE INJECTION
// ============================================
if (typeof console !== 'undefined' && console.log) {
    const originalLog = console.log;
    console.log = function(...args) {
        // Filtrar intentos de inyección maliciosa en console
        const safeArgs = args.map(arg => {
            if (typeof arg === 'string') {
                return sanitizeHTML(arg);
            }
            return arg;
        });
        originalLog.apply(console, safeArgs);
    };
}

// ============================================
// 13. READING TIME CALCULATOR
// ============================================
function calculateReadingTime() {
    const article = document.querySelector('article');
    if (!article) return;
    
    const text = article.textContent;
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / wordsPerMinute);
    
    const readingTimeEl = document.querySelector('.reading-time');
    if (readingTimeEl) {
        readingTimeEl.textContent = `${readingTime} min de lectura`;
    }
}

calculateReadingTime();

// ============================================
// 14. SHARE BUTTONS FUNCTIONALITY
// ============================================
function initShareButtons() {
    const shareButtons = document.querySelectorAll('[data-share]');
    
    shareButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const platform = this.dataset.share;
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);
            
            let shareUrl = '';
            
            switch(platform) {
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                    break;
                case 'linkedin':
                    shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                    break;
            }
            
            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        });
    });
}

initShareButtons();

// ============================================
// 15. PERFORMANCE MONITORING
// ============================================
window.addEventListener('load', function() {
    if ('performance' in window && 'timing' in window.performance) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        
        console.log(`Page loaded in ${loadTime}ms`);
        
        // Advertir si el sitio carga lentamente
        if (loadTime > 3000) {
            console.warn('⚠️ Página cargó lentamente. Considera optimizar recursos.');
        }
    }
});

// ============================================
// EXPORT PARA TESTS (si usas módulos)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sanitizeHTML,
        isValidEmail,
        calculateReadingTime
    };
}