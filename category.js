// Import Firebase modules
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

console.log('Category.js loaded');

// DOM Elements
const productsGrid = document.querySelector('.products-grid');
const categoryTitle = document.getElementById('category-title');
const categoryDescription = document.getElementById('category-description');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const sortBySelect = document.getElementById('sort-by');
const priceRangeSelect = document.getElementById('price-range');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
const productModal = document.getElementById('product-modal');
const closeModalBtn = document.querySelector('.close-modal');
const cartCount = document.getElementById('cart-count');

// State
let currentUser = null;
let products = [];
let currentCategory = '';
let currentFilters = {
    search: '',
    sort: 'featured',
    priceRange: 'all'
};

// Get category from URL parameters
function getCategoryFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('category') || '';
}

// Initialize the category page
async function initializeCategoryPage() {
    console.log('Initializing category page...');
    try {
        // Check authentication state
        onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            if (user) {
                currentUser = user;
                updateCartCount();
            }
        });

        // Get category from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const categorySlug = urlParams.get('category');
        console.log('Category from URL:', categorySlug);
        
        if (!categorySlug) {
            showNotification('No category specified', 'error');
            return;
        }

        // Map category slugs to display names
        const categoryDisplayNames = {
            'mobile-games': 'Mobile Games',
            'pc-games': 'PC Games',
            'console-games': 'Console Games',
            'gift-cards': 'Gift Cards'
        };

        // Get the display name for the category
        const categoryDisplayName = categoryDisplayNames[categorySlug] || categorySlug;

        // Set category title and description
        categoryTitle.textContent = categoryDisplayName;
        categoryDescription.textContent = `Browse all ${categoryDisplayName} products`;
        document.title = `${categoryDisplayName} - Nepal Top-Up`;

        // Load products for this category
        await loadProducts(categorySlug);
        
        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing category page:', error);
        showNotification('Error loading category page', 'error');
    }
}

// Update category info
function updateCategoryInfo() {
    // Capitalize first letter of each word
    const formattedCategory = currentCategory
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    categoryTitle.textContent = formattedCategory;
    categoryDescription.textContent = `Browse all ${formattedCategory} products`;
    document.title = `${formattedCategory} - Nepal Top-Up`;
}

// Load products for the category
async function loadProducts(category) {
    console.log('Loading products for category:', category);
    try {
        // First, let's check if we can access the products collection
        const productsRef = collection(db, 'products');
        console.log('Products collection reference created');

        // Convert category slug to display format
        const categoryDisplayName = category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Create the query
        const productsQuery = query(
            productsRef,
            where('category', '==', categoryDisplayName)
        );
        console.log('Query created with category filter:', categoryDisplayName);

        // Execute the query
        console.log('Executing Firestore query...');
        const productsSnapshot = await getDocs(productsQuery);
        console.log('Query completed. Number of products found:', productsSnapshot.size);
        
        if (productsSnapshot.empty) {
            console.log('No products found for category:', category);
            productsGrid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No products found</h3>
                    <p>No products available in this category yet.</p>
                </div>
            `;
            return;
        }

        products = [];
        productsSnapshot.forEach(doc => {
            const productData = doc.data();
            console.log('Product data:', {
                id: doc.id,
                name: productData.name,
                category: productData.category,
                price: productData.price
            });
            products.push({
                id: doc.id,
                ...productData
            });
        });
        
        console.log('Total products loaded:', products.length);
        
        // Apply any active filters
        applyFilters();
    } catch (error) {
        console.error('Error loading products:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        showNotification('Error loading products: ' + error.message, 'error');
    }
}

// Apply filters to products
function applyFilters() {
    let filteredProducts = [...products];
    
    // Apply search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply price range filter
    if (currentFilters.priceRange !== 'all') {
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
    
    // Apply sorting
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
    
    displayProducts(filteredProducts);
}

// Display products in the grid
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
        const productElement = createProductElement(product);
        productsGrid.appendChild(productElement);
    });
}

// Create product element
function createProductElement(product) {
    const div = document.createElement('div');
    div.className = 'product-card animate__animated animate__fadeIn';
    
    // Get the base price or first variant price
    const basePrice = product.variants && product.variants.length > 0
        ? Math.min(...product.variants.map(v => v.price))
        : product.price;
    
    div.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-image">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-price">From Rs. ${basePrice.toFixed(2)}</p>
            <button class="btn-primary view-product-btn" data-product-id="${product.id}">
                View Details
            </button>
        </div>
    `;
    
    // Add event listener to the view details button
    const viewBtn = div.querySelector('.view-product-btn');
    viewBtn.addEventListener('click', () => {
        openProductModal(product.id);
    });
    
    return div;
}

// Open product modal
function openProductModal(productId) {
    // Redirect to product page instead of opening a modal
    window.location.href = `product.html?id=${productId}`;
}

// Add to cart function
window.addToCart = function(productId, name, price, variantName) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const quantity = parseInt(document.getElementById('product-quantity').value) || 1;
    
    const existingItem = cart.find(item => 
        item.id === productId && 
        item.variantName === variantName
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: name,
            price: price,
            quantity: quantity,
            variantName: variantName
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification(`${name} added to cart`, 'success');
    closeModal(productModal);
};

// Update cart count
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
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
        sortBySelect.addEventListener('change', () => {
            currentFilters.sort = sortBySelect.value;
            applyFilters();
        });
    }
    if (priceRangeSelect) {
        priceRangeSelect.addEventListener('change', () => {
            currentFilters.priceRange = priceRangeSelect.value;
            applyFilters();
        });
    }
    
    // Close modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            closeModal(productModal);
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeModal(productModal);
        }
    });
    
    // Quantity buttons
    const decreaseBtn = document.getElementById('decrease-quantity');
    const increaseBtn = document.getElementById('increase-quantity');
    const quantityInput = document.getElementById('product-quantity');
    
    if (decreaseBtn && quantityInput) {
        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
    }
    
    if (increaseBtn && quantityInput) {
        increaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            quantityInput.value = currentValue + 1;
        });
    }
}

// Handle search
function handleSearch() {
    currentFilters.search = searchInput.value.trim().toLowerCase();
    applyFilters();
}

// Modal functions
function openModal(modal) {
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Notification system
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

// Initialize the category page when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    initializeCategoryPage();
}); 