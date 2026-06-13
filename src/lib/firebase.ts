// ============================================================
//  Inicializa Firebase (Firestore + Auth) una sola vez y
//  exporta lo que usa el resto de la pagina.
// ============================================================
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig";

// true solo cuando ya pegaste tus claves reales en firebaseConfig.ts
// (mientras tengan el texto "PEGAR_AQUI" la web no intenta conectarse).
export const isFirebaseConfigured =
  !firebaseConfig.apiKey.includes("PEGAR_AQUI") &&
  !firebaseConfig.appId.includes("PEGAR_AQUI");

// Evita inicializar dos veces (Astro puede ejecutar el script varias veces)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
