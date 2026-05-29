import * as THREE from 'three';
import gsap from 'gsap';
import { initThreeScene, transitionFlavor, updateSceneOnScroll } from './three-scene';
import { FLAVORS } from './content';
import './style.css'; // Vite automatically injects the styling

// State Management
let currentFlavor = FLAVORS.mango;
let cartQuantity = 1;
const activeToppings = new Set();
const TOPPING_PRICE = 3000;

// UI Elements DOM References
const appContainer = document.getElementById('app');
const canvasContainer = document.getElementById('canvas-container');

// Hero Content Elements
const flavorBadge = document.getElementById('flavor-badge');
const heroTitle = document.getElementById('hero-title');
const heroTitleSub = document.getElementById('hero-title-sub');
const heroDescription = document.getElementById('hero-description');
const heroPrice = document.getElementById('hero-price');

// Side Panels
const nutrCalories = document.getElementById('nutr-calories');
const nutrVitC = document.getElementById('nutr-vitc');
const nutrFiber = document.getElementById('nutr-fiber');
const nutrSugar = document.getElementById('nutr-sugar');
const benefitsList = document.getElementById('benefits-list');

// Flavor Buttons
const flavorButtons = document.querySelectorAll('.flavor-btn');

// Cart Drawer Elements
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const btnHeaderOrder = document.getElementById('btn-header-order');
const btnBuyNow = document.getElementById('btn-buy');
const btnCloseCart = document.getElementById('btn-close-cart');
const btnCheckout = document.getElementById('btn-checkout');

// Cart Item details
const cartItemEmoji = document.getElementById('cart-item-emoji');
const cartItemName = document.getElementById('cart-item-name');
const cartItemPrice = document.getElementById('cart-item-price');
const qtyValue = document.getElementById('qty-value');
const btnQtyMinus = document.getElementById('btn-qty-minus');
const btnQtyPlus = document.getElementById('btn-qty-plus');

// Calculation Labels
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryToppings = document.getElementById('summary-toppings');
const summaryTotal = document.getElementById('summary-total');
const toppingCheckboxes = document.querySelectorAll('.topping-checkbox');

/**
 * Helper to convert HEX to RGB string for CSS custom properties
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '255, 255, 255';
}

/**
 * Format raw numbers to premium Rupiah currency format
 */
function formatRupiah(value) {
  return 'Rp ' + value.toLocaleString('id-ID');
}

/**
 * Entrypoint: Initialize UI events and Three.js 3D View
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D Canvas
  if (canvasContainer) {
    initThreeScene(canvasContainer);
  }

  // 2. Set Initial CSS custom properties for background styling
  updateThemeColors(currentFlavor);

  // 3. Register Event Listeners
  initEventListeners();

  // 4. Register Scroll Event Listener for Parallax
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const fraction = Math.min(1.0, scrollY / vh);

    // Update Three.js positioning
    updateSceneOnScroll(fraction);

    // Highlights header navigation
    updateActiveNavOnScroll(scrollY, vh);
  });
});

/**
 * Register all interactive event click and change listeners
 */
function initEventListeners() {
  
  // Flavor Switcher Buttons
  flavorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const flavorId = btn.getAttribute('data-flavor');
      if (flavorId && FLAVORS[flavorId] && flavorId !== currentFlavor.id) {
        switchFlavor(flavorId);
      }
    });
  });

  // Cart Drawer open/close toggles
  btnHeaderOrder.addEventListener('click', openCart);
  btnBuyNow.addEventListener('click', openCart);
  btnCloseCart.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  // Cart Quantity Controls
  btnQtyPlus.addEventListener('click', () => {
    cartQuantity++;
    updateCartCalculations();
  });

  btnQtyMinus.addEventListener('click', () => {
    if (cartQuantity > 1) {
      cartQuantity--;
      updateCartCalculations();
    }
  });

  // Topping checkbox selections
  toppingCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const toppingId = e.target.id;
      if (e.target.checked) {
        activeToppings.add(toppingId);
      } else {
        activeToppings.delete(toppingId);
      }
      updateCartCalculations();
    });
  });

  // Checkout process simulation
  btnCheckout.addEventListener('click', handleCheckout);
}

/**
 * Orchestrates the full morphing transition when flavor changes
 */
function switchFlavor(flavorId) {
  const newFlavor = FLAVORS[flavorId];
  currentFlavor = newFlavor;

  // 1. Update active states on switcher buttons
  flavorButtons.forEach(btn => {
    if (btn.getAttribute('data-flavor') === flavorId) {
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
    }
  });

  // 2. Trigger Three.js scene morph and particle burst
  transitionFlavor(flavorId);

  // 3. Morph CSS variables on app container for smooth background gradient shifts
  updateThemeColors(newFlavor);

  // 4. Premium GSAP 2D UI slide & fade animations
  animateUIContent(newFlavor);

  // 5. Update active cart details
  updateCartItemDetails(newFlavor);
}

/**
 * Updates CSS Custom Properties for theme colors on the app-container
 */
function updateThemeColors(flavor) {
  appContainer.style.setProperty('--theme-color', flavor.colors.primary);
  appContainer.style.setProperty('--theme-color-rgb', hexToRgb(flavor.colors.primary));
  appContainer.style.setProperty('--bg-gradient-start', flavor.colors.bgGradientStart);
  appContainer.style.setProperty('--bg-gradient-end', flavor.colors.bgGradientEnd);
}

/**
 * GSAP animations for beautiful, cohesive text entries on flavor swap
 */
function animateUIContent(flavor) {
  const tl = gsap.timeline();

  // Elements to fade out
  const elementsToAnimate = [
    flavorBadge,
    heroTitle,
    heroDescription,
    heroPrice,
    nutrCalories.parentElement,
    nutrVitC.parentElement,
    nutrFiber.parentElement,
    nutrSugar.parentElement,
    benefitsList
  ];

  // Fade out old content
  tl.to(elementsToAnimate, {
    opacity: 0,
    y: -12,
    duration: 0.25,
    stagger: 0.02,
    ease: 'power2.in',
    onComplete: () => {
      // 1. Swap text content once fully faded
      flavorBadge.innerText = `100% Fresh Organic ${flavor.id === 'green' ? 'Veggie' : 'Fruit'}`;
      
      // Update title with sub tagline
      heroTitle.innerHTML = `${flavor.name} <span id="hero-title-sub">${flavor.tagline}</span>`;
      heroDescription.innerText = flavor.taglineSub;
      heroPrice.innerText = flavor.price;

      // Update Nutrition Stats
      nutrCalories.innerText = flavor.nutrition.calories;
      nutrVitC.innerText = flavor.nutrition.vitaminC;
      nutrFiber.innerText = flavor.nutrition.fiber;
      nutrSugar.innerText = flavor.nutrition.sugar;

      // Rebuild benefits list items
      benefitsList.innerHTML = flavor.benefits.map(benefit => `
        <li class="benefit-item" style="opacity:0; transform: translateY(12px)">
          <div class="benefit-icon">✓</div>
          <span>${benefit}</span>
        </li>
      `).join('');
    }
  });

  // Fade in new content with elastic bounce/slide in
  tl.to([
    flavorBadge,
    heroTitle,
    heroDescription,
    heroPrice,
    nutrCalories.parentElement,
    nutrVitC.parentElement,
    nutrFiber.parentElement,
    nutrSugar.parentElement
  ], {
    opacity: 1,
    y: 0,
    duration: 0.6,
    stagger: 0.04,
    ease: 'power2.out'
  });

  // Stagger animate inside the benefits list
  tl.to('#benefits-list .benefit-item', {
    opacity: 1,
    y: 0,
    duration: 0.4,
    stagger: 0.1,
    ease: 'power2.out'
  }, '-=0.3');
}

/**
 * Slide-in Cart Drawer
 */
function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  
  // Stagger entry animations on cart items
  gsap.from('.cart-item, .customizations-section, .cart-footer', {
    x: 40,
    opacity: 0,
    duration: 0.5,
    stagger: 0.1,
    ease: 'power2.out',
    delay: 0.1
  });
}

/**
 * Slide-out Cart Drawer
 */
function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
}

/**
 * Synchronize cart item visual properties based on chosen flavor
 */
function updateCartItemDetails(flavor) {
  let emoji = '🥭';
  if (flavor.id === 'berry') emoji = '🍓';
  if (flavor.id === 'green') emoji = '🥝';

  cartItemEmoji.innerText = emoji;
  cartItemName.innerText = flavor.name;
  
  // Format price
  cartItemPrice.innerText = flavor.price;

  // Re-run calculations
  updateCartCalculations();
}

/**
 * Calculate cost breakdown (Quantity * BasePrice + Toppings) and update labels
 */
function updateCartCalculations() {
  // Update qty label
  qtyValue.innerText = cartQuantity;

  // Parse numerical price (Rp 35.000 -> 35000)
  const basePriceNum = parseInt(currentFlavor.price.replace(/[^\d]/g, ''), 10);
  
  const subtotal = basePriceNum * cartQuantity;
  const toppingsCost = activeToppings.size * TOPPING_PRICE * cartQuantity;
  const total = subtotal + toppingsCost;

  // Render values
  summarySubtotal.innerText = formatRupiah(subtotal);
  summaryToppings.innerText = formatRupiah(toppingsCost);
  summaryTotal.innerText = formatRupiah(total);
}

/**
 * Simulate premium checkout confirmation with alert
 */
function handleCheckout() {
  const finalPrice = summaryTotal.innerText;
  
  // Visual success feedback
  const checkoutBtn = document.getElementById('btn-checkout');
  const originalText = checkoutBtn.innerHTML;
  
  checkoutBtn.innerHTML = 'Memproses... 🥤';
  checkoutBtn.disabled = true;

  setTimeout(() => {
    // Show a beautiful completion alert
    alert(`🎉 Pesanan Berhasil!\n\nProduk: ${cartQuantity}x ${currentFlavor.name}\nTotal Pembayaran: ${finalPrice}\n\nTerima kasih, jus segar berenergi tinggi Anda sedang kami racik di studio dapur terdekat! ✨`);

    // Reset checkout state
    checkoutBtn.innerHTML = originalText;
    checkoutBtn.disabled = false;
    
    // Reset cart inputs
    cartQuantity = 1;
    activeToppings.clear();
    toppingCheckboxes.forEach(cb => cb.checked = false);
    
    // Close Drawer
    closeCart();
    updateCartCalculations();
  }, 1200);
}

/**
 * Highlights the appropriate header navigation link based on current vertical scroll position
 */
function updateActiveNavOnScroll(scrollY, vh) {
  const threshold = 150; // offset in pixels
  const navLinks = {
    'nav-home': [0, vh - threshold],
    'nav-menu': [vh - threshold, vh * 2 - threshold],
    'nav-nutrition': [vh * 2 - threshold, vh * 3 - threshold],
    'nav-story': [vh * 3 - threshold, Infinity]
  };

  Object.entries(navLinks).forEach(([id, [start, end]]) => {
    const el = document.getElementById(id);
    if (el) {
      if (scrollY >= start && scrollY < end) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });
}
