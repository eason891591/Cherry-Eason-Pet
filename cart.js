const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxlA8uZohoD603SXnMMIqsGE3QF-yU9jj-GE_hqY5pRZYILgIknN3VWdCf2sfazqihk/exec';
let cart = JSON.parse(localStorage.getItem('cherryEasonCart')) || [];

window.onload = () => updateCart();

function toggleCart() { document.getElementById("cart-panel").classList.toggle("open"); }
document.getElementById("cart-icon").onclick = (e) => { e.stopPropagation(); toggleCart(); };

window.onclick = (event) => {
    const panel = document.getElementById("cart-panel");
    const icon = document.getElementById("cart-icon");
    if (panel.classList.contains("open") && !panel.contains(event.target) && !icon.contains(event.target)) {
        panel.classList.remove("open");
    }
};

// 搜尋功能
document.getElementById('product-search').addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    const products = document.querySelectorAll('.product');
    products.forEach(p => {
        const name = p.querySelector('h3').innerText.toLowerCase();
        p.style.display = name.includes(term) ? "block" : "none";
    });

    const grids = document.querySelectorAll('.product-grid');
    grids.forEach(grid => {
        const visible = Array.from(grid.querySelectorAll('.product')).filter(p => p.style.display !== 'none');
        const title = grid.previousElementSibling;
        grid.style.display = visible.length ? "flex" : "none";
        if (title && title.tagName === 'H2') title.style.display = visible.length ? "block" : "none";
    });
});

function addToCart(name, price) {
    let item = cart.find(i => i.name === name);
    item ? item.qty++ : cart.push({ name, price, qty: 1 });
    saveAndUpdate();
    showToast(`✅ ${name} 已加入！`);
}

function saveAndUpdate() {
    localStorage.setItem('cherryEasonCart', JSON.stringify(cart));
    updateCart();
}

function updateCart() {
    const itemsContainer = document.getElementById("cart-items");
    let sum = 0, qtyTotal = 0;
    itemsContainer.innerHTML = "";
    cart.forEach((item, index) => {
        sum += item.price * item.qty;
        qtyTotal += item.qty;
        itemsContainer.innerHTML += `
            <div class="cart-item">
                <div><b>${item.name}</b><br><small>NT$${item.price}</small></div>
                <div class="qty-control">
                    <button onclick="changeQty(${index}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)">+</button>
                </div>
            </div>`;
    });
    document.getElementById("cart-total").innerText = `總金額 NT$${sum}`;
    document.getElementById("cart-count").innerText = qtyTotal;
}

function changeQty(index, d) {
    cart[index].qty += d;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveAndUpdate();
}

function clearCart() { if(confirm("確定清空購物車？")) { cart = []; saveAndUpdate(); } }

function checkout() {
    if (!cart.length) return alert("購物車是空的");
    document.getElementById("cart-panel").classList.remove("open");
    document.getElementById("checkout-modal").style.display = "flex";
}

function closeModal() { document.getElementById("checkout-modal").style.display = "none"; }

document.getElementById("checkout-form").onsubmit = function(e) {
    e.preventDefault();
    const btn = document.getElementById("submit-btn");
    btn.innerText = "訂單送出中...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append("name", document.getElementById("name").value);
    formData.append("phone", document.getElementById("phone").value);
    formData.append("email", document.getElementById("email").value);
    formData.append("address", document.getElementById("address").value);
    formData.append("order_details", cart.map(item => `${item.name} x ${item.qty}`).join(", "));
    formData.append("total_price", `NT$${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}`);

    fetch(SCRIPT_URL, { method: 'POST', body: formData, mode: 'no-cors' })
    .then(() => {
        alert("🎉 訂單成功送出！謝謝您的訂購。");
        cart = []; saveAndUpdate(); closeModal(); e.target.reset();
    })
    .catch(() => alert("送出失敗，請檢查網路連線。"))
    .finally(() => { btn.innerText = "確認送出訂單"; btn.disabled = false; });
};

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2500);
}