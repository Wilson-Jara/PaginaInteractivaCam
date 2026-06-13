// ============================================================
//  CONFIGURACION DE FIREBASE (lado web / navegador)
// ============================================================
//
//  Estos valores son SEGUROS de exponer al publico: Firebase
//  protege los datos con las "reglas de seguridad" de Firestore,
//  no con estas claves.
//
//  Este archivo SOLO exporta el objeto de configuracion.
//  La inicializacion (Firestore + Auth) ocurre en firebase.ts.
// ============================================================
export const firebaseConfig = {
  apiKey: "AIzaSyDvWxHAtHy7sacovnxQKeg-QhgGqrcr7bA",
  authDomain: "juegosinteractivoscam.firebaseapp.com",
  projectId: "juegosinteractivoscam",
  storageBucket: "juegosinteractivoscam.firebasestorage.app",
  messagingSenderId: "605301173257",
  appId: "1:605301173257:web:021a87aa5d8a989ee81cd8",
  measurementId: "G-4WG6YS194T",
};
