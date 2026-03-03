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
    price: 999,
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
    price: 1999,
    tokensPerDay: 999,
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
    price: 2999,
    tokensPerDay: 999,
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

// Token Packages
const TOKEN_PACKAGES = {
  10: { price: 499, name: '10 Tokens' },
  25: { price: 999, name: '25 Tokens' },
  50: { price: 1699, name: '50 Tokens' },
  100: { price: 2999, name: '100 Tokens' }
};

const createCheckoutSession = async ({ userId, email, planType, tokenAmount }) => {
  try {
    let lineItems;
    
    if (planType && planType !== 'free') {
      const plan = PLANS[planType];
      if (!plan?.stripePriceId) {
        throw new Error('Invalid plan or Stripe price ID not configured');
      }
      lineItems = [{
        price: plan.stripePriceId,
        quantity: 1
      }];
    } else if (tokenAmount) {
      const pkg = TOKEN_PACKAGES[tokenAmount];
      if (!pkg) {
        throw new Error('Invalid token package');
      }
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'EthioMatch ' + pkg.name,
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
      success_url: process.env.BASE_URL + '/payment/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.BASE_URL + '/premium?canceled=true',
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        userId: userId,
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
    const customers = await stripe.customers.list({ email: email, limit: 1 });
    return customers.data.length > 0 ? customers.data[0] : null;
  } catch (error) {
    console.error('Stripe customer lookup error:', error.message);
    return null;
  }
};

const createStripeCustomer = async ({ email, name, userId }) => {
  try {
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        userId: userId
      }
    });
    return customer;
  } catch (error) {
    console.error('Stripe customer creation error:', error.message);
    throw error;
  }
};

module.exports = {
  stripe: stripe,
  PLANS: PLANS,
  TOKEN_PACKAGES: TOKEN_PACKAGES,
  createCheckoutSession: createCheckoutSession,
  getStripeCustomer: getStripeCustomer,
  createStripeCustomer: createStripeCustomer
};
