// js/config/firebase.js

const firebaseConfig = {
  apiKey: "AIzaSyBcNJElf8lKQ3gJGWeeJXXX-UURR_z2rrg",
  authDomain: "si-umroh-v2.firebaseapp.com",
  projectId: "si-umroh-v2",
  storageBucket: "si-umroh-v2.firebasestorage.app",
  messagingSenderId: "919955106642",
  appId: "1:919955106642:web:e5d0f4a060018fa73ea88b"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

// Deklarasi variabel global untuk Firestore dan Auth
const db = firebase.firestore();
const auth = firebase.auth();