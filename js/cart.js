// Initialize Stripe
const stripe = Stripe('your_publishable_key'); // Replace with your Stripe publishable key

// Cart state
let cart = {
    items: [],
    total: 0
};

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
const closeButton = document.querySelector('.close');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const depositAmount = document.getElementById('deposit-amount');
const checkoutButton = document.getElementById('checkout-button');

// Add to cart buttons
document.querySelectorAll('.item-services__button').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const collection = button.dataset.collection;
        addToCart(collection);
        updateCartDisplay();
        cartModal.style.display = 'block';
    });
});

// Close modal
closeButton.addEventListener('click', () => {
    cartModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        cartModal.style.display = 'none';
    }
});

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
}

// Update cart total
function updateCartTotal() {
    cart.total = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
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
}

// Checkout process
checkoutButton.addEventListener('click', async () => {
    try {
        // Create a checkout session on your server
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: cart.items,
                deposit: cart.total * DEPOSIT_PERCENTAGE
            }),
        });

        const session = await response.json();

        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.id
        });

        if (result.error) {
            alert(result.error.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during checkout. Please try again.');
    }
}); 