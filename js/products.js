//Products CRUD
import { db, storage } from "./firebaseConfig.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { logAction } from "./logging.js";

// CREATE PRODUCT
export async function createProduct(shopId, product) {
    try {
        let imageUrl = "";
        let imagePath = "";

        // Upload image if present
        if (product.imageFile) {
            const file = product.imageFile;
            const storageRef = ref(storage, `products/${shopId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
            imagePath = storageRef.fullPath;
        }

        // Prepare Firestore doc
        const docRef = await addDoc(collection(db, "products"), {
            name: product.name,
            price: product.price,
            description: product.description || "",
            shopId,
            imageUrl,
            imagePath,
            createdAt: new Date()
        });

        await logAction("CREATE_PRODUCT", { shopId, product: product.name, docId: docRef.id });
        return { success: true, id: docRef.id };
    } catch (err) {
        console.error(err);
        await logAction("CREATE_PRODUCT_ERROR", { error: err.message || err });
        return { success: false, error: err };
    }
}

// LIST PRODUCTS FOR SHOP
export async function listProducts(shopId) {
    try {
        const q = query(collection(db, "products"), where("shopId", "==", shopId));
        const snapshot = await getDocs(q);
        const products = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (doc.id && data && data.name) {
                products.push({ id: doc.id, ...data });
            } else {
                console.warn(`Skipped invalid product document with ID ${doc.id}`);
            }
        });
        return products;
    } catch (err) {
        console.error("Failed to list products:", err);
        return [];
    }
}

// UPDATE PRODUCT
export async function updateProduct(productId, updates) {
    const docRef = doc(db, "products", productId);
    await updateDoc(docRef, updates);
    await logAction("UPDATE_PRODUCT", { productId, updates });
}

// DELETE PRODUCT
export async function deleteProduct(productId, imagePath = null) {
    try {
        if (imagePath) {
            const storageRef = ref(storage, imagePath);
            await deleteObject(storageRef);
        }
        await deleteDoc(doc(db, "products", productId));
        await logAction("DELETE_PRODUCT", { productId });
        return { success: true };
    } catch (err) {
        console.error(err);
        await logAction("DELETE_PRODUCT_ERROR", { productId, error: err.message });
        return { success: false, error: err };
    }
}

async function renderOfferProductCheckboxes() {
    if (!selectedShopId) return;

    const offerProductsContainer = document.getElementById('offerProductsList');
    if (!offerProductsContainer) return;

    const products = await listProducts(selectedShopId);
    offerProductsContainer.innerHTML = '';

    if (!products.length) {
        offerProductsContainer.innerHTML = `<div class="text-muted">No products available for offer.</div>`;
        return;
    }

    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
            <input type="checkbox" class="form-check-input" id="offerProduct-${p.id}" value="${p.id}">
            <label for="offerProduct-${p.id}" class="form-check-label">${p.name || 'Unnamed product'}</label>
        `;
        offerProductsContainer.appendChild(div);
    });
}