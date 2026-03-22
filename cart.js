const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5yI52vNUDdMxkY3Tkq4_opYQUWlK3nt15HnAR-OLLj1TDBeGe8K6bn8d-AW6Aec4Q/exec';

const allProducts = [
    { id: 1, category: 'cat-treats', name: '🐱 鮮肉凍乾', price: 280, img: 'https://picsum.photos/200?random=1' },
    { id: 2, category: 'cat-treats', name: '🐱 化毛肉泥', price: 65, img: 'https://picsum.photos/200?random=2' },
    { id: 3, category: 'dog-treats', name: '🐶 手作雞肉乾', price: 250, img: 'https://picsum.photos/200?random=3' },
    { id: 4, category: 'cat-supplies', name: '🐈 舒適貓窩', price: 850, img: 'https://picsum.photos/200?random=4' },
    { id: 5, category: 'dog-supplies', name: '🐕 防暴衝牽繩', price: 480, img: 'https://picsum.photos/200?random=5' },
    { id: 6, category: 'cat-treats', name: '🐱 鮮魚罐頭', price: 45, img: 'https://picsum.photos/200?random=6' },
    { id: 7, category: 'dog-treats', name: '🐶 耐咬牛皮骨', price: 190, img: 'https://picsum.photos/200?random=7' },
    { id: 10, category: 'cat-treats', name: '🐱 有機貓草', price: 120, img: 'https://picsum.photos/200?random=10' }
];

let cart = JSON.parse(localStorage.getItem('cherryEasonCart')) || [];
let isSubmitting = false;

window.onload = () => {
    renderProducts(allProducts);
    updateCart();

    // 搜尋功能
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase().trim();
            const filtered = allProducts.filter(p => 
                p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
            );
            renderProducts(filtered);
            const titleEl = document.getElementById('current-category-name');
            if (titleEl) titleEl.innerText = term ? `🔍 正在搜尋：${term}` : '🌟 精選所有商品';
        });
    }

    // 表單切換與滾動監聽保持原樣...
    const paymentSelect = document.getElementById('payment-method');
    if (paymentSelect) {
        paymentSelect.addEventListener('change', function() {
            const info = document.getElementById('transfer-info');
            if (info) info.style.display = (this.value === '銀行轉帳') ? 'block' : 'none';
        });
    }

    const deliverySelect = document.getElementById('delivery-method');
    if (deliverySelect) {
        deliverySelect.addEventListener('change', function() {
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
    }

    window.addEventListener('scroll', function() {
        const topBtn = document.getElementById('back-to-top');
        if (topBtn) {
            if (window.scrollY > 300) topBtn.classList.add('show');
            else topBtn.classList.remove('show');
        }
    });

    // 監聽表單提交
    const form = document.getElementById('checkout-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}; 

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">🔍 找不到商品🐾</p>';
        return;
    }
    grid.innerHTML = products.map(p => `
        <div class="product">
            <img src="${p.img}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p style="color: #FF4500; font-weight: bold;">NT$${p.price}</p>
            <button onclick="addToCart('${p.name}', ${p.price})">加入購物車</button>
        </div>
    `).join('');
}

// 🟢 優化分類與選中狀態
function filterProducts(category, element) {
    // 處理 CSS 選中狀態
    if (element) {
        document.querySelectorAll('.nav a, .dropdown-content a').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
        const dropbtn = document.querySelector('.dropbtn');
        if (element.closest('.dropdown-content')) dropbtn.classList.add('active');
        else dropbtn.classList.remove('active');
    }

    const filtered = (category === 'all') ? allProducts : allProducts.filter(p => p.category === category);
    renderProducts(filtered);
    
    const titleEl = document.getElementById('current-category-name');
    if (titleEl) titleEl.innerText = category === 'all' ? '🌟 精選所有商品' : '🐾 分類商品';
    
    if (category !== 'all') {
        const shop = document.getElementById('shop');
        if (shop) shop.scrollIntoView({ behavior: 'smooth' });
    }
}

function addToCart(name, price) {
    let item = cart.find(i => i.name === name);
    item ? item.qty++ : cart.push({ name, price, qty: 1 });
    saveAndUpdate();
    showToast(`✅ ${name} 已加入！`);
}

// 🗑️ 清空購物車功能
function clearCart() {
    if (confirm("確定要清空購物車嗎？🐾")) {
        cart = [];
        saveAndUpdate();
        showToast("🗑️ 購物車已清空");
    }
}

function updateCart() {
    const sidebar = document.getElementById("cart-sidebar");
    const countEl = document.getElementById("cart-count");
    if (!sidebar) return;

    let sum = 0, qtyTotal = 0;
    let itemsHtml = cart.map((item, index) => {
        sum += item.price * item.qty;
        qtyTotal += item.qty;
        return `
            <div class="cart-item">
                <div style="flex:1;"><b>${item.name}</b><br><small>NT$${item.price}</small></div>
                <div class="qty-control" style="display:flex; align-items:center;">
                    <button type="button" onclick="changeQty(${index}, -1)">-</button>
                    <span style="margin:0 10px; min-width:20px; text-align:center;">${item.qty}</span>
                    <button type="button" onclick="changeQty(${index}, 1)">+</button>
                </div>
            </div>`;
    }).join('');

    sidebar.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; color:#5C3A00; font-size: 1.4rem;">🛒 購物清單</h3>
            <span onclick="toggleCart()" style="cursor:pointer; font-size:32px; color:#5C3A00;">&times;</span>
        </div>
        <div id="cart-items">
            ${itemsHtml || '<p style="text-align:center; color:gray; margin-top:30px;">車內空空的🐾</p>'}
        </div>
        <div class="cart-footer">
            ${cart.length > 0 ? '<button class="clear-cart-btn" onclick="clearCart()">🗑️ 清空購物車</button>' : ''}
            <h4 style="text-align:right; color:#5C3A00; font-size: 1.2rem;">總金額 NT$${sum}</h4>
            <button onclick="checkout()" style="width:100%; padding:14px; background:#5C3A00; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold; font-size: 1.1rem; margin-top:10px;">確認結帳</button>
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

function toggleCart() {
    const panel = document.getElementById("cart-sidebar");
    if (panel) panel.classList.toggle("open");
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

function checkout() {
    if (!cart.length) return alert("購物車是空的");
    const modal = document.getElementById("checkout-modal");
    if (modal) {
        const sidebar = document.getElementById("cart-sidebar");
        if (sidebar) sidebar.classList.remove("open");
        modal.style.display = "flex";
    }
}

function closeModal() {
    const modal = document.getElementById("checkout-modal");
    if (modal) modal.style.display = "none";
}

// 處理表單提交
function handleFormSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email") ? document.getElementById("email").value.trim() : "未提供";
    const delivery = document.getElementById("delivery-method").value;
    const payment = document.getElementById("payment-method").value;
    const note = document.getElementById("order-note") ? document.getElementById("order-note").value.trim() : "無備註";

    let finalAddress = "";
    if (delivery === '超商取貨') {
        const store = document.getElementById("store-info") ? document.getElementById("store-info").value.trim() : "";
        if (store.length < 2) return alert("❌ 請輸入門市資訊");
        finalAddress = "【超商】" + store;
    } else {
        const addr = document.getElementById("address") ? document.getElementById("address").value.trim() : "";
        if (addr.length < 5) return alert("❌ 地址請輸入完整內容");
        finalAddress = "【宅配】" + addr;
    }

    if (!/^09\d{8}$/.test(phone)) return alert("❌ 手機格式錯誤");

    isSubmitting = true;
    const btn = document.getElementById("submit-btn");
    if (btn) { btn.innerText = "🚀 傳送中..."; btn.disabled = true; }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("delivery_method", delivery);
    formData.append("address", finalAddress);
    formData.append("payment_method", payment);
    formData.append("note", note);
    formData.append("order_details", cart.map(item => `${item.name} x ${item.qty}`).join(", "));
    formData.append("total_price", `NT$${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}`);

    fetch(SCRIPT_URL, { method: 'POST', body: formData, mode: 'no-cors' })
    .then(() => {
        alert("🎉 訂單成功送出！");
        cart = []; 
        saveAndUpdate(); 
        closeModal(); 
        e.target.reset();
    })
    .catch(() => alert("傳送失敗，請稍後再試。"))
    .finally(() => {
        isSubmitting = false;
        if (btn) { btn.innerText = "確認送出訂單"; btn.disabled = false; }
    });
}