// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_KEY,
  authDomain: "distress-2b3cd.firebaseapp.com",
  databaseURL: "https://distress-2b3cd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "distress-2b3cd",
  storageBucket: "distress-2b3cd.firebasestorage.app",
  messagingSenderId: "516886295055",
  appId: "1:516886295055:web:e083ae993c26429daea97a",
  measurementId: "G-S8119B19K2"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const storage = getStorage(app)