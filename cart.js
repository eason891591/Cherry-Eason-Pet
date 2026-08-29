// ⚠️ 確保此網址與你 Google Apps Script (GAS) 最新部署的網址一致
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxlTRxj5TleEN2-SXV68FRBGoWGMC_3bW3UAwi-X9DqZT1ABpCYFf8M3exy2ZReUJ6z/exec';

let allProducts = []; 
let cart = loadCartFromStorage();
let isSubmitting = false;

/* ==========================================
   🔒 背景滾動鎖定/解鎖輔助函式 (相容 Mobile/iOS)
   ========================================== */
function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none'; // 阻止行動裝置背景觸控滑動
}

function unlockBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
}

/* ==========================================
   📦 本地存儲與安全輔助函式
   ========================================== */
function loadCartFromStorage() {
    try {
        const stored = localStorage.getItem('cherryEasonCart');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("讀取購物車快存失敗:", e);
        return [];
    }
}

function saveAndUpdate() {
    try {
        localStorage.setItem('cherryEasonCart', JSON.stringify(cart));
    } catch (e) {
        console.error("寫入購物車快存失敗:", e);
    }
    updateCart();
}

// 防範商品名稱引號破壞 HTML onclick 語法
function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* ==========================================
   🚀 頁面初始化與事件監聽
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
    // 1. 載入商品資料
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #5C3A00;">🐾 正在從雲端載入商品...</p>';

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            allProducts = Array.isArray(data) ? data : [];
            renderProducts(allProducts);
        })
        .catch(err => {
            console.error("商品載入失敗:", err);
            if (grid) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red; padding: 40px;">❌ 商品載入失敗，請重新整理頁面</p>';
        });

    updateCart();

    // 2. 搜尋關鍵字過濾
    document.getElementById('product-search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = allProducts.filter(p => (p.name || '').toLowerCase().includes(term));
        renderProducts(filtered);
    });

    // 3. 結帳 modal 之付款與配送切換
    document.getElementById('payment-method')?.addEventListener('change', function() {
        const info = document.getElementById('transfer-info');
        if (info) info.style.display = (this.value === '銀行轉帳') ? 'block' : 'none';
    });

    document.getElementById('delivery-method')?.addEventListener('change', function() {
        const addrSec = document.getElementById('address-section');
        const storeSec = document.getElementById('store-section');
        if (this.value === '超商取貨') {
            if (addrSec) addrSec.style.display = 'none';
            if (storeSec) storeSec.style.display = 'block';
        } else {
            if (addrSec) addrSec.style.display = 'block';
            if (storeSec) storeSec.style.display = 'none';
        }
    });

    // 4. 下拉選單點擊自動收起
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', () => {
            const dropdownContent = link.closest('.dropdown-content');
            if (dropdownContent) {
                dropdownContent.style.display = 'none';
                setTimeout(() => { dropdownContent.style.display = ''; }, 300);
            }
            handleNavClick(); // 若在手機版點擊則一併收起側欄
        });
    });

    // 5. 綁定 Header 會員登入/登出按鈕
    const authBtn = document.getElementById("auth-btn");
    if (authBtn) {
        authBtn.onclick = () => window.handleAuth();
    }

    // 6. 監聽 Firebase 驗證狀態
    initFirebaseAuthListener();
});

// 捲動顯示 / 隱藏「回到頂部」按鈕
window.addEventListener('scroll', () => {
    const topBtn = document.getElementById('back-to-top');
    if (topBtn) {
        if (window.scrollY > 300) { 
            topBtn.classList.add('show'); 
        } else { 
            topBtn.classList.remove('show'); 
        }
    }
});

// 按下 Esc 鍵關閉所有彈窗並解除背景鎖定
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeProductModal();
        closeModal();
    }
});

/* ==========================================
   🛍️ 商品列表渲染邏輯
   ========================================== */
function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #5C3A00;">🔍 找不到相關商品</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const variants = p.variants ? p.variants.split(',').map(v => v.trim()) : [];
        const safeName = escapeQuotes(p.name);
        const variantHtml = variants.length > 0 ? `
            <select id="variant-${p.name.replace(/\s+/g, '-')}" class="variant-select">
                ${variants.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
        ` : '<div style="height: 46px; margin-bottom: 10px;"></div>'; 

        return `
            <div class="product">
                <div class="product-top" onclick="openProductModal('${safeName}')" style="cursor: pointer;">
                    <img src="${p.img || ''}" alt="${p.name}">
                    <h3>${p.name}</h3>
                </div>
                <div class="product-bottom">
                    ${variantHtml}
                    <p class="product-price">NT$${p.price}</p>
                    <button type="button" onclick="addToCartWithVariant('${safeName}', ${p.price})">🛒 加入購物車</button>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================
   🔍 商品放大顯示 Modal (點擊開啟時鎖定背景)
   ========================================== */
function openProductModal(productName) {
    const product = allProducts.find(p => p.name === productName);
    if (!product) return;

    let modal = document.getElementById('product-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'product-detail-modal';
        modal.className = 'p-modal-overlay';
        document.body.appendChild(modal);
    }

    const variants = product.variants ? product.variants.split(',').map(v => v.trim()) : [];
    const variantHtml = variants.length > 0 ? `
        <div style="margin-bottom: 15px;">
            <label style="font-weight:bold; display:block; margin-bottom:5px; color:#5C3A00;">選擇規格：</label>
            <select id="modal-variant-select" class="variant-select" style="width: 100%;">
                ${variants.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
        </div>
    ` : '';

    const description = product.desc || product.description || product.detail || '精選優質天然食材製作，給寶貝最安心無負擔的健康美味！';
    const safeName = escapeQuotes(product.name);

    modal.innerHTML = `
        <div class="p-modal-content">
            <span class="p-modal-close" onclick="closeProductModal()">&times;</span>
            <div class="p-modal-body">
                <div class="p-modal-img-box">
                    <img src="${product.img || ''}" alt="${product.name}">
                </div>
                <div class="p-modal-info-box">
                    <h2>${product.name}</h2>
                    <p class="p-modal-price">NT$${product.price}</p>
                    <p style="color: #666; font-size: 0.95rem; line-height: 1.6; margin: 5px 0 15px 0;">${description}</p>
                    ${variantHtml}
                    <button class="p-modal-cart-btn" onclick="addToCartFromModal('${safeName}', ${product.price})">🛒 加入購物車</button>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    lockBodyScroll(); // 🔒 鎖定背景滾動

    modal.onclick = (e) => {
        if (e.target === modal) closeProductModal();
    };
}

function closeProductModal() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        unlockBodyScroll(); // 🔓 解除背景滾動鎖定
    }
}

function addToCartFromModal(name, price) {
    const variantEl = document.getElementById('modal-variant-select');
    const selectedVariant = variantEl ? variantEl.value : "";
    const cartId = selectedVariant ? `${name} (${selectedVariant})` : name;
    
    let item = cart.find(i => i.cartId === cartId);
    if (item) {
        item.qty++;
    } else {
        cart.push({ cartId, name, variant: selectedVariant, price, qty: 1 });
    }
    
    saveAndUpdate();
    showToast(`✅ ${cartId} 已加入購物車！`);
    closeProductModal();
}

/* ==========================================
   🛒 購物車邏輯處理
   ========================================== */
function addToCartWithVariant(name, price) {
    const variantEl = document.getElementById(`variant-${name.replace(/\s+/g, '-')}`);
    const selectedVariant = variantEl ? variantEl.value : "";
    const cartId = selectedVariant ? `${name} (${selectedVariant})` : name;
    
    let item = cart.find(i => i.cartId === cartId);
    if (item) {
        item.qty++;
    } else {
        cart.push({ cartId, name, variant: selectedVariant, price, qty: 1 });
    }
    
    saveAndUpdate();
    showToast(`✅ ${cartId} 已加入購物車！`);
}

function updateCart() {
    const sidebar = document.getElementById("cart-sidebar");
    const countEl = document.getElementById("cart-count");
    if (!sidebar) return;

    let sum = cart.reduce((total, i) => total + (i.price * i.qty), 0);
    let qtyTotal = cart.reduce((total, i) => total + i.qty, 0);

    let itemsHtml = cart.map((item, index) => `
        <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px;">
            <div style="flex:1;">
                <b style="color:#5C3A00;">${item.name}</b><br>
                ${item.variant ? `<small style="color:#888;">規格: ${item.variant}</small><br>` : ''}
                <small style="color:#FF4500; font-weight:bold;">NT$${item.price}</small>
            </div>
            <div class="qty-control" style="display:flex; align-items:center;">
                <button type="button" onclick="changeQty(${index}, -1)" style="width:28px; height:28px; border:1px solid #ddd; background:#fff; border-radius:4px; cursor:pointer;">-</button>
                <span style="margin:0 10px; font-weight:bold;">${item.qty}</span>
                <button type="button" onclick="changeQty(${index}, 1)" style="width:28px; height:28px; border:1px solid #ddd; background:#fff; border-radius:4px; cursor:pointer;">+</button>
            </div>
        </div>`).join('');

    sidebar.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:10px; border-bottom:2px solid #FFD27F;">
            <h3 style="margin:0; color:#5C3A00;">🛒 購物清單</h3>
            <span onclick="toggleCart()" style="cursor:pointer; font-size:28px; color:#888;">&times;</span>
        </div>
        <div id="cart-items" style="max-height: 60vh; overflow-y: auto;">${itemsHtml || '<p style="text-align:center; color:gray; padding:30px 0;">車內空空的🐾</p>'}</div>
        <div class="cart-footer" style="margin-top:20px; border-top:2px solid #FFD27F; padding-top:15px;">
            <h4 style="text-align:right; margin-bottom:15px; color:#5C3A00;">總金額 <span style="color:#FF4500; font-size:1.3rem;">NT$${sum}</span></h4>
            <button type="button" onclick="clearCart()" style="width:100%; padding:10px; background:none; color:#888; border:1px solid #ddd; border-radius:8px; margin-bottom:10px; cursor:pointer;">清空購物車</button>
            <button type="button" onclick="checkout()" style="width:100%; padding:14px; background:#5C3A00; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size:1rem;">確認結帳</button>
        </div>
    `;

    if (countEl) countEl.innerText = qtyTotal;
}

function filterProducts(category) {
    backToShop(); 
    
    let filtered;
    let titleText = "🌟 所有商品";

    if (category === 'all') {
        filtered = allProducts;
        titleText = "🌟 所有商品";
    } 
    else if (category === 'hot') {
        filtered = allProducts.filter(p => p.hot === 'y' || p.hot === 'Y' || p.hot === 1 || p.hot === '1');
        if (filtered.length === 0) filtered = allProducts.slice(0, 8);
        titleText = "🔥 熱門商品";
    }
    else {
        filtered = allProducts.filter(p => {
            const productCat = (p.category || "").toLowerCase(); 
            const targetCat = category.toLowerCase();             
            return productCat === targetCat || productCat === 'all';
        });
        titleText = category === 'cat' ? "🐱 貓貓專區" : "🐶 狗狗專區";
    }

    const titleEl = document.getElementById('current-category-name');
    if (titleEl) titleEl.innerText = titleText;

    renderProducts(filtered);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
}

function changeQty(index, d) {
    if (!cart[index]) return;
    cart[index].qty += d;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveAndUpdate();
}

function clearCart() {
    if (cart.length > 0 && confirm("確定要清空購物車嗎？🐾")) {
        cart = [];
        saveAndUpdate();
    }
}

function toggleCart() { 
    document.getElementById("cart-sidebar")?.classList.toggle("open"); 
}

function showToast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
        t = document.createElement('div');
        t.id = "toast";
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.className = "show";
    setTimeout(() => { t.className = ""; }, 3000);
}

/* ==========================================
   💳 結帳 Modal 與表單發送 (同步開啟/關閉鎖定)
   ========================================== */
function checkout() {
    if (cart.length === 0) return alert("購物車內沒有商品喔！🐾");

    const auth = window.firebaseAuth || (typeof getAuth === 'function' ? getAuth() : null);
    const currentUser = auth ? auth.currentUser : null;

    if (!currentUser) {
        showToast("📢 請先登入會員才能結帳！");
        if (confirm("為了記錄您的訂單，結帳前請先登入 Google 帳號。\n現在要跳轉至登入頁面嗎？")) {
            if (typeof window.handleAuth === 'function') window.handleAuth();
        }
        return; 
    }

    const sidebar = document.getElementById("cart-sidebar");
    if (sidebar) sidebar.classList.remove("open");

    const modal = document.getElementById("checkout-modal");
    if (modal) {
        modal.style.display = "flex";
        lockBodyScroll(); // 🔒 鎖定背景滾動

        setTimeout(() => {
            const nameInput = document.getElementById("name");
            const emailInput = document.getElementById("email");
            if (nameInput) nameInput.value = currentUser.displayName || "";
            if (emailInput) emailInput.value = currentUser.email || "";
            
            const saved = localStorage.getItem(`profile_${currentUser.uid}`);
            if (saved) {
                try {
                    const profile = JSON.parse(saved);
                    if (document.getElementById("phone")) document.getElementById("phone").value = profile.phone || "";
                    if (document.getElementById("address")) document.getElementById("address").value = profile.address || "";
                    if (document.getElementById("store-info")) document.getElementById("store-info").value = profile.store || "";
                } catch (e) {
                    console.error("個人預設資料解析失敗:", e);
                }
            }
        }, 50);
    }
}

function closeModal() { 
    const modal = document.getElementById("checkout-modal");
    if (modal) {
        modal.style.display = "none"; 
        unlockBodyScroll(); // 🔓 解除背景滾動鎖定
    }
}

async function submitOrder() {
    if (isSubmitting) return;

    const orderUser = window.firebaseAuth?.currentUser; 
    const memberUid = orderUser ? orderUser.uid : "訪客";

    const name = document.getElementById("name")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const delivery = document.getElementById("delivery-method")?.value || "";
    const payment = document.getElementById("payment-method")?.value || "";
    const note = document.getElementById("order-note")?.value.trim() || "";
    const total_sum = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    
    const order_details_text = cart.map(item => {
        return item.variant ? `${item.name}(${item.variant}) x ${item.qty}` : `${item.name} x ${item.qty}`;
    }).join(", ");

    if (!name || !phone) return alert("❌ 請填寫姓名與電話");
    if (!/^09\d{8}$/.test(phone)) return alert("❌ 手機格式錯誤 (需為 09 開頭 10 碼數字)");

    let finalAddress = "";
    if (delivery === '超商取貨') {
        const storeVal = document.getElementById("store-info")?.value.trim() || "";
        finalAddress = "【超商】" + storeVal;
    } else {
        const addrVal = document.getElementById("address")?.value.trim() || "";
        finalAddress = "【宅配】" + addrVal;
    }

    isSubmitting = true;
    const btn = document.getElementById("submit-btn");
    if (btn) {
        btn.innerText = "🚀 訂單傳送中...";
        btn.disabled = true;
    }

    try {
        let currentOrderId = "無ID_" + new Date().getTime();

        // 1. 先寫入 Firebase Firestore
        if (orderUser && window.db && window.firestoreTools) {
            const docRef = await window.firestoreTools.addDoc(window.firestoreTools.collection(window.db, "orders"), {
                userId: orderUser.uid,
                userName: name || "",
                userEmail: email || "",
                details: order_details_text || "", 
                items: cart || [], 
                totalAmount: total_sum || 0, 
                total: `NT$${total_sum}`,
                address: finalAddress || "",
                deliveryMethod: delivery || "",
                paymentMethod: payment || "",
                status: "訂單處理中",
                createdAt: window.firestoreTools.serverTimestamp()
            });
            currentOrderId = docRef.id; 
            console.log("Firestore 建立成功，ID:", currentOrderId);
        }

        // 2. 同步傳送給 Google Apps Script
        const params = new URLSearchParams();
        params.append("orderId", currentOrderId);
        params.append("name", name);
        params.append("phone", phone);
        params.append("email", email);
        params.append("delivery_method", delivery);
        params.append("address", finalAddress);
        params.append("payment_method", payment);
        params.append("note", note);
        params.append("uid", memberUid);
        params.append("order_details", order_details_text);
        params.append("total_price", `NT$${total_sum}`);
        params.append("status", "訂單處理中");

        await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: params.toString(), 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            mode: 'no-cors' 
        });

        // 3. 儲存電話與地址供未來快速帶入
        if (orderUser) {
            const profile = {
                phone: phone,
                address: (delivery !== '超商取貨') ? (document.getElementById("address")?.value || "") : "",
                store: (delivery === '超商取貨') ? (document.getElementById("store-info")?.value || "") : ""
            };
            localStorage.setItem(`profile_${orderUser.uid}`, JSON.stringify(profile));
        }

        alert("🎉 訂單成功送出！");
        cart = [];
        saveAndUpdate();
        closeModal();
        document.getElementById('checkout-form')?.reset();
        window.location.reload(); 

    } catch (err) {
        console.error("訂單傳送失敗:", err);
        alert("❌ 訂單傳送失敗，請稍後再試或聯繫客服。");
    } finally {
        isSubmitting = false;
        if (btn) {
            btn.innerText = "🚀 確認送出訂單";
            btn.disabled = false;
        }
    }
}

/* ==========================================
   📱 手機版導覽側欄 (同步背景鎖定)
   ========================================== */
function toggleMenu() {
    const nav = document.getElementById('mobile-nav') || document.querySelector('.nav');
    const overlay = document.getElementById('nav-overlay');
    if (nav) {
        const isActive = nav.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active', isActive);
        
        if (isActive) {
            lockBodyScroll();
        } else {
            unlockBodyScroll();
        }
    }
}

function handleNavClick() {
    const nav = document.getElementById('mobile-nav') || document.querySelector('.nav');
    const overlay = document.getElementById('nav-overlay');
    if (nav && nav.classList.contains('active')) {
        nav.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        unlockBodyScroll();
    }
}

/* ==========================================
   👤 會員中心與訂單紀錄
   ========================================== */
function showMemberCenter() {
    const user = window.firebaseAuth?.currentUser;
    if (!user) {
        showToast("📢 請先登入會員喔！");
        if (window.handleAuth) window.handleAuth();
        return;
    }

    const shop = document.getElementById('shop');
    const about = document.getElementById('about-section');
    const member = document.getElementById('member-section');
    const hero = document.querySelector('.hero');

    if (shop) shop.style.display = 'none';
    if (about) about.style.display = 'none';
    if (hero) hero.style.display = 'none';
    if (member) member.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const nameEl = document.getElementById('profile-display-name');
    const emailEl = document.getElementById('profile-display-email');
    if (nameEl) nameEl.innerText = user.displayName || "未設定";
    if (emailEl) emailEl.innerText = user.email || "未設定";

    fetchUserOrders(user.uid);
}

function backToShop() {
    const shop = document.getElementById('shop');
    const about = document.getElementById('about-section');
    const member = document.getElementById('member-section');
    const hero = document.querySelector('.hero');

    if (shop) shop.style.display = 'block';
    if (about) about.style.display = 'block';
    if (hero) hero.style.display = 'block';
    if (member) member.style.display = 'none';
}

function switchMemberTab(tab) {
    const orderContent = document.getElementById('member-content-orders');
    const profileContent = document.getElementById('member-content-profile');
    const tabOrders = document.getElementById('tab-orders');
    const tabProfile = document.getElementById('tab-profile');

    if (!orderContent || !profileContent || !tabOrders || !tabProfile) return;

    if (tab === 'orders') {
        orderContent.style.display = 'block';
        profileContent.style.display = 'none';
        tabOrders.style.background = '#5C3A00'; tabOrders.style.color = 'white';
        tabProfile.style.background = 'white'; tabProfile.style.color = '#555';
    } else {
        orderContent.style.display = 'none';
        profileContent.style.display = 'block';
        tabProfile.style.background = '#5C3A00'; tabProfile.style.color = 'white';
        tabOrders.style.background = 'white'; tabOrders.style.color = '#555';
    }
}

async function fetchUserOrders(uid) {
    const container = document.getElementById('order-list-container');
    const emptyMsg = document.getElementById('order-list-empty');
    if (!container || !emptyMsg) return;
    
    container.innerHTML = ""; 
    emptyMsg.style.display = 'block';
    emptyMsg.innerText = "🐾 正在努力讀取您的訂單紀錄...";

    try {
        if (!window.firestoreTools || !window.db) {
            emptyMsg.innerText = "❌ 資料庫尚未準備就緒，請刷新後重試。";
            return;
        }

        const { query, collection, where, getDocs } = window.firestoreTools; 
        
        const q = query(
            collection(window.db, "orders"),
            where("userId", "==", uid)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            emptyMsg.innerText = "您目前還沒有訂單紀錄喔！趕快去逛逛吧 🐶";
            return;
        }

        emptyMsg.style.display = 'none';
        
        let orders = [];
        querySnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        orders.forEach((data) => {
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "處理中";
            const orderTotal = data.totalAmount ? `NT$ ${data.totalAmount}` : (data.total || "處理中");
            const orderDetails = data.details || (data.items ? data.items.map(i => `${i.name}(${i.variant || '單一規格'}) x ${i.qty}`).join(', ') : "無詳細資訊");

            const orderHtml = `
                <div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-left: 6px solid #FFD27F;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.8rem; color: #999;">📅 日期：${date}</span>
                        <span style="background: #FFF4E0; color: #D48806; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; border: 1px solid #FFE5B4;">
                            ${data.status || '訂單處理中'}
                        </span>
                    </div>
                    <div style="font-weight: bold; color: #5C3A00; font-size: 1rem; margin-bottom: 5px;">訂單編號：#${data.id.substring(0, 8).toUpperCase()}</div>
                    <div style="font-size: 0.95rem; color: #333; font-weight: bold;">總金額：<span style="color: #FF4500;">${orderTotal}</span></div>
                    <div style="font-size: 0.85rem; color: #666; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
                        📦 內容：${orderDetails}
                    </div>
                </div>
            `;
            container.innerHTML += orderHtml;
        });

    } catch (error) {
        console.error("讀取訂單失敗:", error);
        emptyMsg.innerText = "❌ 暫時無法讀取訂單，請稍後再試。";
    }
}

/* ==========================================
   🔐 Firebase 會員驗證
   ========================================== */
window.handleAuth = async function() {
    const auth = window.firebaseAuth || (typeof getAuth === 'function' ? getAuth() : null);
    
    if (!auth) {
        alert("❌ Firebase Auth 未成功初始化，請確認網頁中的 Firebase 設定！");
        return;
    }

    if (auth.currentUser) {
        if (confirm(`目前登入帳號：${auth.currentUser.displayName || auth.currentUser.email}\n要前往「會員中心」嗎？\n(按「取消」則執行登出)`)) {
            showMemberCenter();
        } else {
            try {
                if (window.firebaseTools?.signOut) {
                    await window.firebaseTools.signOut(auth);
                } else if (auth.signOut) {
                    await auth.signOut();
                }
                showToast("👋 已成功登出");
                backToShop();
            } catch (err) {
                console.error("登出失敗:", err);
                alert("登出發生錯誤：" + err.message);
            }
        }
    } else {
        try {
            let provider;
            if (window.firebaseTools?.GoogleAuthProvider) {
                provider = new window.firebaseTools.GoogleAuthProvider();
                await window.firebaseTools.signInWithPopup(auth, provider);
            } else if (window.firebase?.auth?.GoogleAuthProvider) {
                provider = new window.firebase.auth.GoogleAuthProvider();
                await auth.signInWithPopup(provider);
            } else if (typeof signInWithPopup === 'function') {
                const { GoogleAuthProvider } = window.firebaseTools || {};
                provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            }
            showToast("🎉 登入成功！");
        } catch (err) {
            console.error("登入失敗:", err);
            if (err.code !== 'auth/popup-closed-by-user') {
                alert("❌ 登入失敗: " + err.message);
            }
        }
    }
};

function updateAuthButtonUI(user) {
    const authBtn = document.getElementById("auth-btn");
    if (!authBtn) return;

    if (user) {
        const name = user.displayName ? user.displayName.split(" ")[0] : "會員";
        authBtn.innerText = `👤 ${name}`;
    } else {
        authBtn.innerText = "🔑 會員登入";
    }
}

function initFirebaseAuthListener() {
    const checkAuthTimer = setInterval(() => {
        if (window.firebaseAuth) {
            clearInterval(checkAuthTimer);
            
            const onAuth = window.firebaseTools?.onAuthStateChanged || window.firebaseAuth?.onAuthStateChanged;
            if (onAuth) {
                onAuth.call(window.firebaseTools ? window.firebaseTools : window.firebaseAuth, window.firebaseAuth, (user) => {
                    updateAuthButtonUI(user);
                });
            } else if (typeof window.firebaseAuth.onAuthStateChanged === 'function') {
                window.firebaseAuth.onAuthStateChanged((user) => {
                    updateAuthButtonUI(user);
                });
            }
        }
    }, 200);
}
