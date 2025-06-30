import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
// WARNING: Never expose your secret key in client-side code
const stripePromise = loadStripe('pk_test_51RUnqxKb8qq50gYGJOKlneaYJguTY6RzSkjjxWeIfOW5r33Acr3sfZI2e5ws3njdNshCcJrWuujZdbv0U0mbrEWf00t7Fhrbn0');

// API URL for your backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create a payment intent
export const createPaymentIntent = async (amount: number, currency: string = 'usd') => {
  try {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Confirm card payment
export const confirmCardPayment = async (clientSecret: string, paymentMethod: any) => {
  try {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod,
    });

    return result;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};

export { stripePromise };

