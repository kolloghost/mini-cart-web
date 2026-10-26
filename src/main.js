import './style.css';

// Product IDs stay the same so existing saved carts still work.
const products = [
  {
    id: 1,
    name: 'Headphones',
    price: 15000,
    emoji: '🎧',
    category: 'Audio',
    description: 'An accessory for your everyday listening.',
  },
  {
    id: 2,
    name: 'Backpack',
    price: 12000,
    emoji: '🎒',
    category: 'Bags',
    description: 'Keep your daily essentials together.',
  },
  {
    id: 3,
    name: 'Sneakers',
    price: 25000,
    emoji: '👟',
    category: 'Footwear',
    description: 'A casual addition to your wardrobe.',
  },
  {
    id: 4,
    name: 'Wristwatch',
    price: 18000,
    emoji: '⌚',
    category: 'Accessories',
    description: 'A finishing touch for your everyday look.',
  },
];

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