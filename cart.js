// ⚠️ 請務必確認這段網址與你 Google Apps Script 部署後的「網頁應用程式網址」完全一致
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydSZYr9RPcCN1PIRtzAvbddW1KOUYET7iWsNhll05L2-TpH5ZEHIqqa4o1fP8A7Zwx/exec';

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

// ✨ 修改：渲染商品卡片（加入對齊用的佔位符）
function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">🔍 找不到相關商品</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const variants = p.variants ? p.variants.split(',').map(v => v.trim()) : [];
        // ✨ 如果沒有規格，補一個隱形的 div 佔位 (高度 40px + margin 20px = 60px)
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
    if (!cart.length) return alert("購物車是空的喔！");
    toggleCart();
    document.getElementById("checkout-modal").style.display = "flex";

    setTimeout(() => {
        const orderUser = window.firebaseAuth?.currentUser; 
        if (orderUser) {
            if (document.getElementById("name")) document.getElementById("name").value = orderUser.displayName || "";
            if (document.getElementById("email")) document.getElementById("email").value = orderUser.email || "";
            const saved = localStorage.getItem(`profile_${orderUser.uid}`);
            if (saved) {
                const profile = JSON.parse(saved);
                if (document.getElementById("phone")) document.getElementById("phone").value = profile.phone || "";
                if (document.getElementById("address")) document.getElementById("address").value = profile.address || "";
                if (document.getElementById("store-info")) document.getElementById("store-info").value = profile.store || "";
            }
        }
    }, 100);
}

function closeModal() { document.getElementById("checkout-modal").style.display = "none"; }

function submitOrder() {
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

    const params = new URLSearchParams();
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

    let firestorePromise = Promise.resolve();
    if (orderUser && window.db && window.firestoreTools) {
        firestorePromise = window.firestoreTools.addDoc(window.firestoreTools.collection(window.db, "orders"), {
            userId: orderUser.uid,
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

    Promise.all([
        fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: params.toString(), 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            mode: 'no-cors' 
        }),
        firestorePromise
    ])
    .then(() => {
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
    })
    .catch(err => {
        console.error("傳送失敗:", err);
        alert("❌ 訂單傳送失敗");
    })
    .finally(() => {
        isSubmitting = false;
        btn.innerText = "🚀 確認送出訂單";
        btn.disabled = false;
    });
}

// ==========================================
// 🌟 介面優化與互動效果區
// ==========================================

// 1. 解決手機版「商品分類」下拉選單點擊後不會自動收合的問題
document.querySelectorAll('.dropdown-content a').forEach(link => {
    link.addEventListener('click', () => {
        const dropdownContent = link.closest('.dropdown-content');
        if (dropdownContent) {
            dropdownContent.style.display = 'none';
            setTimeout(() => {
                dropdownContent.style.display = '';
            }, 300);
        }
    });
});

// 2. 控制「回到最上方」按鈕的淡出與淡入
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

// ==========================================
// 🌟 手機側邊選單控制
// ==========================================
function toggleMenu() {
    const nav = document.getElementById('mobile-nav');
    const overlay = document.getElementById('nav-overlay');
    if (nav && overlay) {
        const isActive = nav.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = isActive ? 'hidden' : '';
    }
}

function handleNavClick() {
    if (window.innerWidth <= 480) { toggleMenu(); }
}