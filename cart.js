// ⚠️ 請確保這段網址是你目前在 Google Apps Script「部署」後得到的最新網址
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwSBlTem0OOGlxXjaPyjmvh-raqqZtxM0sUNcYpygFCTgSIZH_aYSu0sXzC5GI88YR/exec';

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
            console.error("抓取失敗:", err);
            if (grid) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red; padding: 40px;">❌ 商品載入失敗，請檢查 Script URL</p>';
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
    grid.innerHTML = products.map(p => `
        <div class="product">
            <img src="${p.img || ''}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p style="color: #FF4500; font-weight: bold;">NT$${p.price}</p>
            <button onclick="addToCart('${p.name}', ${p.price})">加入購物車</button>
        </div>
    `).join('');
}

function filterProducts(category) {
    const filtered = (category === 'all') ? allProducts : allProducts.filter(p => p.category === category);
    renderProducts(filtered);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
}

function addToCart(name, price) {
    let item = cart.find(i => i.name === name);
    item ? item.qty++ : cart.push({ name, price, qty: 1 });
    saveAndUpdate();
    showToast(`✅ ${name} 已加入！`);
}

function updateCart() {
    const sidebar = document.getElementById("cart-sidebar");
    const countEl = document.getElementById("cart-count");
    if (!sidebar) return;

    let sum = cart.reduce((total, i) => total + (i.price * i.qty), 0);
    let qtyTotal = cart.reduce((total, i) => total + i.qty, 0);

    let itemsHtml = cart.map((item, index) => `
        <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px;">
            <div style="flex:1;"><b>${item.name}</b><br><small>NT$${item.price}</small></div>
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

function toggleCart() { document.getElementById("cart-sidebar")?.classList.toggle("open"); }

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
    if (!cart.length) return alert("購物車是空的喔！");
    toggleCart();
    const modal = document.getElementById("checkout-modal");
    if (modal) modal.style.display = "flex";

    setTimeout(() => {
        const user = window.firebaseAuth?.currentUser;
        if (user) {
            if (document.getElementById("name")) document.getElementById("name").value = user.displayName || "";
            if (document.getElementById("email")) document.getElementById("email").value = user.email || "";

            const saved = localStorage.getItem(`profile_${user.uid}`);
            if (saved) {
                const profile = JSON.parse(saved);
                if (document.getElementById("phone")) document.getElementById("phone").value = profile.phone || "";
                if (document.getElementById("address")) document.getElementById("address").value = profile.address || "";
                if (document.getElementById("store-info")) document.getElementById("store-info").value = profile.store || "";
            }
        }
    }, 200);
}

function closeModal() { document.getElementById("checkout-modal").style.display = "none"; }

function submitOrder() {
    if (isSubmitting) return;

    // 擷取表單資料
    const name = document.getElementById("name")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const delivery = document.getElementById("delivery-method")?.value || "";
    const payment = document.getElementById("payment-method")?.value || ""; // 付款方式
    const note = document.getElementById("order-note")?.value.trim() || "";
    const total_sum = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const order_details_text = cart.map(item => `${item.name} x ${item.qty}`).join(", ");

    const user = window.firebaseAuth?.currentUser;
    const memberUid = user?.uid || "訪客";

    // --- 🛑 第一階段：嚴格資料校驗 ---
    if (!name || !phone || !email) return alert("❌ 請完整填寫姓名、電話與電子郵件");
    if (!/^09\d{8}$/.test(phone)) return alert("❌ 手機格式不正確");
    if (!delivery) return alert("❌ 請選擇取貨方式");
    if (!payment) return alert("❌ 請選擇付款方式"); // 新增驗證邏輯

    let finalAddress = "";
    if (delivery === '超商取貨') {
        const store = document.getElementById("store-info")?.value.trim() || "";
        if (store.length < 2) return alert("❌ 請填寫完整的超商門市資訊");
        finalAddress = "【超商】" + store;
    } else {
        const addr = document.getElementById("address")?.value.trim() || "";
        if (addr.length < 5) return alert("❌ 請填寫完整的收件地址");
        finalAddress = "【宅配】" + addr;
    }

    // --- 🚀 第二階段：執行傳送 ---
    isSubmitting = true;
    const btn = document.getElementById("submit-btn");
    if (btn) {
        btn.innerText = "⏳ 處理中，請稍候...";
        btn.disabled = true;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("delivery_method", delivery);
    formData.append("address", finalAddress);
    formData.append("payment_method", payment);
    formData.append("note", note);
    formData.append("uid", memberUid);
    formData.append("order_details", order_details_text);
    formData.append("total_price", `NT$${total_sum}`);

    // 定義 Firestore 寫入 Promise
    let firestorePromise = Promise.resolve();
    if (user && window.db && window.firestoreTools) {
        console.log("正在備份訂單至 Firebase...");
        firestorePromise = window.firestoreTools.addDoc(window.firestoreTools.collection(window.db, "orders"), {
            userId: user.uid,
            userName: name,
            userEmail: email,
            details: order_details_text,
            total: `NT$${total_sum}`,
            address: finalAddress,
            deliveryMethod: delivery,
            paymentMethod: payment,
            status: "pending",
            createdAt: window.firestoreTools.serverTimestamp()
        });
    }

    // 同步執行所有任務
    Promise.all([
        fetch(SCRIPT_URL, { method: 'POST', body: formData, mode: 'no-cors' }),
        firestorePromise
    ])
    .then(() => {
        console.log("✅ 訂單同步成功");
        
        // 記憶會員資料
        if (user) {
            const profile = {
                phone: phone,
                address: (delivery !== '超商取貨') ? document.getElementById("address")?.value : "",
                store: (delivery === '超商取貨') ? document.getElementById("store-info")?.value : ""
            };
            localStorage.setItem(`profile_${user.uid}`, JSON.stringify(profile));
        }

        // --- 🎉 第三階段：完成提示與重整 ---
        alert("🎉 訂單已成功送出！\n頁面即將重新整理。");
        
        // 清空購物車狀態
        cart = []; 
        localStorage.removeItem('cherryEasonCart');
        
        // 核心修正：強制重新整理頁面以重置所有狀態
        window.location.reload(); 
    })
    .catch(err => {
        console.error("❌ 訂單傳送失敗:", err);
        alert("❌ 訂單傳送失敗，請稍後再試");
    })
    .finally(() => {
        isSubmitting = false;
        if (btn) {
            btn.innerText = "🚀 確認送出訂單";
            btn.disabled = false;
        }
    });
}