// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3lkIqmIfDoVnF06oYzw-Wdy8mUpFkQqM",
  authDomain: "web12-82829.firebaseapp.com",
  projectId: "web12-82829",
  storageBucket: "web12-82829.firebasestorage.app",
  messagingSenderId: "621117920470",
  appId: "1:621117920470:web:07df4f2e5b28d3343ce577",
  measurementId: "G-1EVN90Z5DE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the Firebase instances
export { auth, db, storage }; 