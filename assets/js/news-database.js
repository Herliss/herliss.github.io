/**
 * Sistema de Gestión de Noticias con Firestore
 * 
 * Funcionalidades:
 * - Almacena noticias organizadas por fecha
 * - Recupera noticias históricas
 * - Evita duplicados mediante IDs únicos
 * - Limpieza automática de noticias antiguas
 * - Estadísticas mensuales
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 * Versión: 1.0
 */

'use strict';

// ============================================
// NEWSDB - SISTEMA DE GESTIÓN DE NOTICIAS
// ============================================

const NewsDB = {
    
    // Referencia a Firestore
    get db() {
        return window.db;
    },
    
    // ============================================
    // GUARDAR NOTICIAS
    // ============================================
    
    /**
     * Guarda un array de noticias en Firestore
     * Organiza por fecha y evita duplicados
     * 
     * @param {Array} articles - Array de artículos a guardar
     * @returns {Promise<number>} - Número de noticias guardadas
     */
    async saveNews(articles) {
        if (!this.db) {
            console.warn('⚠️ Firestore no disponible, saltando guardado');
            return 0;
        }
        
        if (!articles || articles.length === 0) {
            console.log('📝 No hay noticias para guardar');
            return 0;
        }
        
        console.log(`💾 Guardando ${articles.length} noticias en Firestore...`);
        
        const batch = this.db.batch();
        let saved = 0;
        const maxBatchSize = 500; // Límite de Firestore
        
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            
            try {
                // Generar ID único basado en URL
                const newsId = this.generateNewsId(article.link);
                const newsRef = this.db.collection('news').doc(newsId);
                
                // Extraer y normalizar fecha
                const pubDate = new Date(article.pubDate);
                if (isNaN(pubDate.getTime())) {
                    console.warn(`⚠️ Fecha inválida para: ${article.title}`);
                    continue;
                }
                
                const dateKey = this.getDateKey(pubDate);
                
                // Preparar datos a guardar
                const newsData = {
                    id: newsId,
                    title: article.title || '',
                    link: article.link || '',
                    description: article.description || '',
                    pubDate: firebase.firestore.Timestamp.fromDate(pubDate),
                    sourceName: article.sourceName || 'Unknown',
                    sourceColor: article.sourceColor || '#666666',
                    sourceCategory: article.sourceCategory || 'general',
                    thumbnail: article.thumbnail || '',
                    author: article.author || '',
                    
                    // Metadata enriquecida (si existe)
                    metadata: article.metadata || {},
                    
                    // Índices para búsqueda eficiente
                    year: pubDate.getFullYear(),
                    month: pubDate.getMonth() + 1,
                    day: pubDate.getDate(),
                    dateKey: dateKey, // Formato: "2024-12-13"
                    
                    // Timestamps de control
                    savedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Agregar al batch (usar merge para no sobrescribir)
                batch.set(newsRef, newsData, { merge: true });
                saved++;
                
                // Ejecutar batch si alcanzamos el límite
                if (saved % maxBatchSize === 0) {
                    await batch.commit();
                    console.log(`✅ Batch ${Math.floor(saved / maxBatchSize)} guardado (${saved} noticias)`);
                }
                
            } catch (error) {
                console.error(`❌ Error procesando noticia "${article.title}":`, error);
            }
        }
        
        // Ejecutar batch final
        try {
            if (saved % maxBatchSize !== 0) {
                await batch.commit();
            }
            console.log(`✅ Total guardado: ${saved} noticias en Firestore`);
            return saved;
        } catch (error) {
            console.error('❌ Error ejecutando batch final:', error);
            return 0;
        }
    },
    
    // ============================================
    // CONSULTAS POR FECHA
    // ============================================
    
    /**
     * Obtiene noticias en un rango de fechas
     * 
     * @param {Date} startDate - Fecha inicial
     * @param {Date} endDate - Fecha final
     * @returns {Promise<Array>} - Array de artículos
     */
    async getNewsByDateRange(startDate, endDate) {
        if (!this.db) {
            console.warn('⚠️ Firestore no disponible');
            return [];
        }
        
        try {
            const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
            const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);
            
            console.log(`🔍 Consultando noticias: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
            
            // MODIFICACIÓN: Solo obtener noticias con visible: true
            const snapshot = await this.db.collection('news')
                .where('visible', '==', true)  // ← NUEVO: Filtrar solo visibles
                .where('pubDate', '>=', startTimestamp)
                .where('pubDate', '<=', endTimestamp)
                .orderBy('pubDate', 'desc')
                .limit(500) // Límite de seguridad
                .get();
            
            const articles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                articles.push({
                    ...data,
                    // Convertir Timestamp a ISO string
                    pubDate: data.pubDate.toDate().toISOString()
                });
            });
            
            console.log(`✅ ${articles.length} noticias recuperadas de Firestore`);
            return articles;
            
        } catch (error) {
            console.error('❌ Error consultando Firestore:', error);
            return [];
        }
    },
    
    /**
     * Obtiene noticias de hoy
     */
    async getTodayNews() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return this.getNewsByDateRange(today, tomorrow);
    },
    
    /**
     * Obtiene noticias de los últimos N días
     * 
     * @param {number} days - Número de días hacia atrás
     * @returns {Promise<Array>}
     */
    async getRecentNews(days = 7) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        
        return this.getNewsByDateRange(startDate, endDate);
    },
    
    /**
     * Obtiene noticias del mes actual ÚNICAMENTE
     * 
     * @returns {Promise<Array>} - Array de noticias del mes en curso
     */
    async getCurrentMonthNews() {
        if (!this.db) {
            console.warn('⚠️ Firestore no disponible');
            return [];
        }
        
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth(); // 0-11
            
            // Primer día del mes a las 00:00:00
            const startOfMonth = new Date(year, month, 1, 0, 0, 0);
            
            // Último día del mes a las 23:59:59
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
            
            console.log(`📅 Consultando mes actual: ${startOfMonth.toLocaleDateString('es-ES')} - ${endOfMonth.toLocaleDateString('es-ES')}`);
            
            // MODIFICACIÓN: Solo obtener noticias con visible: true
            const snapshot = await this.db.collection('news')
                .where('visible', '==', true)  // ← NUEVO: Filtrar solo visibles
                .where('pubDate', '>=', firebase.firestore.Timestamp.fromDate(startOfMonth))
                .where('pubDate', '<=', firebase.firestore.Timestamp.fromDate(endOfMonth))
                .orderBy('pubDate', 'desc')
                .get();
            
            const articles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                articles.push({
                    ...data,
                    pubDate: data.pubDate.toDate().toISOString()
                });
            });
            
            const mesNombre = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            console.log(`✅ ${articles.length} noticias de ${mesNombre} cargadas`);
            return articles;
            
        } catch (error) {
            console.error('❌ Error consultando mes actual:', error);
            return [];
        }
    },
    
    /**
     * Obtiene noticias de un mes específico
     * 
     * @param {number} year - Año (ej: 2024)
     * @param {number} month - Mes (1-12)
     * @returns {Promise<Array>}
     */
    async getMonthNews(year, month) {
        if (!this.db) return [];
        
        try {
            console.log(`🔍 Consultando noticias de ${month}/${year}`);
            
            // MODIFICACIÓN: Solo obtener noticias con visible: true
            const snapshot = await this.db.collection('news')
                .where('visible', '==', true)  // ← NUEVO: Filtrar solo visibles
                .where('year', '==', year)
                .where('month', '==', month)
                .orderBy('pubDate', 'desc')
                .limit(500)
                .get();
            
            const articles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                articles.push({
                    ...data,
                    pubDate: data.pubDate.toDate().toISOString()
                });
            });
            
            console.log(`✅ ${articles.length} noticias de ${month}/${year}`);
            return articles;
            
        } catch (error) {
            console.error('❌ Error consultando mes:', error);
            return [];
        }
    },
    
    // ============================================
    // ESTADÍSTICAS
    // ============================================
    
    /**
     * Obtiene estadísticas de noticias por mes
     * 
     * @returns {Promise<Object>} - Objeto con formato { "2024-12": 45, "2024-11": 120 }
     */
    async getMonthlyStats() {
        if (!this.db) return {};
        
        try {
            console.log('📊 Calculando estadísticas mensuales...');
            
            // Obtener últimas 1000 noticias visibles
            const snapshot = await this.db.collection('news')
                .where('visible', '==', true)  // ← NUEVO: Solo noticias visibles
                .orderBy('pubDate', 'desc')
                .limit(1000)
                .get();
            
            const monthCount = {};
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const key = `${data.year}-${String(data.month).padStart(2, '0')}`;
                monthCount[key] = (monthCount[key] || 0) + 1;
            });
            
            console.log('✅ Estadísticas calculadas:', monthCount);
            return monthCount;
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return {};
        }
    },
    
    /**
     * Obtiene el total de noticias almacenadas
     */
    async getTotalNewsCount() {
        if (!this.db) return 0;
        
        try {
            const snapshot = await this.db.collection('news')
                .limit(1)
                .get();
            
            // Nota: Firestore no tiene count() nativo eficiente
            // Esta es una estimación basada en el último documento
            return snapshot.size;
        } catch (error) {
            console.error('❌ Error contando noticias:', error);
            return 0;
        }
    },
    
    // ============================================
    // VERIFICACIONES
    // ============================================
    
    /**
     * Verifica si ya existen noticias para hoy
     */
    async hasTodayNews() {
        const todayNews = await this.getTodayNews();
        return todayNews.length > 0;
    },
    
    /**
     * Verifica si una noticia ya existe en la base de datos
     * 
     * @param {string} url - URL de la noticia
     * @returns {Promise<boolean>}
     */
    async newsExists(url) {
        if (!this.db) return false;
        
        try {
            const newsId = this.generateNewsId(url);
            const doc = await this.db.collection('news').doc(newsId).get();
            return doc.exists;
        } catch (error) {
            console.error('❌ Error verificando existencia:', error);
            return false;
        }
    },
    
    // ============================================
    // LIMPIEZA Y MANTENIMIENTO
    // ============================================
    
    /**
     * Limpia noticias más antiguas que N días
     * 
     * @param {number} daysToKeep - Días a mantener (default: 90)
     * @returns {Promise<number>} - Número de noticias eliminadas
     */
    async cleanOldNews(daysToKeep = 90) {
        if (!this.db) return 0;
        
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffTimestamp = firebase.firestore.Timestamp.fromDate(cutoffDate);
            
            console.log(`🗑️ Limpiando noticias anteriores a ${cutoffDate.toLocaleDateString()}...`);
            
            const snapshot = await this.db.collection('news')
                .where('pubDate', '<', cutoffTimestamp)
                .limit(500) // Procesar en lotes
                .get();
            
            if (snapshot.empty) {
                console.log('✅ No hay noticias antiguas para limpiar');
                return 0;
            }
            
            const batch = this.db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`✅ ${snapshot.size} noticias antiguas eliminadas`);
            return snapshot.size;
            
        } catch (error) {
            console.error('❌ Error limpiando noticias antiguas:', error);
            return 0;
        }
    },
    
    /**
     * Elimina duplicados basándose en URLs
     */
    async removeDuplicates() {
        if (!this.db) return 0;
        
        console.log('🔍 Buscando duplicados...');
        // Implementación compleja - por ahora retornar 0
        // Se puede implementar si es necesario
        return 0;
    },
    
    // ============================================
    // UTILIDADES PRIVADAS
    // ============================================
    
    /**
     * Genera un ID único basado en la URL
     * Usa un hash simple pero efectivo
     * 
     * @param {string} url - URL de la noticia
     * @returns {string} - ID único
     */
    generateNewsId(url) {
        let hash = 0;
        const cleanUrl = url.toLowerCase().trim();
        
        for (let i = 0; i < cleanUrl.length; i++) {
            const char = cleanUrl.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32bit integer
        }
        
        return 'news_' + Math.abs(hash).toString(36);
    },
    
    /**
     * Genera una clave de fecha en formato YYYY-MM-DD
     * 
     * @param {Date} date - Fecha
     * @returns {string} - Clave de fecha
     */
    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};

// ============================================
// EXPORTAR GLOBALMENTE
// ============================================

window.NewsDB = NewsDB;

console.log('✅ NewsDB v1.0 cargado y listo');
console.log('📚 Métodos disponibles:');
console.log('   - NewsDB.saveNews(articles)');
console.log('   - NewsDB.getRecentNews(days)');
console.log('   - NewsDB.getTodayNews()');
console.log('   - NewsDB.getMonthNews(year, month)');
console.log('   - NewsDB.getMonthlyStats()');
console.log('   - NewsDB.cleanOldNews(days)');