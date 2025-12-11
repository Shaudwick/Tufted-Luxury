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

// Merchandise items
const merchandiseItems = {
    'quarter-zip': { name: 'Quarter Zip Pullover', price: 65, type: 'apparel' },
    'short-sleeve': { name: 'Short Sleeve T-Shirt', price: 45, type: 'apparel' },
    'long-sleeve': { name: 'Long Sleeve T-Shirt', price: 55, type: 'apparel' },
    'cap': { name: 'Baseball Cap', price: 35, type: 'accessory' },
    'mousepad': { name: 'Mouse Pad', price: 25, type: 'accessory' },
    'notebook': { name: 'Notebook', price: 20, type: 'accessory' }
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

// Add to cart buttons for collections
document.querySelectorAll('[data-collection]').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const collection = button.dataset.collection;
        addToCart(collection);
        updateCartDisplay();
        openCartDrawer();
    });
});

// Add to cart buttons for merchandise
document.querySelectorAll('[data-add-to-cart]').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = button.dataset.addToCart;
        addMerchandiseToCart(itemId);
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

// Add item to cart (collections)
function addToCart(collection) {
    const existingItem = cart.items.find(item => item.collection === collection && !item.itemId);
    
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

// Add merchandise item to cart
function addMerchandiseToCart(itemId) {
    const item = merchandiseItems[itemId];
    if (!item) return;
    
    const existingItem = cart.items.find(cartItem => cartItem.itemId === itemId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.items.push({
            itemId: itemId,
            name: item.name,
            price: item.price,
            type: item.type,
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
    cartItems.innerHTML = cart.items.map(item => {
        if (item.itemId) {
            // Merchandise item
            return `
                <div class="cart-item">
                    <h4>${item.name}</h4>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: $${item.price}</p>
                    <button onclick="removeFromCart('${item.itemId}', true)">Remove</button>
                </div>
            `;
        } else {
            // Collection item
            return `
                <div class="cart-item">
                    <h4>${item.collection.charAt(0).toUpperCase() + item.collection.slice(1)} Collection</h4>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: $${item.price}</p>
                    <button onclick="removeFromCart('${item.collection}', false)">Remove</button>
                </div>
            `;
        }
    }).join('');

    // Update totals
    cartTotal.textContent = cart.total;
    depositAmount.textContent = (cart.total * DEPOSIT_PERCENTAGE).toFixed(2);
}

// Remove item from cart
function removeFromCart(identifier, isMerchandise) {
    if (isMerchandise) {
        cart.items = cart.items.filter(item => item.itemId !== identifier);
    } else {
        cart.items = cart.items.filter(item => item.collection !== identifier);
    }
    updateCartTotal();
    updateCartDisplay();
    persistCart();
}

// Checkout process
if (checkoutButton) {
    checkoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        persistCart();
        window.location.href = 'Checkout.html';
    });
}

// Initialize UI on load
updateCartDisplay();