// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

//Firebase configuration
export const firebaseConfig = {
        apiKey: "AIzaSyD2Pn36GF59FBAuHvuyexqrqEga0I2HKS4",
        authDomain: "supermall-83ceb.firebaseapp.com",
        projectId: "supermall-83ceb",
        storageBucket: "supermall-83ceb.appspot.com",
        messagingSenderId: "703558130071",
        appId: "1:703558130071:web:2ae1fce40ca8c0b3928cd2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Emulator configuration
const USE_EMULATOR = true; // set false for production

if (USE_EMULATOR) {
    console.log("Using Firebase emulators");

    // Auth emulator
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

    // Firestore emulator
    connectFirestoreEmulator(db, "127.0.0.1", 8085);

    // Storage emulator
    connectStorageEmulator(storage, "127.0.0.1", 9199);
}










