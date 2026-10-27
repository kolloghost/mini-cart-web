import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { products } from './shared/products.js';

const app = express();
const PORT = 3001;
const FRONTEND_URL = 'http://localhost:5173';
const secretKey = process.env.PAYSTACK_SECRET_KEY;

// This learning version deliberately accepts test keys only.
if (!secretKey?.startsWith('sk_test_')) {
  console.error(
    'Add a valid Paystack TEST secret key to .env before starting.'
  );
  process.exit(1);
}

app.use(express.json({ limit: '10kb' }));

// Temporary order storage for local learning.
// Restarting this server removes these orders.
const orders = new Map();

// Send requests to Paystack from the backend only.
async function paystackRequest(path, body) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });

  const result = await response.json();

  if (!response.ok || !result.status) {
    throw new Error('Payment provider request failed.');
  }

  return result.data;
}

// Create an order and obtain its hosted checkout URL.
app.post('/api/checkout', async (req, res) => {
  // Our local browser frontend must be the request origin.
  if (req.get('origin') !== FRONTEND_URL) {
    return res.status(403).json({
      error: 'Open the shop at http://localhost:5173.',
    });
  }

  const { email, items } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      error: 'Enter a valid email address.',
    });
  }

  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > products.length
  ) {
    return res.status(400).json({
      error: 'Your cart is empty or invalid.',
    });
  }

  let amount = 0;
  const seenIds = new Set();
  const orderItems = [];

  for (const item of items) {
    const product = products.find(
      (product) => product.id === item?.id
    );

    if (
      !product ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99 ||
      seenIds.has(item.id)
    ) {
      return res.status(400).json({
        error: 'The cart contains an invalid product or quantity.',
      });
    }

    seenIds.add(item.id);

    // Paystack expects NGN amounts in kobo.
    const unitAmount = Math.round(product.price * 100);
    amount += unitAmount * item.quantity;

    orderItems.push({
      id: product.id,
      name: product.name,
      quantity: item.quantity,
      unitAmount,
    });
  }

  const reference = `ms-${randomUUID()}`;

  // Keep the expected amount before contacting Paystack.
  orders.set(reference, {
    reference,
    email: email.trim(),
    amount,
    currency: 'NGN',
    items: orderItems,
    status: 'pending',
    createdAt: Date.now(),
  });

  try {
    const transaction = await paystackRequest(
      '/transaction/initialize',
      {
        email: email.trim(),
        amount,
        currency: 'NGN',
        reference,
        callback_url: `${FRONTEND_URL}/`,
      }
    );

    const checkoutUrl = new URL(transaction.authorization_url);

    if (
      checkoutUrl.protocol !== 'https:' ||
      checkoutUrl.hostname !== 'checkout.paystack.com'
    ) {
      throw new Error('Unexpected checkout URL.');
    }

    res.json({
      checkoutUrl: checkoutUrl.href,
      reference,
    });
  } catch (error) {
    console.error('Checkout initialization failed:', error.message);

    res.status(502).json({
      error:
        'Could not start payment. Check your internet connection and test key, then try again.',
    });
  }
});

// Verify the payment against the order stored on our server.
app.get('/api/verify', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  const reference = req.query.reference;

  if (
    typeof reference !== 'string' ||
    !/^ms-[a-f0-9-]{36}$/.test(reference)
  ) {
    return res.status(400).json({
      error: 'Invalid payment reference.',
    });
  }

  const order = orders.get(reference);

  if (!order) {
    return res.status(404).json({
      error:
        'Order not found. If you restarted the backend, its temporary orders were cleared. Check the Paystack test dashboard.',
    });
  }

  try {
    const transaction = await paystackRequest(
      `/transaction/verify/${encodeURIComponent(reference)}`
    );

    const matchesOrder =
      transaction.reference === order.reference &&
      transaction.amount === order.amount &&
      transaction.currency === order.currency &&
      transaction.domain === 'test';

    if (!matchesOrder) {
      return res.status(409).json({
        error: 'Payment details do not match this order.',
      });
    }

    const paid = transaction.status === 'success';

    order.status = paid ? 'paid' : transaction.status;

    res.json({
      paid,
      status: transaction.status,
      reference,
      amount: order.amount,
    });
  } catch (error) {
    console.error('Verification failed:', error.message);

    res.status(502).json({
      error:
        'Could not verify payment right now. Refresh to retry before attempting another payment.',
    });
  }
});

// Remove temporary orders after 24 hours.
setInterval(() => {
  const oldestAllowed = Date.now() - 24 * 60 * 60 * 1000;

  for (const [reference, order] of orders) {
    if (order.createdAt < oldestAllowed) {
      orders.delete(reference);
    }
  }
}, 60 * 60 * 1000).unref();

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Payment backend: http://127.0.0.1:${PORT}`);
  console.log('TEST MODE ONLY — keep this terminal running.');
});