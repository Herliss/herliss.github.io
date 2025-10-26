/**
 * Contact Form - Validación Segura
 * Siguiendo mejores prácticas OWASP
 */

'use strict';

(function() {
    // ============================================
    // 1. CONFIGURACIÓN Y CONSTANTES
    // ============================================
    const CONFIG = {
        MAX_NAME_LENGTH: 100,
        MAX_EMAIL_LENGTH: 254,
        MAX_COMPANY_LENGTH: 100,
        MAX_MESSAGE_LENGTH: 2000,
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        NAME_REGEX: /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,100}$/,
        RATE_LIMIT_DELAY: 3000 // 3 segundos entre envíos
    };

    let lastSubmitTime = 0;

    // ============================================
    // 2. SANITIZACIÓN DE STRINGS (Prevención XSS)
    // ============================================
    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    function sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    }

    // ============================================
    // 3. VALIDACIONES
    // ============================================
    const validators = {
        name: function(value) {
            if (!value || value.length < 2) {
                return 'El nombre debe tener al menos 2 caracteres';
            }
            if (value.length > CONFIG.MAX_NAME_LENGTH) {
                return `El nombre no puede exceder ${CONFIG.MAX_NAME_LENGTH} caracteres`;
            }
            if (!CONFIG.NAME_REGEX.test(value)) {
                return 'El nombre solo puede contener letras y espacios';
            }
            return null;
        },

        email: function(value) {
            if (!value) {
                return 'El correo electrónico es obligatorio';
            }
            if (value.length > CONFIG.MAX_EMAIL_LENGTH) {
                return 'El correo electrónico es demasiado largo';
            }
            if (!CONFIG.EMAIL_REGEX.test(value)) {
                return 'Por favor, ingresa un correo electrónico válido';
            }
            // Validación adicional de dominios sospechosos
            const suspiciousDomains = ['tempmail', 'throwaway', 'guerrillamail'];
            const domain = value.split('@')[1];
            if (suspiciousDomains.some(sus => domain.includes(sus))) {
                return 'Por favor, usa un correo electrónico válido';
            }
            return null;
        },

        company: function(value) {
            if (value && value.length > CONFIG.MAX_COMPANY_LENGTH) {
                return `El nombre de la empresa no puede exceder ${CONFIG.MAX_COMPANY_LENGTH} caracteres`;
            }
            return null;
        },

        subject: function(value) {
            if (!value) {
                return 'Por favor, selecciona un asunto';
            }
            return null;
        },

        message: function(value) {
            if (!value || value.length < 10) {
                return 'El mensaje debe tener al menos 10 caracteres';
            }
            if (value.length > CONFIG.MAX_MESSAGE_LENGTH) {
                return `El mensaje no puede exceder ${CONFIG.MAX_MESSAGE_LENGTH} caracteres`;
            }
            // Detectar contenido potencialmente malicioso
            const suspiciousPatterns = [
                /<script/i,
                /javascript:/i,
                /on\w+\s*=/i,
                /<iframe/i
            ];
            if (suspiciousPatterns.some(pattern => pattern.test(value))) {
                return 'El mensaje contiene contenido no permitido';
            }
            return null;
        },

        privacy: function(checked) {
            if (!checked) {
                return 'Debes aceptar la política de privacidad';
            }
            return null;
        }
    };

    // ============================================
    // 4. FUNCIONES DE UI
    // ============================================
    function showError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const formGroup = document.getElementById(fieldId).closest('.form-group');
        
        if (errorElement && message) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            formGroup.classList.add('error');
        }
    }

    function clearError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const formGroup = document.getElementById(fieldId).closest('.form-group');
        
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
            formGroup.classList.remove('error');
        }
    }

    function showFormMessage(message, type) {
        const messageElement = document.getElementById('formMessage');
        messageElement.textContent = sanitizeHTML(message);
        messageElement.className = `form-message show ${type}`;
        
        // Auto-ocultar después de 5 segundos si es éxito
        if (type === 'success') {
            setTimeout(() => {
                messageElement.classList.remove('show');
            }, 5000);
        }
    }

    function updateCharCount() {
        const messageField = document.getElementById('message');
        const charCount = document.querySelector('.char-count');
        const currentLength = messageField.value.length;
        
        charCount.textContent = `${currentLength} / ${CONFIG.MAX_MESSAGE_LENGTH} caracteres`;
        
        if (currentLength > CONFIG.MAX_MESSAGE_LENGTH * 0.9) {
            charCount.style.color = 'var(--accent-red)';
        } else {
            charCount.style.color = 'var(--text-secondary)';
        }
    }

    // ============================================
    // 5. VALIDACIÓN EN TIEMPO REAL
    // ============================================
    function validateField(fieldId, value) {
        const validator = validators[fieldId];
        if (!validator) return true;

        const error = validator(value);
        if (error) {
            showError(fieldId, error);
            return false;
        } else {
            clearError(fieldId);
            return true;
        }
    }

    // ============================================
    // 6. RATE LIMITING
    // ============================================
    function checkRateLimit() {
        const currentTime = Date.now();
        const timeSinceLastSubmit = currentTime - lastSubmitTime;
        
        if (timeSinceLastSubmit < CONFIG.RATE_LIMIT_DELAY) {
            const remainingTime = Math.ceil((CONFIG.RATE_LIMIT_DELAY - timeSinceLastSubmit) / 1000);
            showFormMessage(
                `Por favor, espera ${remainingTime} segundos antes de enviar otro mensaje`,
                'error'
            );
            return false;
        }
        
        lastSubmitTime = currentTime;
        return true;
    }

    // ============================================
    // 7. ENVÍO DEL FORMULARIO
    // ============================================
    async function handleSubmit(e) {
        e.preventDefault();
        
        // Rate limiting
        if (!checkRateLimit()) {
            return;
        }

        const form = e.target;
        const submitBtn = document.getElementById('submitBtn');
        
        // Validar todos los campos
        const fields = ['name', 'email', 'subject', 'message', 'privacy'];
        let isValid = true;
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const value = field.type === 'checkbox' ? field.checked : sanitizeInput(field.value);
            if (!validateField(fieldId, value)) {
                isValid = false;
            }
        });
        
        // Validar campo opcional company
        const companyField = document.getElementById('company');
        if (companyField.value) {
            validateField('company', sanitizeInput(companyField.value));
        }

        if (!isValid) {
            showFormMessage('Por favor, corrige los errores antes de enviar', 'error');
            return;
        }

        // Deshabilitar botón y mostrar loader
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        try {
            // Enviar formulario
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                showFormMessage(
                    '¡Mensaje enviado exitosamente! Te responderé en breve.',
                    'success'
                );
                form.reset();
                updateCharCount();
                
                // Log success (para analytics si es necesario)
                console.log('Contact form submitted successfully');
            } else {
                throw new Error('Error al enviar el formulario');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            showFormMessage(
                'Hubo un error al enviar el mensaje. Por favor, intenta nuevamente o contáctame directamente por correo.',
                'error'
            );
        } finally {
            // Rehabilitar botón
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    // ============================================
    // 8. INICIALIZACIÓN
    // ============================================
    function init() {
        const form = document.getElementById('contactForm');
        if (!form) return;

        // Event listeners para validación en tiempo real
        const fields = ['name', 'email', 'company', 'subject', 'message'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', function() {
                    const value = sanitizeInput(this.value);
                    validateField(fieldId, value);
                });
                
                field.addEventListener('input', function() {
                    clearError(fieldId);
                });
            }
        });

        // Character counter para mensaje
        const messageField = document.getElementById('message');
        if (messageField) {
            messageField.addEventListener('input', updateCharCount);
            updateCharCount();
        }

        // Checkbox de privacidad
        const privacyCheckbox = document.getElementById('privacy');
        if (privacyCheckbox) {
            privacyCheckbox.addEventListener('change', function() {
                validateField('privacy', this.checked);
            });
        }

        // Submit handler
        form.addEventListener('submit', handleSubmit);

        // Prevenir autocompletado de honeypot
        const honeypot = form.querySelector('input[name="_gotcha"]');
        if (honeypot) {
            honeypot.setAttribute('tabindex', '-1');
            honeypot.setAttribute('autocomplete', 'off');
        }
    }

    // ============================================
    // 9. EJECUTAR AL CARGAR EL DOM
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================
    // 10. PROTECCIÓN ADICIONAL
    // ============================================
    
    // Prevenir copiar/pegar de scripts maliciosos
    document.addEventListener('paste', function(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            setTimeout(function() {
                target.value = sanitizeInput(target.value);
            }, 0);
        }
    });

    // Detectar y prevenir manipulación del DOM
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT') {
                    console.warn('Intento de inyección de script detectado');
                    node.remove();
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();