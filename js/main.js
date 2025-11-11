// Wires everything to UI
import { signup, login, logout } from "./auth.js";
import { logAction } from "./logging.js";
import { createShop, listShops, updateShop, deleteShop, listUniqueShopFields } from "./shops.js";
import { createProduct, listProducts, updateProduct, deleteProduct } from "./products.js";
import { createOffer, listActiveOffers, deleteOffer } from "./offers.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

// ================= Helper Functions =================
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Normalize image URLs (especially for emulator)
function normalizeImageUrl(url) {
    if (!url) return url;
    try {
        const EMULATOR_HOSTS = ["127.0.0.1:9199", "localhost:9199"];
        for (const host of EMULATOR_HOSTS) {
            if (url.includes(host)) {
                return url.replace(
                    new RegExp(`^https?://${host}`),
                    "https://firebasestorage.googleapis.com"
                );
            }
        }
        return url;
    } catch (e) {
        console.warn("normalizeImageUrl error", e);
        return url;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Global Elements
    let currentUser = null;
    let selectedShopId = null;
    let selectedShopName = null;

    // Auth Elements
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const signupBtn = document.getElementById('signupBtn');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('loginOutBtn');
    const userInfo = document.getElementById('userInfo');

    function showAuthMessage(text = '', isError = false) {
        let container = document.getElementById('authMessage');
        const authSection = document.getElementById('auth-section');
        if (!container && authSection) {
            container = document.createElement('div');
            container.id = 'authMessage';
            container.style.marginTop = '8px';
            authSection.appendChild(container);
        }
        if (container) {
            container.textContent = msg;
            container.style.color = isError ? 'crimson' : 'green';
        } else console.log(text);
    }

    function validateEmail(email) {
        return typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
    }

    // Shop Elements
    const shopSection = document.getElementById('shop-section');
    const createShopBtn = document.getElementById('createShopBtn');
    const shopName = document.getElementById('shopName');
    const shopCategory = document.getElementById('shopCategory');
    const shopFloor = document.getElementById('shopFloor');
    const shopContact = document.getElementById('shopContact');
    const shopList = document.getElementById('shopList');
    const manageSection = document.getElementById('manage-shop');
    const selectedShopNameEl = document.getElementById('selectedShopName');

    // Filter Elements
    const shopSearchInput = document.getElementById('shopSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const floorFilter = document.getElementById('floorFilter');

    // Product Elements
    const productForm = document.getElementById("productForm");
    const productName = document.getElementById("productName");
    const productPrice = document.getElementById("productPrice");
    const productDesc = document.getElementById("productDesc");
    const productImage = document.getElementById("productImage");
    const productsList = document.getElementById("productList");

    // Offer Elements
    const offerForm = document.getElementById("offerForm");
    const offerTitle = document.getElementById("offerTitle");
    const offerStart = document.getElementById("offerStart");
    const offerDiscount = document.getElementById("offerDiscount");
    const offerEnd = document.getElementById("offerEnd");
    const offerList = document.getElementById("offerList");
    const offerProductsList = document.getElementById("offerProductsList");

    let categories = [];
    let floors = [];

    // Fade-in animation
    function fadeInOnScroll(selector) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll(selector).forEach(el => observer.observe(el));
    }
    fadeInOnScroll('.d-flex');

    // Auth Handlers
    signupBtn?.addEventListener('click', async (e) => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password) return showAuthMessage("Email & Password required", true);
        try {
            const userCred = await authModule.signup(email, password);
            currentUser = userCred.user;
            userInfo.textContent = `Logged in as ${currentUser.email}`;
            shopSection.style.display = '';

            if (currentUser?.uid) {
                renderShops(currentUser.uid);
            }

            await logAction('signup', { email });
        } catch (err) {
            showAuthMessage("Signup failed: " + err.message, true);
            console.error(err);
        }
    });

    loginBtn?.addEventListener('click', async (e) => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password) return showAuthMessage("Email & Password required", true);
        try {
            const userCred = await login(email, password);
            currentUser = userCred.user;
            userInfo.textContent = `Logged in as ${currentUser.email}`;
            shopSection.style.display = '';
            if (currentUser?.uid) {
                renderShops(currentUser.uid);
            }
            await logAction('login', { email });
        } catch (err) {
            showAuthMessage("Login failed: " + err.message, true);
            console.error(err);
        }

    });

    logoutBtn?.addEventListener('click', async (e) => {
        try {
            await authModule.logout();
            currentUser = null;
            selectedShopId = null;
            selectedShopName = null;
            shopSection.style.display = 'none';
            manageSection.style.display = 'none';
            userInfo.textContent = '';
            await logAction('logout');
        } catch (err) {
            console.error(err);
        }
    });

    // ================= CREATE SHOP =================
    createShopBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!currentUser) return alert('Login required');
        const shop = {
            name: shopName.value,
            category: shopCategory.value,
            floor: shopFloor.value,
            contact: shopContact.value
        };
        try {
            await createShop(currentUser.uid, shop);
            shopName.value = shopCategory.value = shopFloor.value = shopContact.value = '';
            await renderShops(currentUser.uid);
            await logAction('CREATE_SHOP', { shop });
        } catch (err) {
            console.error(err);
            await logAction('CREATE_SHOP_ERROR', { error: err?.message || err });
        }
    });

    // ================= RENDER SHOPS =================
    async function renderShops(userId) {
        if (!userId) return;
        let shops = await listShops(userId);

        // Filters
        categories = await listUniqueShopFields('category', userId);
        floors = await listUniqueShopFields('floor', userId);

        const selectedCategory = categoryFilter?.value || '';
        const selectedFloor = floorFilter?.value || '';
        const searchText = shopSearchInput?.value?.toLowerCase() || '';

        if (selectedCategory) shops = shops.filter(s => s.category === selectedCategory);
        if (selectedFloor) shops = shops.filter(s => s.floor === selectedFloor);
        if (searchText) shops = shops.filter(s => s.name.toLowerCase().includes(searchText));

        // Render shop list
        shopList.innerHTML = '';
        for (const s of shops) {
            const div = document.createElement('div');
            div.className = 'd-flex align-items-center justify-content-between border p-2 mb-2';
            const canManage = currentUser && currentUser.uid === s.ownerId;
            div.innerHTML = `
                <div>
                    <strong class="shop-name">${escapeHtml(s.name)}</strong> - <span class="shop-category">${escapeHtml(s.category)}</span> (Floor: <span class="shop-floor">${escapeHtml(s.floor)}</span>)<br/>
                    <small class="text-muted">Contact: ${escapeHtml(s.contact || '-')}</small>
                </div>
                <div class="ms-3">
                    <button class="btn btn-outline-primary btn-sm edit-btn">Edit</button>
                    <button class="btn btn-outline-danger btn-sm delete-btn">Delete</button>
                    ${canManage ? `<button class="btn btn-primary btn-sm manage-btn">Manage Products</button>` : `<button class="btn btn-secondary btn-sm" disabled>Manage</button>`}
                </div>
            `;
            shopList.appendChild(div);

            // Manage Products
            div.querySelector('.manage-btn')?.addEventListener('click', async () => {
                selectedShopId = s.id;
                if (selectedShopNameEl) selectedShopNameEl.textContent = s.name;
                if (manageSection) manageSection.style.display = '';
                await renderProducts();
                await renderOfferProductCheckboxes();
                await renderOffers(false); // Delete button visible
            });

            // Edit Shop
            const editBtn = div.querySelector('.edit-btn');
            const deleteBtn = div.querySelector('.delete-btn');
            editBtn?.addEventListener('click', async () => {
                const nameEl = div.querySelector('.shop-name');
                const categoryEl = div.querySelector('.shop-category');
                const floorEl = div.querySelector('.shop-floor');
                const original = { name: nameEl.textContent, category: categoryEl.textContent, floor: floorEl.textContent };
                nameEl.innerHTML = `<input class="form-control form-control-sm edit-name" value="${escapeHtml(original.name)}">`;
                categoryEl.innerHTML = `<input class="form-control form-control-sm edit-category" value="${escapeHtml(original.category)}">`;
                floorEl.innerHTML = `<input class="form-control form-control-sm edit-floor" value="${escapeHtml(original.floor)}">`;
                editBtn.textContent = 'Save';
                deleteBtn.textContent = 'Cancel';
                editBtn.onclick = async () => {
                    try {
                        await updateShop(s.id, {
                            name: div.querySelector('.edit-name').value,
                            category: div.querySelector('.edit-category').value,
                            floor: div.querySelector('.edit-floor').value
                        });
                        await renderShops(userId);
                    } catch (err) {
                        console.error(err);
                        alert('Failed to update shop.');
                        await logAction('update_shop_error', { userId: currentUser?.uid, error: err?.message || String(err) });
                    }
                };
                deleteBtn.onclick = () => {
                    nameEl.textContent = original.name;
                    categoryEl.textContent = original.category;
                    floorEl.textContent = original.floor;
                    editBtn.textContent = 'Edit';
                    deleteBtn.textContent = 'Delete';
                };
            });

            deleteBtn?.addEventListener('click', async () => {
                if (!confirm('Delete this shop?')) return;
                try {
                    await deleteShop(s.id);
                    await logAction('delete_shop', { shopId: s.id });
                    await renderShops(userId);
                } catch (err) {
                    console.error(err);
                    alert('Failed to delete shop.');
                }
            });
        }

        // Populate Filters
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c; categoryFilter.appendChild(opt);
            });
        }
        if (floorFilter) {
            floorFilter.innerHTML = '<option value="">All Floors</option>';
            floors.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f; opt.textContent = f; floorFilter.appendChild(opt);
            });
        }

        shopSearchInput?.addEventListener('input', () => renderShops(currentUser?.uid));
        categoryFilter?.addEventListener('change', () => renderShops(currentUser?.uid));
        floorFilter?.addEventListener('change', () => renderShops(currentUser?.uid));
    }

    // Products 
    async function renderProducts() {
        if (!selectedShopId || !productsList) return;

        const products = await listProducts(selectedShopId);
        productsList.innerHTML = '';

        if (!products.length) {
            productsList.innerHTML = `<div class="text-muted">No products in this shop.</div>`;
            return;
        }

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card fade-in';

            card.innerHTML = `
            <img src="${product.imageUrl || 'placeholder.png'}" class="product-thumb" alt="${escapeHtml(product.name)}">
            <div class="product-info">
                <strong>${escapeHtml(product.name)}</strong><br>
                Price: ₹${escapeHtml(product.price)}<br>
            </div>
            <button class="btn btn-outline-danger btn-sm delete-btn mt-2">Delete</button>
            `;
            productsList.appendChild(card);

            // Delete Product
            const deleteBtn = card.querySelector('.delete-btn');
            card.querySelector('.delete-btn').addEventListener('click', async () => {
                if (!confirm("Delete this product?")) return;
                await deleteProduct(p.id, p.imagePath || null);
                await renderProducts();
                await logAction('DELETE_PRODUCT', { productId: p.id });
            });
        });

        // Trigger fade-in animation
        fadeInOnScroll('.fade-in');
    }

    productForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser || !selectedShopId) return alert('Select shop and login first');

        const product = {
            name: productName.value.trim(),
            price: parseFloat(productPrice.value),
            description: productDesc.value.trim(),
            imageFile: productImage.files[0] || null
        }

        if (!productName || !product.price) return alert('Name and Price are required');

        try {
            const res = await createProduct(selectedShopId, product);

            if (res.success) {
                productForm.reset();
                await renderProducts();
                await logAction('CREATE_PRODUCT', { product: product.name, shopId: selectedShopId });
                alert('Product added successfully!');
            } else {
                throw res.error;
            }
        } catch (err) {
            console.error(err);
        }
    });

    // ================= OFFERS =================
    async function renderOfferProductCheckboxes() {
        if (!selectedShopId || !offerProductsList) return;
        const products = await listProducts(selectedShopId);
        offerProductsList.innerHTML = '';

        if (!products.length) {
            offerProductsList.innerHTML = `<div class="text-muted">No products in this shop.</div>`;
            return;
        }

        products.forEach(p => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${p.id}" id="offerProd-${p.id}">
                    <label class="form-check-label" for="offerProd-${p.id}">${escapeHtml(p.name)}</label>
                `;
            offerProductsList.appendChild(div);
        });
    }

    offerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return alert('Login required');
        if (!selectedShopId) return alert('Select a shop first');

        // Get selected product IDs from checkboxes
        const selectedProductIds = Array.from(
            offerProductsList.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        if (!offerTitle.value.trim()) return alert('Offer title is required');
        if (!selectedProductIds.length) return alert('Select at least one product');

        const offer = {
            title: offerTitle.value.trim(),
            startDate: offerStart.value,
            endDate: offerEnd.value,
            discount: offerDiscount.value.trim(),
            productIds: selectedProductIds
        };

        try {
            const res = await createOffer(selectedShopId, offer);
            if (res.success) {
                offerForm.reset();
                await renderOffers();
                await logAction('CREATE_OFFER', { offer: offer.title, shopId: selectedShopId });
            } else {
                throw res.error;
            }
        } catch (err) {
            console.error(err);
        }
    });


    async function renderOffers(isPublic = false) {
        if (!selectedShopId || !offerList) return;
        const offers = await listActiveOffers(selectedShopId);
        offerList.innerHTML = '';
        if (!offers.length) {
            offerList.innerHTML = `<div class="text-muted">No offers yet.</div>`;
            return;
        }

        offers.forEach(o => {
            const div = document.createElement('div');
            div.className = 'border p-2 mb-2';
            div.innerHTML = `
                <strong>${escapeHtml(o.title)}</strong> | ${escapeHtml(o.startDate)} → ${escapeHtml(o.endDate)} | Discount: ${escapeHtml(o.discount)}%
            `;
            if (!isPublic) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-outline-danger btn-sm float-end';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', async () => {
                    if (!confirm("Delete this offer?")) return;
                    await deleteOffer(o.id);
                    await renderOffers(false);
                    await logAction('delete_offer', { offerId: o.id });
                });
                div.appendChild(deleteBtn);
            }
            offerList.appendChild(div);
        });

        //Trigger fade-in animation
        fadeInOnScroll('.fade-in');
    }
});
