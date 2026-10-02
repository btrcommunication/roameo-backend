const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const { sendOrderCompletedEmail } = require('../services/emailService');

const valid = n => Number.isSafeInteger(Number(n)) && Number(n) > 0;

const priceInCents = value => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
    return null;
  }
  const price = Number(value);
  const cents = Math.round(price * 100);
  return Number.isFinite(price) && price >= 0 && Number.isSafeInteger(cents) ? cents : null;
};

const calculateCart = rows => {
  let totalCents = 0;
  const items = rows.map(row => {
    const quantity = Number(row.quantity);
    if (!valid(quantity)) throw new Error('Invalid cart quantity');
    const unitCents = priceInCents(row.price);
    const subtotalCents = unitCents === null ? null : unitCents * quantity;
    if (subtotalCents !== null && !Number.isSafeInteger(subtotalCents)) {
      throw new Error('Cart amount exceeds supported range');
    }
    totalCents += subtotalCents ?? 0;
    return {
      ...row,
      quantity,
      price: unitCents === null ? null : unitCents / 100,
      final_price: unitCents === null ? null : unitCents / 100,
      subtotal: subtotalCents === null ? null : subtotalCents / 100,
      pricing_configured: unitCents !== null,
    };
  });

  if (!Number.isSafeInteger(totalCents)) {
    throw new Error('Cart total exceeds supported range');
  }

  return {
    items,
    total_items: items.reduce((sum, item) => sum + item.quantity, 0),
    total_amount: items.some(item => !item.pricing_configured) ? null : totalCents / 100,
    total_cents: totalCents,
    currency: 'USD',
  };
};

const serializeOrder = order => ({
  ...order,
  id: String(order.id),
  items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
  total_items: Number(order.total_items),
  total_amount: Number(order.total_amount),
  payment_details: typeof order.payment_details === 'string' ? JSON.parse(order.payment_details) : (order.payment_details || null),
});

router.use(authenticate);

router.use((req, res, next) => {
  if (!valid(req.user?.id)) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
    });
  }
  next();
});

// CREATE PAYMENT INTENT
router.post('/create-payment-intent', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        c.coupon_id,
        c.quantity,
        c.ad_id,
        p.title,
        p.banner_image_url AS thumbnail_url,
        IF(
          c.ad_id IS NOT NULL AND a.id IS NOT NULL AND a.is_active = 1 AND a.approval_status = 'approved',
          IF(
            a.discount_type = 'percentage',
            p.price - (p.price * a.discount / 100),
            IF(
              a.discount_type = 'lumpsum',
              GREATEST(0, p.price - a.discount),
              p.price
            )
          ),
          p.price
        ) AS price,
        p.max_quantity,
        p.coupon_code,
        p.is_active,
        p.is_approved,
        (p.valid_from <= NOW() AND p.valid_until >= NOW()) AS valid_now
       FROM coupon_cart c
       LEFT JOIN coupons p ON p.id = c.coupon_id
       LEFT JOIN ads a ON a.id = c.ad_id
       WHERE c.user_id = ?
       ORDER BY c.coupon_id`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Your cart is empty.',
      });
    }

    const unavailable = rows.some(item =>
      Number(item.is_active) !== 1 ||
      Number(item.is_approved) !== 1 ||
      Number(item.valid_now) !== 1 ||
      !(Number(item.quantity) <= Number(item.max_quantity))
    );

    if (unavailable) {
      return res.status(400).json({
        status: 'error',
        message: 'A coupon is unavailable or exceeds its quantity limit. Update your cart.',
      });
    }

    const summary = calculateCart(rows);

    if (summary.total_amount === null || summary.total_cents <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'A coupon has no price. Checkout is unavailable until its price is configured.',
      });
    }

    const requestId = req.body?.request_id || `req_${Date.now()}`;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: summary.total_cents,
      currency: 'usd',
      metadata: {
        userId: String(req.user.id),
        requestId: requestId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // For web checkout sessions
    let checkoutUrl = null;
    try {
      const lineItems = summary.items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title || `Coupon #${item.coupon_id}`,
          },
          unit_amount: Math.round(item.final_price * 100),
        },
        quantity: item.quantity,
      }));

      const origin = req.headers.origin || 'http://localhost:8081';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${origin}/cart?payment=success&session_id={CHECKOUT_SESSION_ID}&request_id=${requestId}`,
        cancel_url: `${origin}/cart?payment=cancel`,
        metadata: {
          userId: String(req.user.id),
          requestId: requestId,
        },
      });
      checkoutUrl = session.url;
    } catch (sessionErr) {
      console.warn('Stripe checkout session creation optional warning:', sessionErr.message);
    }

    res.json({
      status: 'success',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        checkoutUrl: checkoutUrl,
        amount: summary.total_amount,
        currency: 'USD',
      },
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    next(error);
  }
});

// CONFIRM PAYMENT & PLACE ORDER
router.post('/confirm-order', async (req, res, next) => {
  const { payment_intent_id, session_id, request_id } = req.body;
  const requestId = request_id || (payment_intent_id ? `stripe-${payment_intent_id}` : (session_id ? `stripe-${session_id}` : null));

  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({ status: 'error', message: 'A valid request_id, session_id, or payment_intent_id is required.' });
  }

  let paymentMethod = 'Stripe Card';
  let transactionId = payment_intent_id || session_id || requestId;
  let paymentDetails = {
    payment_method_type: 'card',
    provider: 'stripe',
    status: 'paid',
    timestamp: new Date().toISOString(),
  };

  // 1. If session_id is supplied (Web Stripe Checkout)
  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['payment_intent', 'payment_intent.latest_charge']
      });

      if (session.payment_status !== 'paid') {
        return res.status(400).json({
          status: 'error',
          message: `Payment not completed. Status: ${session.payment_status}`,
        });
      }

      if (session.metadata?.userId && session.metadata.userId !== String(req.user.id)) {
        return res.status(403).json({
          status: 'error',
          message: 'Payment authentication mismatch.',
        });
      }

      const pi = session.payment_intent;
      const charge = pi && typeof pi === 'object' ? pi.latest_charge : null;
      const card = charge?.payment_method_details?.card;

      transactionId = (pi && typeof pi === 'object' ? pi.id : session.payment_intent) || session.id;
      paymentMethod = card?.brand ? `Stripe (${card.brand.toUpperCase()})` : 'Stripe Card';
      paymentDetails = {
        provider: 'stripe',
        session_id: session.id,
        payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        payment_method_type: 'card',
        card_brand: card?.brand || 'card',
        card_last4: card?.last4 || '',
        customer_email: session.customer_details?.email || '',
        customer_name: session.customer_details?.name || '',
        receipt_url: charge?.receipt_url || '',
        amount_total: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'USD',
        status: session.payment_status,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: `Stripe checkout session verification failed: ${err.message}`,
      });
    }
  } else if (payment_intent_id) {
    // 2. If payment_intent_id is supplied (Mobile PaymentSheet)
    try {
      const intent = await stripe.paymentIntents.retrieve(payment_intent_id, {
        expand: ['latest_charge']
      });

      if (intent.status !== 'succeeded') {
        return res.status(400).json({
          status: 'error',
          message: `Payment not completed. Status: ${intent.status}`,
        });
      }

      if (intent.metadata?.userId && intent.metadata.userId !== String(req.user.id)) {
        return res.status(403).json({
          status: 'error',
          message: 'Payment authentication mismatch.',
        });
      }

      const charge = intent.latest_charge;
      const card = charge?.payment_method_details?.card;

      transactionId = intent.id;
      paymentMethod = card?.brand ? `Stripe (${card.brand.toUpperCase()})` : 'Stripe Card';
      paymentDetails = {
        provider: 'stripe',
        payment_intent_id: intent.id,
        payment_method_type: 'card',
        card_brand: card?.brand || 'card',
        card_last4: card?.last4 || '',
        customer_email: charge?.billing_details?.email || '',
        customer_name: charge?.billing_details?.name || '',
        receipt_url: charge?.receipt_url || '',
        amount_total: intent.amount / 100,
        currency: intent.currency?.toUpperCase() || 'USD',
        status: intent.status,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: `Stripe verification failed: ${err.message}`,
      });
    }
  }

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();

    // Check for existing order with this request_id
    const [existing] = await db.query(
      `SELECT id, items, total_items, total_amount, currency, status, payment_status, payment_method, transaction_id, payment_details, created_at
       FROM coupon_orders WHERE user_id = ? AND request_id = ? FOR UPDATE`,
      [req.user.id, requestId]
    );

    if (existing.length) {
      await db.commit();
      return res.json({
        status: 'success',
        message: 'Order already placed.',
        data: serializeOrder(existing[0]),
      });
    }

    const [rows] = await db.query(
      `SELECT
        c.coupon_id,
        c.quantity,
        c.ad_id,
        p.title,
        p.banner_image_url AS thumbnail_url,
        IF(
          c.ad_id IS NOT NULL AND a.id IS NOT NULL AND a.is_active = 1 AND a.approval_status = 'approved',
          IF(
            a.discount_type = 'percentage',
            p.price - (p.price * a.discount / 100),
            IF(
              a.discount_type = 'lumpsum',
              GREATEST(0, p.price - a.discount),
              p.price
            )
          ),
          p.price
        ) AS price,
        p.max_quantity,
        p.coupon_code,
        p.is_active,
        p.is_approved,
        (p.valid_from <= NOW() AND p.valid_until >= NOW()) AS valid_now
       FROM coupon_cart c
       LEFT JOIN coupons p ON p.id = c.coupon_id
       LEFT JOIN ads a ON a.id = c.ad_id
       WHERE c.user_id = ?
       ORDER BY c.coupon_id
       FOR UPDATE`,
      [req.user.id]
    );

    if (!rows.length) {
      await db.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Your cart is empty.',
      });
    }

    const summary = calculateCart(rows);

    const items = summary.items.map(item => {
      const actualCode = item.coupon_code || `ROA-${item.coupon_id}-FALLBACK`;
      return {
        coupon_id: item.coupon_id,
        title: item.title,
        thumbnail_url: item.thumbnail_url,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        redemption_codes: [actualCode],
        ad_id: item.ad_id || null,
      };
    });

    const [insert] = await db.query(
      `INSERT INTO coupon_orders (
        user_id,
        items,
        total_items,
        total_amount,
        currency,
        status,
        payment_status,
        payment_method,
        transaction_id,
        payment_details,
        request_id
      )
      VALUES (?, ?, ?, ?, ?, 'placed', 'paid', ?, ?, ?, ?)`,
      [
        req.user.id,
        JSON.stringify(items),
        summary.total_items,
        summary.total_amount,
        summary.currency,
        paymentMethod,
        transactionId,
        JSON.stringify(paymentDetails),
        requestId,
      ]
    );

    const orderId = insert.insertId;

    for (const item of items) {
      if (item.ad_id) {
        await db.query(
          `INSERT INTO ad_conversions (order_id, ad_id, coupon_id, quantity, amount) VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.ad_id, item.coupon_id, item.quantity, item.subtotal]
        );
      }
    }

    await db.query('DELETE FROM coupon_cart WHERE user_id = ?', [req.user.id]);
    await db.commit();

    // Trigger Order Completion Email in background (non-blocking)
    (async () => {
      try {
        let recipientEmail = paymentDetails?.customer_email || req.user?.email;
        let recipientName = paymentDetails?.customer_name || req.user?.name;

        if (!recipientEmail) {
          const [users] = await pool.query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
          if (users.length > 0) {
            recipientEmail = users[0].email;
            recipientName = recipientName || users[0].name;
          }
        }

        if (recipientEmail) {
          const couponList = items.map(item => ({
            name: item.title || 'Coupon',
            code: (item.redemption_codes && item.redemption_codes[0]) || item.coupon_code || ''
          }));

          await sendOrderCompletedEmail(recipientEmail, {
            customerName: recipientName || 'Customer',
            orderNumber: String(insert.insertId),
            orderDate: new Date().toLocaleDateString(),
            completionDate: new Date().toLocaleDateString(),
            totalAmount: summary.total_amount,
            coupons: couponList
          });
        }
      } catch (mailErr) {
        console.error('[EmailService] Failed to send order completion email:', mailErr.message);
      }
    })();

    const orderData = {
      ...summary,
      id: String(insert.insertId),
      items,
      status: 'placed',
      payment_status: 'paid',
      payment_method: paymentMethod,
      transaction_id: transactionId,
      payment_details: paymentDetails,
      created_at: new Date().toISOString(),
    };

    res.json({
      status: 'success',
      message: 'Payment verified and order placed successfully.',
      data: orderData,
    });
  } catch (error) {
    await db.rollback();
    next(error);
  } finally {
    db.release();
  }
});

module.exports = router;

