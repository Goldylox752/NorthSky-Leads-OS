const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(express.json());

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

let subscriptions = {};
let events = [];

/**
 * WEBHOOK (Stripe truth source)
 */
app.post("/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {

    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        endpointSecret
      );
    } catch (err) {
      return res.status(400).send("Webhook Error");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      subscriptions[session.id] = {
        email: session.customer_email,
        plan:
          session.amount_total >= 99900 ? "elite" :
          session.amount_total >= 29900 ? "pro" :
          "starter",
        active: true
      };
    }

    res.json({ received: true });
  }
);

/**
 * VERIFY ACCESS
 */
app.post("/api/verify-session", (req, res) => {
  const { session_id } = req.body;

  const sub = subscriptions[session_id];

  if (!sub || !sub.active) {
    return res.json({ valid: false });
  }

  res.json({
    valid: true,
    plan: sub.plan
  });
});

/**
 * EVENTS
 */
app.post("/api/event", (req, res) => {
  const event = { ...req.body, time: Date.now() };
  events.push(event);
  console.log("EVENT:", event);
  res.json({ ok: true });
});

/**
 * DEBUG
 */
app.get("/api/debug/subscriptions", (req, res) => {
  res.json(subscriptions);
});

app.get("/api/debug/events", (req, res) => {
  res.json(events);
});

/**
 * START
 */
app.listen(3000, () => {
  console.log("NorthSky backend running on :3000");
});