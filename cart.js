// ⚠️ 請確保這段網址是你目前在 Google Apps Script「部署」後得到的最新網址
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7k-eStIx1cNQ32IrxN4ENg3eVvcTzpJofOntSk4vAgBiApra3fxhYkhtUgAVrMP0J/exec';

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

// ✨ 修改 1：在打開結帳視窗的同時，把資料填進去
function checkout() {
    if (!cart.length) return alert("購物車是空的喔！");
    toggleCart();
    document.getElementById("checkout-modal").style.display = "flex";

    // 抓取會員狀態並自動填寫
    const user = window.firebaseAuth?.currentUser;
    if (user) {
        // 填入 Google 帳號的姓名與信箱
        if (document.getElementById("name")) document.getElementById("name").value = user.displayName || "";
        if (document.getElementById("email")) document.getElementById("email").value = user.email || "";

        // 去電腦記憶體找找看上次有沒有存過電話跟地址
        const savedProfile = localStorage.getItem(`profile_${user.uid}`);
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            if (document.getElementById("phone")) document.getElementById("phone").value = profile.phone || "";
            if (document.getElementById("address")) document.getElementById("address").value = profile.address || "";
            if (document.getElementById("store-info")) document.getElementById("store-info").value = profile.store || "";
        }
    }
}

function closeModal() { document.getElementById("checkout-modal").style.display = "none"; }

// ✨ 修改 2：送出訂單時，順便幫會員記住電話跟地址
function submitOrder() {
    if (isSubmitting) return;

    const name = document.getElementById("name")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const delivery = document.getElementById("delivery-method")?.value || "";
    const payment = document.getElementById("payment-method")?.value || "";
    const note = document.getElementById("order-note")?.value.trim() || "";

    // 獲取 Firebase 會員 UID
    const memberUid = window.firebaseAuth?.currentUser?.uid || "非會員/訪客";

    if (!name || !phone) return alert("❌ 請填寫姓名與電話");
    if (!/^09\d{8}$/.test(phone)) return alert("❌ 手機格式錯誤");
    if (!delivery) return alert("❌ 請選擇取貨方式");

    let finalAddress = "";
    if (delivery === '超商取貨') {
        const store = document.getElementById("store-info")?.value.trim() || "";
        if (store.length < 2) return alert("❌ 請填寫完整的超商門市名稱與店號");
        finalAddress = "【超商】" + store;
    } else {
        const addr = document.getElementById("address")?.value.trim() || "";
        if (addr.length < 5) return alert("❌ 請填寫完整的收件地址");
        finalAddress = "【宅配】" + addr;
    }

    isSubmitting = true;
    const btn = document.getElementById("submit-btn");
    if (btn) {
        btn.innerText = "🚀 訂單傳送中...";
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
    formData.append("order_details", cart.map(item => `${item.name} x ${item.qty}`).join(", "));
    formData.append("total_price", `NT$${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}`);

    fetch(SCRIPT_URL, { 
        method: 'POST', 
        body: formData, 
        mode: 'no-cors' 
    })
    .then(() => {
        // ✨ 新增：訂單成功後，如果是會員，把這次填的電話地址存進電腦
        const user = window.firebaseAuth?.currentUser;
        if (user) {
            const profile = {
                phone: phone,
                address: document.getElementById("address")?.value || "",
                store: document.getElementById("store-info")?.value || ""
            };
            localStorage.setItem(`profile_${user.uid}`, JSON.stringify(profile));
        }

        alert("🎉 訂單成功送出！\n我們將盡快為您處理。");
        cart = []; 
        saveAndUpdate();
        closeModal();
        document.getElementById('checkout-form')?.reset();
    })
    .catch(err => {
        console.error("傳送失敗:", err);
        alert("❌ 訂單傳送失敗，請檢查網路連線");
    })
    .finally(() => {
        isSubmitting = false;
        if (btn) {
            btn.innerText = "🚀 確認送出訂單";
            btn.disabled = false;
        }
    });
}