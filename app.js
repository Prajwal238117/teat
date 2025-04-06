// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC3lkIqmIfDoVnF06oYzw-Wdy8mUpFkQqM",
    authDomain: "web12-82829.firebaseapp.com",
    projectId: "web12-82829",
    storageBucket: "web12-82829.firebasestorage.app",
    messagingSenderId: "621117920470",
    appId: "1:621117920470:web:07df4f2e5b28d3343ce577",
    measurementId: "G-1EVN90Z5DE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const productsGrid = document.querySelector('.products-grid');
const cartModal = document.getElementById('cart-modal');
const accountModal = document.getElementById('account-modal');
const productModal = document.getElementById('product-modal');
const cartItems = document.getElementById('cart-items');
const cartSubtotal = document.getElementById('cart-subtotal');
const shippingCost = document.getElementById('shipping-cost');
const cartTotal = document.getElementById('cart-total');
const cartCount = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const sortBySelect = document.getElementById('sort-by');
const priceRangeSelect = document.getElementById('price-range');
const brandFilterSelect = document.getElementById('brand-filter');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
const navbar = document.querySelector('.navbar');
const categoryCards = document.querySelectorAll('.category-card');
const closeModalButtons = document.querySelectorAll('.close-modal');
const tabButtons = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const accountBtn = document.getElementById('account-btn');
const cartBtn = document.getElementById('cart-btn');
const cartContainer = document.getElementById('cart-container');
const cartSummary = document.getElementById('cart-summary');

// State
let currentUser = null;
let cart = [];
let products = [];
let currentCategory = 'all';
let currentFilters = {
    search: '',
    sort: 'featured',
    priceRange: 'all'
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (productsGrid) {
        loadProducts();
    }
    setupEventListeners();
    checkAuthState();
});

// Setup Event Listeners
function setupEventListeners() {
    // Mobile Menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Search
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }
    
    // Filters
    if (sortBySelect) {
        sortBySelect.addEventListener('change', applyFilters);
    }
    if (priceRangeSelect) {
        priceRangeSelect.addEventListener('change', applyFilters);
    }
    if (brandFilterSelect) {
        brandFilterSelect.addEventListener('change', applyFilters);
    }
    
    // Category Cards
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            filterByCategory(category);
        });
    });
    
    // Cart
    const cartLink = document.querySelector('.cart-icon');
    if (cartLink) {
        cartLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'cart.html';
        });
    }
    
    // Account
    const accountLink = document.querySelector('a[href="#account"]');
    if (accountLink) {
        accountLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(accountModal);
        });
    }
    
    // Close Modals
    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Tab Switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Forms
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Scroll Events
    window.addEventListener('scroll', handleScroll);
    
    // Cart event listeners
    if (cartItems) {
        cartItems.addEventListener('click', async (e) => {
            const target = e.target;
            const itemId = target.dataset.id;
            
            if (target.classList.contains('btn-quantity')) {
                const action = target.dataset.action;
                await updateCartItemQuantity(itemId, action);
            } else if (target.classList.contains('btn-remove')) {
                await removeCartItem(itemId);
            }
        });
    }
}

// Handle Scroll
function handleScroll() {
    // Navbar scroll effect
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Animate elements on scroll
    const elements = document.querySelectorAll('.product-card, .category-card, .section-title');
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('animate__animated', 'animate__fadeInUp');
        }
    });
}

// Toggle Mobile Menu
function toggleMobileMenu() {
    mobileMenu.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    });
    
    // Close mobile menu when clicking a link
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        });
    });
}

// Handle Search
function handleSearch() {
    currentFilters.search = searchInput.value.trim().toLowerCase();
    applyFilters();
}

// Apply Filters
function applyFilters() {
    // Only apply sort if the element exists
    if (sortBySelect) {
        currentFilters.sort = sortBySelect.value;
    }
    
    // Only apply price range if the element exists
    if (priceRangeSelect) {
        currentFilters.priceRange = priceRangeSelect.value;
    }
    
    let filteredProducts = [...products];
    
    // Apply search filter if search input exists
    if (searchInput && currentFilters.search) {
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(currentFilters.search) ||
            product.description.toLowerCase().includes(currentFilters.search)
        );
    }
    
    // Apply category filter
    if (currentCategory !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.category === currentCategory
        );
    }
    
    // Apply price range filter if price range select exists
    if (priceRangeSelect && currentFilters.priceRange !== 'all') {
        const [min, max] = currentFilters.priceRange.split('-').map(Number);
        filteredProducts = filteredProducts.filter(product => {
            const price = product.variants && product.variants.length > 0 
                ? Math.min(...product.variants.map(v => v.price))
                : product.price;
            if (max) {
                return price >= min && price <= max;
            } else {
                return price >= min;
            }
        });
    }
    
    // Apply sorting if sort select exists
    if (sortBySelect) {
        switch (currentFilters.sort) {
            case 'price-low':
                filteredProducts.sort((a, b) => {
                    const priceA = a.variants && a.variants.length > 0 
                        ? Math.min(...a.variants.map(v => v.price))
                        : a.price;
                    const priceB = b.variants && b.variants.length > 0 
                        ? Math.min(...b.variants.map(v => v.price))
                        : b.price;
                    return priceA - priceB;
                });
                break;
            case 'price-high':
                filteredProducts.sort((a, b) => {
                    const priceA = a.variants && a.variants.length > 0 
                        ? Math.min(...a.variants.map(v => v.price))
                        : a.price;
                    const priceB = b.variants && b.variants.length > 0 
                        ? Math.min(...b.variants.map(v => v.price))
                        : b.price;
                    return priceB - priceA;
                });
                break;
            case 'newest':
                filteredProducts.sort((a, b) => b.timestamp - a.timestamp);
                break;
            default:
                // Featured - use default order
                break;
        }
    }
    
    displayProducts(filteredProducts);
}

// Filter by Category
function filterByCategory(category) {
    currentCategory = category;
    
    // Update active category
    categoryCards.forEach(card => {
        if (card.dataset.category === category) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    
    applyFilters();
}

// Load Products
async function loadProducts() {
    try {
        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(productsRef);
        products = [];
        
        snapshot.forEach(doc => {
            const product = doc.data();
            product.id = doc.id;
            products.push(product);
        });
        
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products. Please try again later.', 'error');
    }
}

// Display Products
function displayProducts(productsToDisplay) {
    if (!productsGrid) {
        console.warn('Products grid element not found in the DOM');
        return;
    }
    
    productsGrid.innerHTML = '';
    
    if (productsToDisplay.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search fa-3x"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search criteria</p>
            </div>
        `;
        return;
    }
    
    productsToDisplay.forEach(product => {
        const productElement = createProductCard(product);
        productsGrid.appendChild(productElement);
    });
}

// Create Product Card
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-image">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">Rs. ${product.price}</div>
            <button class="btn-primary" onclick="window.location.href='product.html?id=${product.id}'">View Details</button>
        </div>
    `;
    return card;
}

// Update addToCart function to handle variants
function addToCart(productId, name, price, quantity = 1, variants = null) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => 
        item.id === productId && 
        JSON.stringify(item.variants) === JSON.stringify(variants)
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: name,
            price: price,
            quantity: quantity,
            variants: variants
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    updateCartCount();
}

// Update updateCartUI function to display variants
function updateCartUI() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cartItems.innerHTML = '';
    
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        let variantText = '';
        if (item.variants) {
            variantText = `<div class="cart-item-variants">
                ${Object.entries(item.variants).map(([name, value]) => 
                    `<span>${name}: ${value}</span>`
                ).join('')}
            </div>`;
        }
        
        cartItem.innerHTML = `
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                ${variantText}
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="updateCartItemQuantity('${item.id}', ${item.quantity - 1}, ${JSON.stringify(item.variants)})">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1}, ${JSON.stringify(item.variants)})">+</button>
            </div>
            <div class="cart-item-total">$${itemTotal.toFixed(2)}</div>
            <button class="btn-remove" onclick="removeCartItem('${item.id}', ${JSON.stringify(item.variants)})">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        cartItems.appendChild(cartItem);
    });
    
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    const shipping = subtotal > 0 ? 10 : 0;
    shippingCost.textContent = `$${shipping.toFixed(2)}`;
    cartTotal.textContent = `$${(subtotal + shipping).toFixed(2)}`;
}

function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const item = cart.find(item => item.id === productId);

    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        updateCartCount();
    }
}

function setCartItemQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const item = cart.find(item => item.id === productId);

    if (item) {
        item.quantity = parseInt(newQuantity);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        updateCartCount();
    }
}

function removeCartItem(productId) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const updatedCart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    updateCartUI();
    updateCartCount();
}

// Modal Functions
function openModal(modal) {
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
}

// Tab Switching
function switchTab(tab) {
    // Update active tab button
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === `${tab}-tab`) {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    });
}

// Authentication
function checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProfile(user);
            updateUI(true);
        } else {
            currentUser = null;
            updateUI(false);
        }
    });
}

function updateUI(isLoggedIn) {
    if (accountBtn) {
        accountBtn.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    if (logoutBtn) {
        logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    if (loginForm) {
        loginForm.style.display = isLoggedIn ? 'none' : 'block';
    }
    
    if (registerForm) {
        registerForm.style.display = isLoggedIn ? 'none' : 'block';
    }
    
    if (cartContainer) {
        cartContainer.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    if (cartSummary) {
        cartSummary.style.display = isLoggedIn ? 'block' : 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('Logged in successfully', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('register-first-name').value;
    const lastName = document.getElementById('register-last-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user profile
        await setDoc(doc(db, 'users', user.uid), {
            firstName,
            lastName,
            email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        showNotification('Account created successfully', 'success');
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message, 'error');
    }
}

// Check if logoutBtn exists before adding event listener
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showNotification('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showNotification(error.message, 'error');
        }
    });
}

// Load user profile
async function loadUserProfile(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const userNameElement = document.getElementById('user-name');
            const userEmailElement = document.getElementById('user-email');
            
            if (userNameElement) {
                userNameElement.textContent = userData.firstName + ' ' + userData.lastName;
            }
            
            if (userEmailElement) {
                userEmailElement.textContent = user.email;
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showNotification('Error loading user profile', 'error');
    }
}

// Load cart
async function loadCart(userId) {
    try {
        const cartQuery = query(collection(db, 'carts'), where('userId', '==', userId));
        const cartSnapshot = await getDocs(cartQuery);
        
        if (!cartSnapshot.empty) {
            const cartDoc = cartSnapshot.docs[0];
            cart = cartDoc.data().items || [];
            updateCartUI();
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        showNotification('Error loading cart', 'error');
    }
}

// Checkout
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) {
            showNotification('Your cart is empty!', 'warning');
            return;
        }
        
        if (!currentUser) {
            showNotification('Please login to checkout', 'warning');
            openModal(accountModal);
            return;
        }
        
        try {
            const order = {
                userId: currentUser.uid,
                items: cart,
                subtotal: parseFloat(cartSubtotal.textContent),
                shipping: parseFloat(shippingCost.textContent),
                total: parseFloat(cartTotal.textContent),
                status: 'pending',
                createdAt: serverTimestamp()
            };
            
            await db.collection('orders').add(order);
            cart = [];
            updateCartUI();
            closeAllModals();
            showNotification('Order placed successfully!', 'success');
        } catch (error) {
            console.error('Error placing order:', error);
            showNotification('Error placing order. Please try again.', 'error');
        }
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize
async function init() {
    try {
        await checkAuthState();
        await loadProducts();
        
        // Add event listeners for cart buttons
        const addToCartButtons = document.querySelectorAll('.add-to-cart');
        if (addToCartButtons) {
            addToCartButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.dataset.productId;
                    const productName = e.target.dataset.productName;
                    const productPrice = parseFloat(e.target.dataset.productPrice);
                    addToCart(productId, productName, productPrice);
                });
            });
        }
        
        // Add event listeners for quantity buttons
        const quantityButtons = document.querySelectorAll('.quantity-btn');
        if (quantityButtons) {
            quantityButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.dataset.productId;
                    const action = e.target.dataset.action;
                    updateCartItemQuantity(productId, action);
                });
            });
        }
        
        // Add event listeners for remove buttons
        const removeButtons = document.querySelectorAll('.btn-remove');
        if (removeButtons) {
            removeButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.dataset.productId;
                    removeCartItem(productId);
                });
            });
        }
        
        // Add event listener for checkout button
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                // Implement checkout functionality
                showNotification('Checkout functionality coming soon!', 'info');
            });
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        showNotification('Error initializing application', 'error');
    }
} 