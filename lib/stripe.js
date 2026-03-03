// lib/stripe.js
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10'
});

// Premium Plans Configuration
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    tokensPerDay: 5,
    features: [
      '5 message tokens per day',
      'Browse profiles',
      'Send likes',
      'Basic matching'
    ]
  },
  basic: {
    name: 'Basic',
    price: 999, // $9.99/month
    tokensPerDay: 20,
    features: [
      '20 message tokens per day',
      'See who liked you',
      '5 Super Likes per week',
      'Priority profile visibility'
    ],
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID
  },
  premium: {
    name: 'Premium',
    price: 1999, // $19.99/month
    tokensPerDay: 999, // Unlimited
    features: [
      'Unlimited messages',
      'See who liked you',
      'Unlimited Super Likes',
      'Priority profile visibility',
      'Read receipts',
      'Profile boost (1x/month)'
    ],
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID
  },
  vip: {
    name: 'VIP',
    price: 2999, // $29.99/month
    tokensPerDay: 999, // Unlimited
    features: [
      'All Premium features',
      'Unlimited messages',
      'Profile boost (4x/month)',
      'VIP badge on profile',
      'Priority customer support',
      'See who viewed your profile'
    ],
    stripePriceId: process.env.STRIPE_VIP_PRICE_ID
  }
};

// Token Packages (One-time purchase)
const TOKEN_PACKAGES = {
  10: { price: 499, name: '10 Tokens' },    // $4.99
  25: { price: 999, name: '25 Tokens' },    // $9.99
  50: { price: 1699, name: '50 Tokens' },   // $16.99
  100: { price: 2999, name: '100 Tokens' }  // $29.99
};

const createCheckoutSession = async ({ userId, email, planType, tokenAmount }) => {
  try {
    let lineItems;
    
    if (planType && planType !== 'free') {
      // Subscription checkout
      const plan = PLANS[planType];
      if (!plan?.stripePriceId) {
        throw new Error('Invalid plan or Stripe price ID not configured');
      }
      
      lineItems = [{
        price: plan.stripePriceId,
        quantity: 1
      }];
    } else if (tokenAmount) {
      // Token package checkout (one-time payment)
      const pkg = TOKEN_PACKAGES[tokenAmount];
      if (!pkg) {
        throw new Error('Invalid token package');
      }
      
      // ✅ FIXED: Proper object syntax with price_data and product_data
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `EthioMatch ${pkg.name}`,
            description: 'Message tokens for EthioMatch'
          },
          unit_amount: pkg.price
        },
        quantity: 1
      }];
    } else {
      throw new Error('Must specify planType or tokenAmount');
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: planType && planType !== 'free' ? 'subscription' : 'payment',
      success_url: `${process.env.BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/premium?canceled=true`,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        userId,
        planType: planType || 'tokens',
        tokenAmount: tokenAmount || ''
      }
    });
    
    return { sessionId: session.id, url: session.url };
    
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    throw error;
  }
};

const getStripeCustomer = async (email) => {
  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    return customers.data.length > 0 ? customers.data[0] : null;
  } catch (error) {
    console.error('Stripe customer lookup error:', error.message);
    return null;
  }
};

const createStripeCustomer = async ({ email, name, userId }) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { userId }
    });
    return customer;
  } catch (error) {
    console.error('Stripe customer creation error:', error.message);
    throw error;
  }
};

const verifyWebhookSignature = (signature, payload, secret) => {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return null;
  }
};

module.exports = {
  stripe,
  PLANS,
  TOKEN_PACKAGES,
  createCheckoutSession,
  getStripeCustomer,
  createStripeCustomer,
  verifyWebhookSignature
};
