app.post(
  "/api/stripe/webhook",
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
      console.log("Webhook signature error:", err.message);
      return res.status(400).send("Webhook Error");
    }

    /**
     * 🎯 PAYMENT SUCCESS EVENT
     */
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log("PAYMENT SUCCESS:", session.id);

      // TODO: store subscription in DB
    }

    res.json({ received: true });
  }
);