// ⚠️ 重要：請務必將此處替換為「部署」後取得的「網頁應用程式 URL」(結尾必須是 /exec)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5yI52vNUDdMxkY3Tkq4_opYQUWlK3nt15HnAR-OLLj1TDBeGe8K6bn8d-AW6Aec4Q/exec';

// 1. 商品資料庫
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
    // 1. 初始化顯示商品與購物車
    renderProducts(allProducts);
    updateCart();

    // 2. 搜尋功能邏輯
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase().trim();
            const filtered = allProducts.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.category.toLowerCase().includes(term)
            );
            renderProducts(filtered);
            
            const titleEl = document.getElementById('current-category-name');
            if (titleEl) {
                titleEl.innerText = term ? `🔍 正在搜尋：${term}` : '🌟 精選所有商品';
            }
        });
    }

    // 3. 監聽付款方式切換
    const paymentSelect = document.getElementById('payment-method');
    if (paymentSelect) {
        paymentSelect.addEventListener('change', function() {
            const info = document.getElementById('transfer-info');
            if (info) info.style.display = (this.value === '銀行轉帳') ? 'block' : 'none';
        });
    }

    // 4. 監聽取貨方式切換
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

    // 5. 監聽滾動事件，控制「回到最上層」按鈕顯示
    window.addEventListener('scroll', function() {
        const topBtn = document.getElementById('back-to-top');
        if (topBtn) {
            // 當往下滾動超過 300px 時顯示按鈕
            if (window.scrollY > 300) {
                topBtn.classList.add('show');
            } else {
                topBtn.classList.remove('show');
            }
        }
    });
}; 

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px; font-size: 1.1rem;">🔍 找不到相關商品，請嘗試其他關鍵字🐾</p>';
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

function filterProducts(category) {
    const filtered = (category === 'all') ? allProducts : allProducts.filter(p => p.category === category);
    renderProducts(filtered);
    const titleEl = document.getElementById('current-category-name');
    if (titleEl) titleEl.innerText = category === 'all' ? '🌟 精選所有商品' : '🐾 分類商品';
    
    // 錨點優化：只有在點擊「特定分類」時，才會強迫捲動到商品區
    // 若點擊「首頁」，則交由 HTML 錨點自動回到最上方
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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3 style="margin:0; color:#5C3A00;">🛒 購物清單</h3>
            <span onclick="toggleCart()" style="cursor:pointer; font-size:28px;">&times;</span>
        </div>
        ${cart.length > 0 ? '<button onclick="clearCart()" class="clear-cart-btn">🗑️ 清空購物車</button>' : ''}
        <div id="cart-items" style="flex:1; overflow-y:auto;">
            ${itemsHtml || '<p style="text-align:center; color:gray; margin-top:30px;">車內空空的🐾</p>'}
        </div>
        <div class="cart-footer" style="border-top:1px solid #eee; padding-top:15px;">
            <h4 style="text-align:right; color:#5C3A00; margin:0;">總金額 NT$${sum}</h4>
            <button onclick="checkout()" style="width:100%; padding:14px; background:#5C3A00; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold; margin-top:10px;">確認結帳</button>
        </div>
    `;
    if (countEl) countEl.innerText = qtyTotal;
}

// 補上清空邏輯
function clearCart() {
    if(confirm("確定要清空購物車嗎？")) {
        cart = [];
        saveAndUpdate();
        showToast("🗑️ 購物車已清空");
    }
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

document.addEventListener('submit', function(e) {
    if (e.target.id !== 'checkout-form') return;
    e.preventDefault();
    if (isSubmitting) return;

    const nameEl = document.getElementById("name");
    const phoneEl = document.getElementById("phone");
    const deliveryEl = document.getElementById("delivery-method");
    const paymentEl = document.getElementById("payment-method");
    
    if (!nameEl || !phoneEl || !deliveryEl || !paymentEl) {
        alert("系統錯誤：找不到必要的表單欄位");
        return;
    }

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const emailEl = document.getElementById("email");
    const email = emailEl ? emailEl.value.trim() : "未提供";
    const delivery = deliveryEl.value;
    const payment = paymentEl.value;
    const noteEl = document.getElementById("order-note");
    const note = noteEl ? noteEl.value.trim() : "無備註";

    let finalAddress = "";
    if (delivery === '超商取貨') {
        const storeInfoEl = document.getElementById("store-info");
        const store = storeInfoEl ? storeInfoEl.value.trim() : "";
        if (store.length < 2) return alert("❌ 請輸入超商門市名稱與店號");
        finalAddress = "【超商】" + store;
    } else {
        const addrEl = document.getElementById("address");
        const addr = addrEl ? addrEl.value.trim() : "";
        if (addr.length < 5) return alert("❌ 地址請輸入完整內容");
        finalAddress = "【宅配】" + addr;
    }

    if (name.length < 2) return alert("❌ 姓名請輸入至少 2 個字");
    if (!/^09\d{8}$/.test(phone)) return alert("❌ 手機格式錯誤");
    if (!payment) return alert("❌ 請選擇付款方式");

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
    formData.append("order_details", cart.map(item => `${item.name} x ${item.qty}`).join(", "));
    formData.append("total_price", `NT$${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}`);

    fetch(SCRIPT_URL, { method: 'POST', body: formData, mode: 'no-cors' })
    .then(() => {
        alert("🎉 訂單成功送出！\n我們將盡快為您處理。");
        cart = []; 
        saveAndUpdate(); 
        closeModal(); 
        e.target.reset();
        
        const info = document.getElementById('transfer-info');
        if (info) info.style.display = 'none';
        const addrSec = document.getElementById('address-section');
        if (addrSec) addrSec.style.display = 'none';
        const storeSec = document.getElementById('store-section');
        if (storeSec) storeSec.style.display = 'none';
    })
    .catch((err) => {
        console.error("傳送失敗:", err);
        alert("傳送失敗，請稍後再試。");
    })
    .finally(() => {
        isSubmitting = false;
        if (btn) {
            btn.innerText = "確認送出訂單";
            btn.disabled = false;
        }
    });
});