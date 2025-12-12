// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAr-0uIS0GEqMqlJ7CNAR5DXnNMeQE0zm0",
  authDomain: "estoque-serob-db.firebaseapp.com",
  projectId: "estoque-serob-db",
  storageBucket: "estoque-serob-db.firebasestorage.app",
  messagingSenderId: "702596180282",
  appId: "1:702596180282:web:24cabd8b902d5a9a02c803",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados e exporta para usar em outros arquivos
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, onSnapshot, deleteDoc, doc };
