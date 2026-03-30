// ⚠️ 請務必確認這段網址與你 Google Apps Script 部署後的「網頁應用程式網址」完全一致
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbya0xz2GwNnXZz_xAP4BD-6TpScHazcjXRvnxPufqV-N7qQthCCj3sg6M4P1NMXwt6U/exec';

let allProducts = []; 
let cart = JSON.parse(localStorage.getItem('cherryEasonCart')) || [];
let isSubmitting = false;

window.onload = () => {
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">🐾 正在從雲端載入商品...</p>';

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            allProducts = data;
            renderProducts(allProducts);
        })
        .catch(err => {
            console.error("商品載入失敗:", err);
            if (grid) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red; padding: 40px;">❌ 商品載入失敗</p>';
        });

    updateCart();

    document.getElementById('product-search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
        renderProducts(filtered);
    });

    document.getElementById('payment-method')?.addEventListener('change', function() {
        const info = document.getElementById('transfer-info');
        if (info) info.style.display = (this.value === '銀行轉帳') ? 'block' : 'none';
    });

    document.getElementById('delivery-method')?.addEventListener('change', function() {
        const addrSec = document.getElementById('address-section');
        const storeSec = document.getElementById('store-section');
        if (this.value === '超商取貨') {
            if(addrSec) addrSec.style.display = 'none';
            if(storeSec) storeSec.style.display = 'block';
        } else {
            if(addrSec) addrSec.style.display = 'block';
            if(storeSec) storeSec.style.display = 'none';
        }
    });
};

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">🔍 找不到相關商品</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const variants = p.variants ? p.variants.split(',').map(v => v.trim()) : [];
        const variantHtml = variants.length > 0 ? `
            <select id="variant-${p.name.replace(/\s+/g, '-')}" class="variant-select">
                ${variants.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
        ` : '<div style="height: 60px;"></div>'; 

        return `
            <div class="product">
                <div class="product-top">
                    <img src="${p.img || ''}" alt="${p.name}">
                    <h3>${p.name}</h3>
                </div>
                <div class="product-bottom">
                    ${variantHtml}
                    <p class="product-price">NT$${p.price}</p>
                    <button onclick="addToCartWithVariant('${p.name}', ${p.price})">加入購物車</button>
                </div>
            </div>
        `;
    }).join('');
}

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
    showToast(`✅ ${cartId} 已加入！`);
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
                <b>${item.name}</b><br>
                ${item.variant ? `<small style="color:#888;">規格: ${item.variant}</small><br>` : ''}
                <small>NT$${item.price}</small>
            </div>
            <div class="qty-control">
                <button type="button" onclick="changeQty(${index}, -1)">-</button>
                <span style="margin:0 10px;">${item.qty}</span>
                <button type="button" onclick="changeQty(${index}, 1)">+</button>
            </div>
        </div>`).join('');

    sidebar.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0;">🛒 購物清單</h3>
            <span onclick="toggleCart()" style="cursor:pointer; font-size:32px;">&times;</span>
        </div>
        <div id="cart-items" style="max-height: 60vh; overflow-y: auto;">${itemsHtml || '<p style="text-align:center; color:gray; padding:20px;">車內空空的🐾</p>'}</div>
        <div class="cart-footer" style="margin-top:20px; border-top:2px solid #5C3A00; padding-top:15px;">
            <h4 style="text-align:right; margin-bottom:15px;">總金額 NT$${sum}</h4>
            <button type="button" onclick="clearCart()" style="width:100%; padding:8px; background:none; color:#888; border:1px solid #ddd; border-radius:8px; margin-bottom:10px; cursor:pointer;">清空購物車</button>
            <button type="button" onclick="checkout()" style="width:100%; padding:14px; background:#5C3A00; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">確認結帳</button>
        </div>
    `;
    if (countEl) countEl.innerText = qtyTotal;
}

function filterProducts(category) {
    const filtered = (category === 'all') ? allProducts : allProducts.filter(p => p.category === category);
    renderProducts(filtered);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
}

function changeQty(index, d) {
    cart[index].qty += d;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveAndUpdate();
}

function clearCart() {
    if (cart.length > 0 && confirm("確定要清空嗎？🐾")) {
        cart = [];
        saveAndUpdate();
    }
}

function saveAndUpdate() {
    localStorage.setItem('cherryEasonCart', JSON.stringify(cart));
    updateCart();
}

function toggleCart() { document.getElementById("cart-sidebar").classList.toggle("open"); }

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
        setTimeout(() => {
            const nameInput = document.getElementById("name");
            const emailInput = document.getElementById("email");
            if (nameInput) nameInput.value = currentUser.displayName || "";
            if (emailInput) emailInput.value = currentUser.email || "";
            
            const saved = localStorage.getItem(`profile_${currentUser.uid}`);
            if (saved) {
                const profile = JSON.parse(saved);
                if (document.getElementById("phone")) document.getElementById("phone").value = profile.phone || "";
                if (document.getElementById("address")) document.getElementById("address").value = profile.address || "";
                if (document.getElementById("store-info")) document.getElementById("store-info").value = profile.store || "";
            }
        }, 50);
    }
}
function closeModal() { document.getElementById("checkout-modal").style.display = "none"; }

// 🌟 改為 async 函式，以確保能按順序拿到 Firebase ID
async function submitOrder() {
    if (isSubmitting) return;

    const orderUser = window.firebaseAuth?.currentUser; 
    const memberUid = orderUser ? orderUser.uid : "訪客";

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const delivery = document.getElementById("delivery-method").value;
    const payment = document.getElementById("payment-method").value;
    const note = document.getElementById("order-note").value.trim();
    const total_sum = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    
    const order_details_text = cart.map(item => {
        return item.variant ? `${item.name}(${item.variant}) x ${item.qty}` : `${item.name} x ${item.qty}`;
    }).join(", ");

    if (!name || !phone) return alert("❌ 請填寫姓名與電話");
    if (!/^09\d{8}$/.test(phone)) return alert("❌ 手機格式錯誤");

    let finalAddress = "";
    if (delivery === '超商取貨') {
        finalAddress = "【超商】" + document.getElementById("store-info").value.trim();
    } else {
        finalAddress = "【宅配】" + document.getElementById("address").value.trim();
    }

    isSubmitting = true;
    const btn = document.getElementById("submit-btn");
    btn.innerText = "🚀 訂單傳送中...";
    btn.disabled = true;

    try {
        let currentOrderId = "無ID_" + new Date().getTime(); // 預設值

        // 1. 先將訂單存入 Firebase，並取得產生的 ID
        if (orderUser && window.db && window.firestoreTools) {
            const docRef = await window.firestoreTools.addDoc(window.firestoreTools.collection(window.db, "orders"), {
                userId: orderUser.uid,
                userName: name,
                userEmail: email,
                details: order_details_text, 
                items: cart, 
                totalAmount: total_sum, 
                total: `NT$${total_sum}`,
                address: finalAddress,
                deliveryMethod: delivery,
                paymentMethod: payment,
                status: "訂單處理中", // 🌟 統一初始狀態
                createdAt: window.firestoreTools.serverTimestamp()
            });
            currentOrderId = docRef.id; // 🌟 成功拿到 Firebase 的訂單 ID
        }

        // 2. 準備傳送給 Google Sheets 的資料
        const params = new URLSearchParams();
        params.append("orderId", currentOrderId); // 🌟 新增：傳送 ID
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
        params.append("status", "訂單處理中"); // 🌟 新增：傳送初始狀態

        // 3. 傳送到 Apps Script
        await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: params.toString(), 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            mode: 'no-cors' 
        });

        // 4. 儲存個人資訊供下次使用
        if (orderUser) {
            const profile = {
                phone: phone,
                address: (delivery !== '超商取貨') ? document.getElementById("address").value : "",
                store: (delivery === '超商取貨') ? document.getElementById("store-info").value : ""
            };
            localStorage.setItem(`profile_${orderUser.uid}`, JSON.stringify(profile));
        }

        alert("🎉 訂單成功送出！");
        cart = [];
        saveAndUpdate();
        closeModal();
        document.getElementById('checkout-form').reset();
        window.location.reload(); 

    } catch (err) {
        console.error("傳送失敗:", err);
        alert("❌ 訂單傳送失敗，請稍後再試");
    } finally {
        isSubmitting = false;
        btn.innerText = "🚀 確認送出訂單";
        btn.disabled = false;
    }
}
// 1. 解決手機版「商品分類」下拉選單點擊後不會自動收合的問題
document.querySelectorAll('.dropdown-content a').forEach(link => {
    link.addEventListener('click', () => {
        const dropdownContent = link.closest('.dropdown-content');
        if (dropdownContent) {
            dropdownContent.style.display = 'none';
            setTimeout(() => { dropdownContent.style.display = ''; }, 300);
        }
    });
});

window.addEventListener('scroll', () => {
    const topBtn = document.getElementById('back-to-top');
    if (topBtn) {
        if (window.scrollY > 300) { topBtn.classList.add('show'); } 
        else { topBtn.classList.remove('show'); }
    }
});

function toggleMenu() {
    const nav = document.getElementById('mobile-nav');
    const overlay = document.getElementById('nav-overlay');
    if (nav && overlay) {
        nav.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    }
}

function handleNavClick() {
    const nav = document.getElementById('mobile-nav');
    const overlay = document.getElementById('nav-overlay');
    if (nav && nav.classList.contains('active')) {
        nav.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ==========================================
// 👤 會員中心邏輯 (Member Center)
// ==========================================

function showMemberCenter() {
    const user = window.firebaseAuth?.currentUser;
    if (!user) {
        showToast("📢 請先登入會員喔！");
        if (window.handleAuth) window.handleAuth();
        return;
    }

    document.getElementById('shop').style.display = 'none';
    document.getElementById('about-section').style.display = 'none';
    document.getElementById('member-section').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('profile-display-name').innerText = user.displayName || "未設定";
    document.getElementById('profile-display-email').innerText = user.email || "未設定";

    fetchUserOrders(user.uid);
}

function backToShop() {
    document.getElementById('shop').style.display = 'block';
    document.getElementById('about-section').style.display = 'block';
    document.getElementById('member-section').style.display = 'none';
}

function switchMemberTab(tab) {
    const orderContent = document.getElementById('member-content-orders');
    const profileContent = document.getElementById('member-content-profile');
    const tabOrders = document.getElementById('tab-orders');
    const tabProfile = document.getElementById('tab-profile');

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

// 🌟 強化版：從 Firebase 抓取訂單並手動排序 (防報錯機制)
async function fetchUserOrders(uid) {
    const container = document.getElementById('order-list-container');
    const emptyMsg = document.getElementById('order-list-empty');
    
    container.innerHTML = ""; 
    emptyMsg.style.display = 'block';
    emptyMsg.innerText = "🐾 正在努力讀取您的訂單紀錄...";

    try {
        const { query, collection, where, getDocs } = window.firestoreTools; 
        
        // 拿掉 orderBy 避免需要額外設定索引
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
        
        // 轉為陣列並進行手動排序（最新訂單在上）
        let orders = [];
        querySnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        // 渲染訂單卡片
        orders.forEach((data) => {
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "處理中";
            
            // 兼容舊格式與新格式
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