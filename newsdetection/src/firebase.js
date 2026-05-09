import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD3yR-56Tt6swyKLH44GuuPxhZ4PLvCXhQ",
  authDomain: "truthscanai-d8a7d.firebaseapp.com",
  projectId: "truthscanai-d8a7d",
  storageBucket: "truthscanai-d8a7d.firebasestorage.app",
  messagingSenderId: "1047563249713",
  appId: "1:1047563249713:web:84184575161179e19f0d10"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
