// app/pricing/page.jsx

"use client";

import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

const plans = [
  {
    name: "Starter",
    price: "$499 / month",
    stripePriceId: "price_starter_here",
    description: "5–10 qualified requests",
  },
  {
    name: "Growth",
    price: "$999 / month",
    stripePriceId: "price_growth_here",
    description: "15–30 booked opportunities",
  },
  {
    name: "Domination",
    price: "$1,999 / month",
    stripePriceId: "price_domination_here",
    description: "Exclusive territory control",
  },
];

export default function Pricing() {
  const handleCheckout = async (priceId) => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceId }),
    });

    const data = await res.json();

    const stripe = await stripePromise;
    await stripe.redirectToCheckout({
      sessionId: data.id,
    });
  };

  return (
    <main className="bg-white text-gray-900">
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-bold">
          RoofFlow OS Pricing
        </h1>

        <p className="mt-4 text-gray-600">
          Exclusive roofing lead access per territory. No shared leads.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="border rounded-xl p-6"
          >
            <h2 className="font-bold text-xl">{plan.name}</h2>

            <p className="text-gray-600 text-lg">
              {plan.price}
            </p>

            <p className="text-sm text-gray-500 mb-6">
              {plan.description}
            </p>

            <button
              onClick={() => handleCheckout(plan.stripePriceId)}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold"
            >
              Start {plan.name}
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}