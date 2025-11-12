// Initialize Stripe (guarded if not loaded on this page)
let stripe = null;
try {
    if (window && window.Stripe) {
        stripe = window.Stripe('your_publishable_key'); // Replace with your Stripe publishable key
    }
} catch (e) {
    // Safe no-op; stripe stays null
}

// Cart state (persisted)
let cart = { items: [], total: 0 };
try {
    const persisted = localStorage.getItem('cart');
    if (persisted) {
        const parsed = JSON.parse(persisted);
        if (parsed && Array.isArray(parsed.items) && typeof parsed.total === 'number') {
            cart = parsed;
        }
    }
} catch (e) {
    // ignore
}

// Collection prices
const prices = {
    classic: 1200,
    modern: 1800,
    luxury: 2500
};

// Deposit percentage
const DEPOSIT_PERCENTAGE = 0.3; // 30% deposit

// DOM Elements
const cartButton = document.getElementById('cart-button');
const cartModal = document.getElementById('cart-modal');
const modalContent = cartModal ? cartModal.querySelector('.modal-content') : null;
const closeButton = document.querySelector('.close');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const depositAmount = document.getElementById('deposit-amount');
const checkoutButton = document.getElementById('checkout-button');
const continueShopping = document.getElementById('continue-shopping');

// Add to cart buttons
document.querySelectorAll('[data-collection]').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const collection = button.dataset.collection;
        addToCart(collection);
        updateCartDisplay();
        openCartDrawer();
    });
});

// Drawer open/close
function openCartDrawer() {
    if (cartModal) {
        cartModal.style.display = 'block';
        requestAnimationFrame(() => {
            cartModal.classList.add('active');
            if (modalContent) modalContent.classList.add('open');
        });
        return;
    }
}

function closeCartDrawerFn() {
    if (cartModal) {
        cartModal.classList.remove('active');
        if (modalContent) modalContent.classList.remove('open');
        setTimeout(() => { if (cartModal) cartModal.style.display = 'none'; }, 300);
        return;
    }
}

if (closeButton) closeButton.addEventListener('click', closeCartDrawerFn);
window.addEventListener('click', (e) => { if (e.target === cartModal) closeCartDrawerFn(); });
if (continueShopping) continueShopping.addEventListener('click', (e) => { e.preventDefault(); closeCartDrawerFn(); });
if (cartButton) cartButton.addEventListener('click', (e) => { e.preventDefault(); openCartDrawer(); });

function persistCart() {
    try { localStorage.setItem('cart', JSON.stringify(cart)); } catch (e) { /* ignore */ }
}

// Add item to cart
function addToCart(collection) {
    const existingItem = cart.items.find(item => item.collection === collection);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.items.push({
            collection: collection,
            price: prices[collection],
            quantity: 1
        });
    }
    
    updateCartTotal();
    persistCart();
}

// Update cart total
function updateCartTotal() {
    cart.total = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
    persistCart();
}

// Update cart display
function updateCartDisplay() {
    // Update cart button
    const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cartButton.textContent = `Cart (${totalItems})`;

    // Update cart items
    cartItems.innerHTML = cart.items.map(item => `
        <div class="cart-item">
            <h4>${item.collection.charAt(0).toUpperCase() + item.collection.slice(1)} Collection</h4>
            <p>Quantity: ${item.quantity}</p>
            <p>Price: $${item.price}</p>
            <button onclick="removeFromCart('${item.collection}')">Remove</button>
        </div>
    `).join('');

    // Update totals
    cartTotal.textContent = cart.total;
    depositAmount.textContent = (cart.total * DEPOSIT_PERCENTAGE).toFixed(2);
}

// Remove item from cart
function removeFromCart(collection) {
    cart.items = cart.items.filter(item => item.collection !== collection);
    updateCartTotal();
    updateCartDisplay();
    persistCart();
}

// Checkout process
checkoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    persistCart();
    window.location.href = 'Checkout.html';
});

// Initialize UI on load
updateCartDisplay();