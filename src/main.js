import './style.css';
import { products } from '../shared/products.js';
const STORAGE_KEY = 'ms-mini-shop-cart';

const productList = document.querySelector('#product-list');
const productCount = document.querySelector('#product-count');
const cartItems = document.querySelector('#cart-items');
const cartCount = document.querySelector('#cart-count');
const cartTotal = document.querySelector('#cart-total');
const cartStatus = document.querySelector('#cart-status');
const storageNotice = document.querySelector('#storage-notice');

function showStorageNotice(message) {
  storageNotice.textContent = message;
  storageNotice.hidden = false;
}

// Restore saved IDs and quantities.
function loadCart() {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEY);

    if (savedCart === null) return [];

    const parsedCart = JSON.parse(savedCart);

    if (!Array.isArray(parsedCart)) {
      throw new Error('Invalid saved cart.');
    }

    const validCart = [];

    for (const item of parsedCart) {
      if (!item || typeof item !== 'object') continue;

      const productExists = products.some(
        (product) => product.id === item.id
      );

      const validQuantity =
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 99;

      const alreadyAdded = validCart.some(
        (savedItem) => savedItem.id === item.id
      );

      if (productExists && validQuantity && !alreadyAdded) {
        validCart.push({
          id: item.id,
          quantity: item.quantity,
        });
      }
    }

    return validCart;
  } catch (error) {
    console.warn('Could not load cart:', error);

    showStorageNotice(
      'Your saved cart could not be loaded. Starting with an empty cart.'
    );

    return [];
  }
}

let cart = loadCart();

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    storageNotice.hidden = true;
  } catch (error) {
    console.warn('Could not save cart:', error);

    showStorageNotice(
      'Your browser could not save this cart. Items may be lost after refreshing.'
    );
  }
}

function formatPrice(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Product cards use our reusable CSS classes.
function renderProducts() {
  productCount.textContent = `${products.length} products`;

  productList.innerHTML = products
    .map((product) => {
      return `
        <article class="product-card">
          <div class="product-visual">
            <span class="product-category">
              ${product.category}
            </span>

            <span class="product-symbol" aria-hidden="true">
              ${product.emoji}
            </span>
          </div>

          <div class="p-5">
            <h3 class="text-lg font-semibold text-slate-900">
              ${product.name}
            </h3>

            <p class="mt-2 min-h-10 text-sm leading-5 text-slate-500">
              ${product.description}
            </p>

            <p class="mt-4 text-xl font-semibold tracking-tight text-slate-900">
              ${formatPrice(product.price)}
            </p>

            <button
              type="button"
              data-id="${product.id}"
              aria-label="Add ${product.name} to cart"
              class="primary-button mt-5"
            >
              <span aria-hidden="true">+</span>
              Add to cart
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderCart() {
  let totalQuantity = 0;
  let totalPrice = 0;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <li class="py-10 text-center">
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
          aria-hidden="true"
        >
          <svg
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M6 7h12l1 14H5L6 7Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
        </div>

        <p class="mt-4 text-sm font-semibold text-slate-700">
          Your cart is waiting
        </p>

        <p class="mt-2 text-xs leading-5 text-slate-500">
          Explore the collection and add your favourites.
        </p>
      </li>
    `;
  } else {
    cartItems.innerHTML = cart
      .map((item) => {
        const product = products.find(
          (product) => product.id === item.id
        );

        const itemTotal = product.price * item.quantity;

        totalQuantity += item.quantity;
        totalPrice += itemTotal;

        return `
          <li class="py-5">
            <div class="flex items-start gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl"
                aria-hidden="true"
              >
                ${product.emoji}
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-slate-900">
                  ${product.name}
                </h3>

                <p class="mt-1 text-xs text-slate-500">
                  ${formatPrice(product.price)} each
                </p>
              </div>

              <button
                type="button"
                data-action="remove"
                data-id="${product.id}"
                aria-label="Remove ${product.name} from cart"
                class="remove-button"
              >
                Remove
              </button>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  data-action="decrease"
                  data-id="${product.id}"
                  aria-label="Decrease quantity of ${product.name}"
                  class="quantity-button"
                >
                  −
                </button>

                <span class="min-w-6 text-center text-sm font-medium">
                  ${item.quantity}
                </span>

                <button
                  type="button"
                  data-action="increase"
                  data-id="${product.id}"
                  aria-label="Increase quantity of ${product.name}"
                  class="quantity-button"
                  ${item.quantity >= 99 ? 'disabled' : ''}
                >
                  +
                </button>
              </div>

              <p class="text-sm font-semibold text-slate-900">
                ${formatPrice(itemTotal)}
              </p>
            </div>
          </li>
        `;
      })
      .join('');
  }

  cartCount.textContent = totalQuantity;
  cartTotal.textContent = formatPrice(totalPrice);
}

function updateCart(message) {
  saveCart();
  renderCart();

  cartStatus.textContent =
    `${message} Cart total: ${cartTotal.textContent}.`;
}

function addToCart(productId) {
  const product = products.find(
    (product) => product.id === productId
  );

  if (!product) return;

  const existingItem = cart.find(
    (item) => item.id === productId
  );

  if (existingItem) {
    if (existingItem.quantity >= 99) {
      cartStatus.textContent = 'Maximum quantity is 99 per product.';
      return;
    }

    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      quantity: 1,
    });
  }

  updateCart(`${product.name} added to cart.`);
}

function changeQuantity(productId, change) {
  const item = cart.find(
    (item) => item.id === productId
  );

  if (!item) return;

  const newQuantity = item.quantity + change;

  if (newQuantity > 99) {
    cartStatus.textContent = 'Maximum quantity is 99 per product.';
    return;
  }

  item.quantity = newQuantity;
  cart = cart.filter((item) => item.quantity > 0);

  updateCart('Quantity updated.');
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  updateCart('Product removed.');
}

productList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');

  if (!button) return;

  addToCart(Number(button.dataset.id));
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');

  if (!button) return;

  const productId = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === 'increase') {
    changeQuantity(productId, 1);
  } else if (action === 'decrease') {
    changeQuantity(productId, -1);
  } else if (action === 'remove') {
    removeFromCart(productId);
  }

  // Keep keyboard navigation usable after the cart redraws.
  const replacement = cartItems.querySelector(
    `button[data-id="${productId}"][data-action="${action}"]`
  );

  const decreaseButton = cartItems.querySelector(
    `button[data-id="${productId}"][data-action="decrease"]`
  );

  const productButton = productList.querySelector(
    `button[data-id="${productId}"]`
  );

  if (replacement && !replacement.disabled) {
    replacement.focus();
  } else if (decreaseButton) {
    decreaseButton.focus();
  } else {
    productButton?.focus();
  }
});

renderProducts();
renderCart();

// Create the checkout form below the cart.
const checkoutForm = document.createElement('form');

checkoutForm.className =
  'mt-6 border-t border-slate-200 pt-5';

checkoutForm.innerHTML = `
  <p class="eyebrow">TEST CHECKOUT</p>

  <label
    for="checkout-email"
    class="mt-4 block text-sm font-medium text-slate-700"
  >
    Your email address
  </label>

  <input
    id="checkout-email"
    type="email"
    autocomplete="email"
    maxlength="254"
    required
    placeholder="you@example.com"
    class="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm"
  />

  <button
    id="checkout-button"
    type="submit"
    class="primary-button mt-4"
  >
    Continue to test payment
  </button>

  <p class="mt-3 text-xs leading-5 text-slate-500">
    Test mode only. No real money will be collected.
  </p>

  <p
    id="payment-message"
    class="mt-4 break-words text-sm leading-6 text-slate-700"
    role="status"
    tabindex="-1"
  ></p>
`;

document.querySelector('#cart').append(checkoutForm);

const checkoutButton = document.querySelector('#checkout-button');
const checkoutEmail = document.querySelector('#checkout-email');
const paymentMessage = document.querySelector('#payment-message');

// Read a JSON response and handle backend errors.
async function readPaymentResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      'Cannot reach the payment backend. Check that node server.js is running and the Vite proxy is configured.'
    );
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'The payment request failed.');
  }

  return result;
}

// Start a test payment.
checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (cart.length === 0) {
    paymentMessage.textContent =
      'Add at least one product before checking out.';
    return;
  }

  checkoutButton.disabled = true;
  checkoutButton.textContent = 'Opening checkout…';
  paymentMessage.textContent = '';

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: checkoutEmail.value.trim(),
        items: cart.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      }),
    });

    const result = await readPaymentResponse(response);

    // Only redirect to Paystack's hosted checkout.
    const checkoutUrl = new URL(result.checkoutUrl);

    if (
      checkoutUrl.protocol !== 'https:' ||
      checkoutUrl.hostname !== 'checkout.paystack.com'
    ) {
      throw new Error('The server returned an invalid checkout address.');
    }

    window.location.assign(checkoutUrl.href);
  } catch (error) {
    paymentMessage.textContent = error.message;
    checkoutButton.disabled = false;
    checkoutButton.textContent = 'Continue to test payment';
  }
});

// Verify payment after Paystack returns the customer to the shop.
async function verifyReturnedPayment() {
  const parameters = new URLSearchParams(window.location.search);
  const reference = parameters.get('reference');

  if (!reference) return;

  checkoutButton.disabled = true;
  paymentMessage.textContent = 'Checking your payment…';

  try {
    const response = await fetch(
      `/api/verify?reference=${encodeURIComponent(reference)}`
    );

    const result = await readPaymentResponse(response);

    if (result.paid) {
      paymentMessage.textContent =
        `Test payment verified: ${formatPrice(result.amount / 100)}. ` +
        `Reference: ${result.reference}. ` +
        'Your cart has been kept for further practice.';

      checkoutButton.textContent = 'Start another test payment';

      parameters.delete('reference');
      parameters.delete('trxref');

      const query = parameters.toString();

      window.history.replaceState(
        {},
        '',
        window.location.pathname +
          (query ? `?${query}` : '') +
          window.location.hash
      );
    } else {
      paymentMessage.textContent =
        `Payment not confirmed. Status: ${result.status}. ` +
        'Refresh to check again before attempting another payment.';
    }
  } catch (error) {
    paymentMessage.textContent =
      `${error.message} Refresh to retry verification before paying again.`;
  } finally {
    checkoutButton.disabled = false;
    paymentMessage.focus();
  }
}

verifyReturnedPayment();