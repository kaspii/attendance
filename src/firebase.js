import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUDogOF6uZe8IIrmPJjugJT6P6flkMhIQ",
  authDomain: "attendance-da972.firebaseapp.com",
  projectId: "attendance-da972",
  storageBucket: "attendance-da972.firebasestorage.app",
  messagingSenderId: "970952421245",
  appId: "1:970952421245:web:a3945f651d131de9f0e614"
};

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
