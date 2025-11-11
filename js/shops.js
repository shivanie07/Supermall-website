//shop CRUD
import { db, auth } from "./firebaseConfig.js";
import { collection, addDoc, getDocs, query, updateDoc, deleteDoc, where, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { logAction } from "./logging.js";

/**
 * Create a new shop
 * @param {string|null} userId optional fallback userId
 * @param {object} data {name, category, floor, contact}
 */
export async function createShop(userId, { name, category, floor, contact }) {
    const uid = auth?.currentUser?.uid || userId || null;

    if (!uid) {
        const err = new Error("Authentication required to create a shop");
        await logAction({ userId: "anon", action: "create_shop", target: name, status: "failure", message: err.message });
        return { success: false, error: err };
    }

    const shopData = {
        name,
        category,
        floor,
        contact,
        ownerId: uid,
        createdOn: new Date().toISOString()
    };

    try {
        const docRef = await addDoc(collection(db, "shops"), shopData);
        await logAction({ userId: uid, action: "create_shop", target: docRef.id, status: "success", message: "shop created" });
        return { success: true, id: docRef.id };
    } catch (err) {
        const isPerm = err?.code === "permission-denied" || /permission-denied/i.test(err?.message || "");
        const message = isPerm
            ? "Permission denied when writing shop (check Firestore rules)"
            : err?.message || String(err);
        return { success: false, error: Object.assign(err || {}, { friendlyMessage: message }) };
    }
}

/**
 * List shops (optionally by userId)
 * @param {string|null} userId
 * @returns {Array<object>}
 */
export async function listShops(userId = null) {
    let snap;
    if (userId) {
        const q = query(collection(db, "shops"), where("ownerId", "==", userId));
        snap = await getDocs(q);
    } else {
        snap = await getDocs(collection(db, "shops"));
    }
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Update a shop
 * @param {string} id
 * @param {object} newData
 */
export async function updateShop(id, newData) {
    try {
        const ref = doc(db, "shops", id);
        await updateDoc(ref, newData);
        await logAction({ userId: auth?.currentUser?.uid || "unknown", action: "update_shop", target: id, status: "success", message: "Shop updated" });
        return { success: true };
    } catch (err) {
        const isPerm = err?.code === "permission-denied" || /permission-denied/i.test(err?.message || "");
        if (isPerm) throw Object.assign(new Error("Permission denied: you are not allowed to update this shop."), { original: err });
        throw err;
    }
}

/**
 * Delete a shop
 * @param {string} id
 */
export async function deleteShop(id) {
    try {
        const ref = doc(db, "shops", id);
        await deleteDoc(ref);
        await logAction({ userId: auth?.currentUser?.uid || "unknown", action: "delete_shop", target: id, status: "success", message: "Shop deleted" });
        return { success: true };
    } catch (err) {
        const isPerm = err?.code === "permission-denied" || /permission-denied/i.test(err?.message || "");
        if (isPerm) throw Object.assign(new Error("Permission denied: you are not allowed to delete this shop."), { original: err });
        throw err;
    }
}

// Unified helper to list unique fields (category/floor) optionally by userId
export async function listUniqueShopFields(field, userId = null) {
    const shopsRef = collection(db, "shops");
    let q = shopsRef;
    if (userId) q = query(shopsRef, where("ownerId", "==", userId));

    const snapshot = await getDocs(q);
    const fieldSet = new Set();

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data[field]) fieldSet.add(data[field]);
    });

    return Array.from(fieldSet);
}
