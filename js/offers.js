//Offers CRUD
import { db } from "./firebaseConfig.js";
import { logAction } from "./logging.js";
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// CREATE OFFER
export async function createOffer(shopId, offer) {
    try {
        if (!offer.title || !offer.productIds?.length) {
            throw new Error("Title and at least one product are required");
        }

        const docRef = await addDoc(collection(db, "offers"), {
            shopId,
            title: offer.title,
            discount: offer.discount || 0,
            startDate: offer.startDate || null,
            endDate: offer.endDate || null,
            productIds: offer.productIds,
            createdAt: new Date()
        });

        await logAction("CREATE_OFFER", { shopId, offer: offer.title, docId: docRef.id });
        return { success: true, id: docRef.id };
    } catch (err) {
        console.error(err);
        await logAction("CREATE_OFFER_ERROR", { shopId, error: err.message });
        throw err;
    }
}

// LINK PRODUCTS TO OFFER
export async function linkProductsToOffer(offerId, productIds) {
    const offerDoc = doc(db, "offers", offerId);
    await updateDoc(offerDoc, { productIds });
    await logAction("LINK_PRODUCTS_TO_OFFER", { offerId, productIds });
}

// LIST ACTIVE OFFERS FOR SHOP
export async function listActiveOffers(shopId) {
    const q = query(collection(db, "offers"), where("shopId", "==", shopId));
    const snapshot = await getDocs(q);
    const offers = [];
    snapshot.forEach(doc => offers.push({ id: doc.id, ...doc.data() }));
    return offers;
}

// GET PRODUCTS FOR OFFER
export async function getProductsForOffer(offerId) {
    const offerDoc = doc(db, "offers", offerId);
    const snap = await getDoc(offerDoc);
    if (!snap.exists()) return [];
    const data = snap.data();
    const products = [];
    if (data.productIds && data.productIds.length) {
        for (const pid of data.productIds) {
            const prodSnap = await getDoc(doc(db, "products", pid));
            if (prodSnap.exists()) products.push({ id: pid, ...prodSnap.data() });
        }
    }
    return products;
}

// DELETE OFFER
export async function deleteOffer(offerId) {
    try {
        await deleteDoc(doc(db, "offers", offerId));
        await logAction("DELETE_OFFER", { offerId });
    } catch (err) {
        console.error(err);
        await logAction("DELETE_OFFER_ERROR", { offerId, error: err.message });
        throw err;
    }
}
