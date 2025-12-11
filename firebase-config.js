// Importa as funções que precisamos do Firebase via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SUAS CONFIGURAÇÕES (Copie do console do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyD...", 
  authDomain: "estoque-serob-db.firebaseapp.com",
  projectId: "estoque-serob-db",
  storageBucket: "estoque-serob-db.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exporta o banco de dados para usar nos outros arquivos
export { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc };