// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJZzORoLA7qdphIZKcmobXF0jc0KOInrs",
  authDomain: "aicoach-c7d7d.firebaseapp.com",
  databaseURL: "https://aicoach-c7d7d-default-rtdb.firebaseio.com",
  projectId: "aicoach-c7d7d",
  storageBucket: "aicoach-c7d7d.firebasestorage.app",
  messagingSenderId: "767989799645",
  appId: "1:767989799645:web:d332c890ede76323551934",
  measurementId: "G-G45SHXTB6E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

export { app, analytics, database }; 