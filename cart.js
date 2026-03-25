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
            if (grid) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red; padding: 40px;">❌ 商品載入失敗</p>';
        });

    updateCart();

    // 搜尋與介面連動
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
            addrSec.style.display = 'none';
            storeSec.style.display = 'block';
        } else {
            addrSec.style.display = 'block';
            storeSec.style.display = 'none';
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

    sidebar.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0;">🛒 購物清單</h3>
            <span onclick="toggleCart()" style="cursor:pointer; font-size:32px;">&times;</span>
        </div>
        <div id="cart-items" style="max-height: 60vh; overflow-y: auto;">
            ${cart.map((item, index) => `
                <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                    <div><b>${item.name}</b><br><small>NT$${item.price}</small></div>
                    <div>
                        <button onclick="changeQty(${index}, -1)">-</button>
                        <span style="margin:0 5px;">${item.qty}</span>
                        <button onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>`).join('') || '空空的🐾'}
        </div>
        <div class="cart-footer" style="margin-top:20px; border-top:2px solid #5C3A00; padding-top:15px;">
            <h4 style="text-align:right;">總金額 NT$${sum}</h4>
            <button onclick="checkout()" style="width:100%; padding:14px; background:#5C3A00; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">確認結帳</button>
        </div>
    `;
    if (countEl) countEl.innerText = qtyTotal;
}

function changeQty(index, d) {
    cart[index].qty += d;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveAndUpdate();
}

function saveAndUpdate() {
    localStorage.setItem('cherryEasonCart', JSON.stringify(cart));
    updateCart();
}

function toggleCart() { document.getElementById("cart-sidebar")?.classList.toggle("open"); }

function showToast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement('div'); t.id = "toast"; document.body.appendChild(t); }
    t.innerText = msg; t.className = "show";
    setTimeout(() => { t.className = ""; }, 3000);
}

function checkout() {
    if (!cart.length) return alert("購物車是空的喔！");
    toggleCart();
    document.getElementById("checkout-modal").style.display = "flex";
    const user = window.firebaseAuth?.currentUser;
    if (user) {
        document.getElementById("name").value = user.displayName || "";
        document.getElementById("email").value = user.email || "";
        const saved = localStorage.getItem(`profile_${user.uid}`);
        if (saved) {
            const p = JSON.parse(saved);
            document.getElementById("phone").value = p.phone || "";
            document.getElementById("address").value = p.address || "";
            document.getElementById("store-info").value = p.store || "";
        }
    }
}

function closeModal() { document.getElementById("checkout-modal").style.display = "none"; }

function submitOrder() {
    if (isSubmitting) return;

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const delivery = document.getElementById("delivery-method").value;
    const payment = document.getElementById("payment-method").value;
    const note = document.getElementById("order-note").value.trim();
    const sum = cart.reduce((total, i) => total + (i.price * i.qty), 0);
    const details = cart.map(item => `${item.name} x ${item.qty}`).join(", ");
    const user = window.firebaseAuth?.currentUser;

    if (!name || !phone || !email || !delivery || !payment) return alert("❌ 請填寫所有必要欄位（含收件、配送、付款方式）");
    if (!/^09\d{8}$/.test(phone)) return alert("❌ 手機格式不正確");

    let finalAddr = (delivery === '超商取貨') ? "【超商】" + document.getElementById("store-info").value : "【宅配】" + document.getElementById("address").value;

    isSubmitting = true;
    const btn = document.getElementById("submit-btn");
    btn.innerText = "⏳ 傳送中..."; btn.disabled = true;

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("address", finalAddr);
    formData.append("payment_method", payment);
    formData.append("order_details", details);
    formData.append("total_price", `NT$${sum}`);
    formData.append("note", note);
    formData.append("uid", user?.uid || "訪客");

    let firestorePromise = (user && window.db && window.firestoreTools) 
        ? window.firestoreTools.addDoc(window.firestoreTools.collection(window.db, "orders"), {
            userId: user.uid, userName: name, details: details, total: `NT$${sum}`, 
            paymentMethod: payment, address: finalAddr, createdAt: window.firestoreTools.serverTimestamp()
        }) : Promise.resolve();

    Promise.all([fetch(SCRIPT_URL, { method: 'POST', body: formData, mode: 'no-cors' }), firestorePromise])
    .then(() => {
        if (user) {
            localStorage.setItem(`profile_${user.uid}`, JSON.stringify({
                phone: phone, 
                address: (delivery !== '超商取貨') ? document.getElementById("address").value : "",
                store: (delivery === '超商取貨') ? document.getElementById("store-info").value : ""
            }));
        }
        alert("🎉 訂單成功送出！頁面即將刷新。");
        localStorage.removeItem('cherryEasonCart');
        window.location.reload(); 
    })
    .catch(err => { alert("❌ 送出失敗"); console.error(err); })
    .finally(() => { isSubmitting = false; });
}