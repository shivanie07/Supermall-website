// Centralized logging
import { db } from "./firebaseConfig.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const auth = getAuth();

/**
 * Log an action to Firestore.
 * @param {string} action - e.g., 'CREATE_SHOP', 'LOGIN', etc.
 * @param {object|string} details - Additional details about the action
 */

export async function logAction(action, details = {}) {
    let userId = 'anon';
    if (auth.currentUser) {
        userId = auth.currentUser.uid;
    }

    try {
        await addDoc(collection(db, 'logs'), {
            timestamp: new Date().toISOString(),
            userId,
            action,
            details
        });
    }catch (err) {
        console.error('Failed to log action to Firestore:', err);
    }
}
