import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    setDoc, 
    updateDoc, 
    collection, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCEiMXwd9Dy5PfDX6h_W-X4vYm3xkkBGjI",
    authDomain: "zentask-18275.firebaseapp.com",
    projectId: "zentask-18275",
    storageBucket: "zentask-18275.firebasestorage.app",
    messagingSenderId: "129368848018",
    appId: "1:129368848018:web:3e53016c1232930f07984b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
    auth, 
    db, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    doc, 
    onSnapshot, 
    setDoc, 
    updateDoc, 
    collection, 
    serverTimestamp 
};
