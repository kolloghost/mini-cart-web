import './style.css';

// 1. Available products
const products = [
  { id: 1, name: 'Headphones', price: 15000, emoji: '🎧' },
  { id: 2, name: 'Backpack', price: 12000, emoji: '🎒' },
  { id: 3, name: 'Sneakers', price: 25000, emoji: '👟' },
  { id: 4, name: 'Wristwatch', price: 18000, emoji: '⌚' },
];

// 2. The name used to store our cart in the browser
const STORAGE_KEY = 'ms-mini-shop-cart';

// 3. Find the page elements
const productList = document.querySelector('#product-list');
const cartItems = document.querySelector('#cart-items');
const cartCount = document.querySelector('#cart-count');
const cartTotal = document.querySelector('#cart-total');
const cartStatus = document.querySelector('#cart-status');

// Display storage problems without stopping the shop.
const storageNotice = document.createElement('p');
storageNotice.className =
  'mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900';
storageNotice.hidden = true;
storageNotice.setAttribute('role', 'status');
document.querySelector('#cart').append(storageNotice);

function showStorageNotice(message) {
  storageNotice.textContent = message;
  storageNotice.hidden = false;
}

// 4. Read the saved cart
function loadCart() {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEY);

    // On the first visit, there is nothing to load.
    if (savedCart === null) {
      return [];
    }

    const parsedCart = JSON.parse(savedCart);

    if (!Array.isArray(parsedCart)) {
      throw new Error('Saved cart must be an array.');
    }

    // Keep only valid products and quantities.
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
    console.warn('Could not load the saved cart:', error);

    showStorageNotice(
      'Your saved cart could not be loaded. Starting with an empty cart.'
    );

    return [];
  }
}

// Load existing items instead of always starting empty.
let cart = loadCart();

// 5. Save the current cart
function saveCart() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cart)
    );

    storageNotice.hidden = true;
  } catch (error) {
    console.warn('Could not save the cart:', error);

    showStorageNotice(
      'Your cart works, but this browser could not save it. Items may be lost after refreshing.'
    );
  }
}

// 6. Format prices
function formatPrice(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

// 7. Display products
function renderProducts() {
  productList.innerHTML = products
    .map((product) => {
      return `
        <article class="rounded-2xl bg-white p-5 shadow-sm">
          <div
            class="flex h-36 items-center justify-center rounded-xl bg-indigo-50 text-6xl"
            aria-hidden="true"
          >
            ${product.emoji}
          </div>

          <h3 class="mt-4 text-lg font-semibold">
            ${product.name}
          </h3>

          <p class="mt-1 font-medium text-slate-600">
            ${formatPrice(product.price)}
          </p>

          <button
            type="button"
            data-id="${product.id}"
            aria-label="Add ${product.name} to cart"
            class="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            Add to cart
          </button>
        </article>
      `;
    })
    .join('');
}

// 8. Save and redraw after a change
function updateCart(message) {
  saveCart();
  renderCart();
  cartStatus.textContent = message;
}

// 9. Add a product
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

// 10. Change quantity
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

  // Remove items whose quantity reaches zero.
  cart = cart.filter((item) => item.quantity > 0);

  updateCart('Cart quantity updated.');
}

// 11. Remove a product
function removeFromCart(productId) {
  cart = cart.filter(
    (item) => item.id !== productId
  );

  updateCart('Product removed from cart.');
}

// 12. Display cart contents and totals
function renderCart() {
  let totalQuantity = 0;
  let totalPrice = 0;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <li class="rounded-xl bg-slate-50 p-5 text-center text-slate-500">
        Your cart is empty. Add a product to get started.
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
          <li class="rounded-xl border border-slate-200 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-semibold">
                  ${product.name}
                </h3>

                <p class="mt-1 text-sm text-slate-500">
                  ${formatPrice(product.price)} each
                </p>
              </div>

              <button
                type="button"
                data-action="remove"
                data-id="${product.id}"
                aria-label="Remove ${product.name} from cart"
                class="rounded px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  data-action="decrease"
                  data-id="${product.id}"
                  aria-label="Decrease quantity of ${product.name}"
                  class="h-10 w-10 rounded-lg bg-slate-100 font-bold hover:bg-slate-200"
                >
                  −
                </button>

                <span class="min-w-5 text-center font-medium">
                  ${item.quantity}
                </span>

                <button
                  type="button"
                  data-action="increase"
                  data-id="${product.id}"
                  aria-label="Increase quantity of ${product.name}"
                  class="h-10 w-10 rounded-lg bg-slate-100 font-bold hover:bg-slate-200"
                >
                  +
                </button>
              </div>

              <p class="font-semibold">
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

// 13. Handle product button clicks
productList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');

  if (!button) return;

  addToCart(Number(button.dataset.id));
});

// 14. Handle cart button clicks
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

  // Rendering replaces the buttons.
  // Restore keyboard focus to the same control if it still exists.
  const replacementButton = cartItems.querySelector(
    `button[data-id="${productId}"][data-action="${action}"]`
  );

  if (replacementButton) {
    replacementButton.focus();
  } else {
    document.querySelector(
      `#product-list button[data-id="${productId}"]`
    )?.focus();
  }
});

// 15. Display the initial page
renderProducts();
renderCart();