// ============================================================
//  CONFIGURACION DE FIREBASE (lado web / navegador)
// ============================================================
//
//  ⚠️ DEBES PEGAR AQUI TUS DATOS. Son seguros de exponer al
//  publico (Firebase los protege con las "reglas de seguridad"
//  de Firestore, no con estas claves).
//
//  Como obtenerlos:
//   1. Entra a: https://console.firebase.google.com/project/juegosinteractivoscam/settings/general
//   2. Baja hasta "Tus apps". Si no hay ninguna app web, crea una
//      con el icono </>  ("Agregar app" -> Web).
//   3. Copia el objeto "firebaseConfig" que te muestra y pega
//      los valores abajo, reemplazando los "PEGAR_AQUI".
//
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDvWxHAtHy7sacovnxQKeg-QhgGqrcr7bA",
  authDomain: "juegosinteractivoscam.firebaseapp.com",
  projectId: "juegosinteractivoscam",
  storageBucket: "juegosinteractivoscam.firebasestorage.app",
  messagingSenderId: "605301173257",
  appId: "1:605301173257:web:021a87aa5d8a989ee81cd8",
  measurementId: "G-4WG6YS194T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);