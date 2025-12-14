/**
 * Firebase Configuration para News Database
 * Sistema de caché persistente para noticias de ciberseguridad
 * 
 * CONFIGURACIÓN ACTUALIZADA CON CREDENCIALES REALES
 * Proyecto: herliss-cybersecurity-news
 * 
 * Autor: Herliss Briceño
 * Fecha: Diciembre 2024
 */

'use strict';

// ============================================
// CONFIGURACIÓN DE FIREBASE
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyCc1YuQoQ8OvcwcbazfjkJ9vfRmiypJ5nk",
  authDomain: "herliss-cybersecurity-news.firebaseapp.com",
  projectId: "herliss-cybersecurity-news",
  storageBucket: "herliss-cybersecurity-news.firebasestorage.app",
  messagingSenderId: "1044572996672",
  appId: "1:1044572996672:web:ea18b343cc56d24b468ba5"
};

// ============================================
// INICIALIZACIÓN
// ============================================

try {
  // Inicializar Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Obtener referencia a Firestore
  const db = firebase.firestore();
  
  // Configuración de persistencia
  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });
  
  // Habilitar persistencia offline
  db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Persistencia: Múltiples pestañas abiertas');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Persistencia: No soportada en este navegador');
      }
    });
  
  // Exponer globalmente
  window.db = db;
  
  console.log('✅ Firebase Firestore inicializado correctamente');
  console.log(`📍 Proyecto: ${firebaseConfig.projectId}`);
  
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  console.error('⚠️ Verifica que hayas configurado correctamente las credenciales en firebase-config.js');
}

// ============================================
// VERIFICACIÓN DE CONEXIÓN
// ============================================

// Evento cuando se detecta cambio de estado de conexión
if (window.db) {
  window.db.collection('_connection_test').doc('test').set({
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'online'
  }).then(() => {
    console.log('✅ Conexión a Firestore verificada');
  }).catch((error) => {
    console.warn('⚠️ Error verificando conexión:', error);
  });
}