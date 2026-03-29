const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydSZYr9RPcCN1PIRtzAvbddW1KOUYET7iWsNhll05L2-TpH5ZEHIqqa4o1fP8A7Zwx/exec';

let allProducts = []; 
let cart = JSON.parse(localStorage.getItem('cherryEasonCart')) || [];
let isSubmitting = false;

window.onload = () => {
    fetch(SCRIPT_URL).then(res => res.json()).then(data => {
        allProducts = data;
        renderProducts(allProducts);
    });
    updateCart();

    // 搜尋功能
    document.getElementById('product-search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
        renderProducts(filtered);
    });

    // 結帳欄位聯動
    document.getElementById('delivery-method')?.addEventListener('change', function() {
        document.getElementById('address-section').style.display = (this.value === '宅配/郵寄') ? 'block' : 'none';
        document.getElementById('store-section').style.display = (this.value === '超商取貨') ? 'block' : 'none';
    });
    document.getElementById('payment-method')?.addEventListener('change', function() {
        document.getElementById('transfer-info').style.display = (this.value === '銀行轉帳') ? 'block' : 'none';
    });

    // 監聽捲動回到頂部
    window.onscroll = () => {
        const b = document.getElementById('back-to-top');
        if (window.scrollY > 300) b.classList.add('show'); else b.classList.remove('show');
    };
};

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = products.map(p => {
        const variants = p.variants ? p.variants.split(',').map(v => v.trim()) : [];
        const variantHtml = variants.length > 0 ? 
            `<select id="variant-${p.name.replace(/\s+/g, '-')}" class="variant-select">
                ${variants.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>` : '<div style="height: 56px;"></div>';

        return `
            <div class="product">
                <img src="${p.img || ''}" alt="${p.name}">
                <h3>${p.name}</h3>
                <div class="product-bottom">
                    ${variantHtml}
                    <p class="product-price">NT$${p.price}</p>
                    <button onclick="addToCartWithVariant('${p.name}', ${p.price})">加入購物車</button>
                </div>
            </div>`;
    }).join('');
}

function addToCartWithVariant(name, price) {
    const variantEl = document.getElementById(`variant-${name.replace(/\s+/g, '-')}`);
    const selectedVariant = variantEl ? variantEl.value : "";
    const cartId = selectedVariant ? `${name} (${selectedVariant})` : name;
    
    let item = cart.find(i => i.cartId === cartId);
    if (item) { item.qty++; } else { cart.push({ cartId, name, variant: selectedVariant, price, qty: 1 }); }
    saveAndUpdate();
    showToast(`✅ ${cartId} 已加入購物車！`);
}

function updateCart() {
    const sidebar = document.getElementById("cart-sidebar");
    const countEl = document.getElementById("cart-count");
    if (!sidebar) return;

    let sum = cart.reduce((total, i) => total + (i.price * i.qty), 0);
    sidebar.innerHTML = `
        <div style="padding:20px; height:100%; position:relative; box-sizing: border-box;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px;">
                <h3 style="margin:0;">🛒 購物清單</h3>
                <span onclick="toggleCart()" style="cursor:pointer; font-size:24px;">&times;</span>
            </div>
            <div style="overflow-y:auto; height:calc(100% - 150px); padding-top:10px;">
                ${cart.map((item, index) => `
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:14px; align-items: center;">
                        <div>
                            <div style="font-weight:bold;">${item.name}</div>
                            <div style="color:#888;">${item.variant}</div>
                            <div style="color:#FF4500;">NT$${item.price} x ${item.qty}</div>
                        </div>
                        <div style="display: flex; gap: 5px; align-items: center;">
                            <button onclick="changeQty(${index}, -1)" style="border:1px solid #ddd; background:none; height:24px; width:24px; border-radius:50%; cursor: pointer;">-</button>
                            <button onclick="changeQty(${index}, 1)" style="border:1px solid #ddd; background:none; height:24px; width:24px; border-radius:50%; cursor: pointer;">+</button>
                        </div>
                    </div>
                `).join('') || '<p style="text-align:center; color:#999; margin-top:20px;">空空的喔🐾</p>'}
            </div>
            <div style="position:absolute; bottom:20px; left:20px; right:20px;">
                <p style="font-weight:bold; font-size:1.1rem; display: flex; justify-content: space-between;"><span>總計:</span> <span>NT$${sum}</span></p>
                <button onclick="checkout()" style="width:100%; padding:12px; background:#5C3A00; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">前往結帳</button>
            </div>
        </div>`;
    if (countEl) countEl.innerText = cart.reduce((total, i) => total + i.qty, 0);
}

function changeQty(index, d) {
    cart[index].qty += d;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveAndUpdate();
}

function saveAndUpdate() { localStorage.setItem('cherryEasonCart', JSON.stringify(cart)); updateCart(); }
function toggleCart() { document.getElementById("cart-sidebar").classList.toggle("open"); }
function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}

function filterProducts(category) {
    const names = { 'all': '🌟 所有商品', 'hot': '🔥 熱門商品', 'cat-treats': '🐱 貓貓零食', 'dog-treats': '🐶 狗狗零食', 'cat-supplies': '🐈 貓貓用品', 'dog-supplies': '🐕 狗狗用品', 'all-pets': '🐾 貓狗通用' };
    document.getElementById('current-category-name').innerText = names[category] || '🌟 商品列表';
    const filtered = (category === 'all') ? allProducts : allProducts.filter(p => p.category === category);
    renderProducts(filtered);
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}

function checkout() {
    if (!cart.length) return alert("購物車是空的喔！");
    toggleCart();
    document.getElementById("checkout-modal").style.display = "flex";
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

    if (!name || !phone || !email || !delivery || !payment) return alert("請填寫完整的必填資訊");

    isSubmitting = true;
    const btn = document.getElementById("submit-btn");
    btn.innerText = "⏳ 傳送中...";

    const finalAddress = (delivery === '超商取貨') ? "🏪 " + document.getElementById("store-info").value : "🏠 " + document.getElementById("address").value;
    const detailsText = cart.map(i => `${i.name}${i.variant ? '('+i.variant+')' : ''} x ${i.qty}`).join(", ");
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);

    const params = new URLSearchParams();
    params.append("name", name); params.append("phone", phone); params.append("email", email);
    params.append("delivery", delivery); params.append("payment", payment);
    params.append("address", finalAddress); params.append("note", note);
    params.append("details", detailsText); params.append("total", "NT$" + total);

    let firestorePromise = Promise.resolve();
    const user = window.firebaseAuth?.currentUser;
    if (user && window.db) {
        firestorePromise = window.firestoreTools.addDoc(window.firestoreTools.collection(window.db, "orders"), {
            userId: user.uid, userName: name, email: email, details: detailsText, total: "NT$" + total,
            address: finalAddress, delivery: delivery, payment: payment, note: note, createdAt: window.firestoreTools.serverTimestamp()
        });
    }

    Promise.all([
        fetch(SCRIPT_URL, { method: 'POST', body: params.toString(), mode: 'no-cors' }),
        firestorePromise
    ]).then(() => {
        alert("🎉 訂單已送出！感謝您的購買。");
        cart = []; saveAndUpdate(); closeModal(); window.location.reload();
    }).catch(err => alert("❌ 傳送失敗，請檢查網路")).finally(() => { isSubmitting = false; btn.innerText = "🚀 確認送出訂單"; });
}

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