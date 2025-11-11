// auth.js
import { auth } from "./firebaseConfig.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { logAction } from "./logging.js";

// ---------------- Helper: Map Firebase errors ----------------
function mapAuthError(err) {
    if (!err) return err;
    if (err.code === 'auth/network-request-failed' || /network-request-failed/i.test(err?.message || '')) {
        return new Error('Network error: could not reach Firebase. Check your connection and try again.');
    }
    return err;
}

// ---------------- Signup ----------------
export async function signup(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Signed up:", userCredential.user);
        await logAction('signup', { email });
        return userCredential;
    } catch (err) {
        console.error("Signup error:", mapAuthError(err));
        await logAction('signup_error', { error: err?.message || err });
        throw mapAuthError(err);
    }
}

// ---------------- Login ----------------
export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in:", userCredential.user);
        await logAction('login', { email });
        return userCredential;
    } catch (err) {
        console.error("Login error:", mapAuthError(err));
        await logAction('login_error', { email, error: err?.message || err });
        throw mapAuthError(err);
    }
}

// ---------------- Logout ----------------
export async function logout() {
    try {
        await signOut(auth);
        console.log("Logged out");
        await logAction('logout', { userId: auth.currentUser?.uid || 'manual' });
    } catch (err) {
        console.error("Logout error:", mapAuthError(err));
        await logAction('logout_error', { error: err?.message });
        throw mapAuthError(err);
    }
}

// ---------------- DOM Elements ----------------
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtnNav = document.getElementById("logoutBtnNav");

// ---------------- Auth Modal Handling ----------------
const authModalEl = document.getElementById("authModal");
let authModalInstance = null;
if (authModalEl) {
    authModalInstance = new bootstrap.Modal(authModalEl, { backdrop: 'static', keyboard: false });
}

// ---------------- On Auth State Changed ----------------
onAuthStateChanged(auth, (user) => {
    const shopSection = document.getElementById("shop-section");
    const manageShop = document.getElementById("manage-shop");

    if (user) {
        // Logged in
        shopSection && (shopSection.style.display = "block");
        manageShop && (manageShop.style.display = "none");
        logoutBtnNav?.classList.remove("d-none");

        // Close modal if open
        authModalInstance?.hide();
    } else {
        // Logged out
        shopSection && (shopSection.style.display = "none");
        manageShop && (manageShop.style.display = "none");
        logoutBtnNav?.classList.add("d-none");

        // Force login modal
        authModalInstance?.show();
    }
});

// ---------------- Button Event Listeners ----------------
signupBtn?.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return alert("Email and password are required for signup.");
    try {
        await signup(email, password);
        emailInput.value = passwordInput.value = "";
    } catch (err) {
        alert(err?.message || "Signup failed");
    }
});

loginBtn?.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return alert("Email and password are required for login.");
    try {
        await login(email, password);
        emailInput.value = passwordInput.value = "";
    } catch (err) {
        alert(err?.message || "Login failed");
    }
});

logoutBtnNav?.addEventListener("click", async () => {
    try {
        await logout();
    } catch (err) {
        alert(err?.message || "Logout failed");
    }
});
