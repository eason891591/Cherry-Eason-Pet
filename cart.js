
let cart = [];

document.getElementById("cart-icon").onclick = function(){
document.getElementById("cart-panel").classList.toggle("open");
}

function addToCart(name, price){

let existing = cart.find(item => item.name === name);

if(existing){
existing.qty++;
}else{
cart.push({
name:name,
price:price,
qty:1
});
}

updateCart();
 showToast(`${name} 已加入購物車！`);

}

function updateCart(){

let items = document.getElementById("cart-items");
let total = document.getElementById("cart-total");
let count = document.getElementById("cart-count");

items.innerHTML="";

let sum = 0;
let qtyTotal = 0;

cart.forEach((item,index)=>{

let subtotal = item.price * item.qty;

sum += subtotal;
qtyTotal += item.qty;

items.innerHTML += `
<div class="cart-item">

<p>${item.name}</p>

<div class="qty-control">
<button onclick="decreaseQty(${index})">−</button>
<span>${item.qty}</span>
<button onclick="increaseQty(${index})">+</button>
</div>

<p>NT$${subtotal}</p>

</div>
`;

});

total.innerText = "總金額 NT$" + sum;
count.innerText = qtyTotal;

}

function increaseQty(index){
cart[index].qty++;
updateCart();
}

function decreaseQty(index){
cart[index].qty--;
if(cart[index].qty <= 0){
cart.splice(index,1);
}
updateCart();
}

function clearCart(){
cart = [];
updateCart();
}

function checkout(){

if(cart.length === 0){alert("購物車是空的");return;}
document.getElementById("checkout-modal").style.display="flex";
}
function closeModal(){ document.getElementById("checkout-modal").style.display="none"; }

document.getElementById("checkout-form").addEventListener("submit",function(e){
  e.preventDefault();
  const name=document.getElementById("name").value;
  const phone=document.getElementById("phone").value;
  const email=document.getElementById("email").value;
  const address=document.getElementById("address").value;
  const note=document.getElementById("note").value;
  const total=cart.reduce((sum,item)=>sum+item.price,0);
  alert(`謝謝您的訂單，${name}！\n總金額 NT$${total}\n我們會依您提供的資訊與您聯絡。`);
  clearCart(); closeModal(); document.getElementById("checkout-form").reset();
});

function showToast(msg){
  let toast=document.getElementById("toast");
  toast.innerText=msg; toast.style.opacity="1"; toast.style.transform="translateY(0px)";
  setTimeout(()=>{ toast.style.opacity="0"; toast.style.transform="translateY(20px)"; },2000);
}
