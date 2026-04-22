// server.js
// NorthSky Lead Store 2026 - Backend API & Webhook Server
// Run with: node server.js
// Environment variables: create .env file with STRIPE_SECRET_KEY, WEBHOOK_SECRET, PORT

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing - need raw body for Stripe webhook verification
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend (place your index.html in 'public' folder)
app.use(express.static('public'));

// -------------------- In-Memory Data Store (replace with DB in production) --------------------
// Lead database
const MOCK_LEADS = [
  { id: "ld_001", name: "Michael Thompson", service: "Roof Repair", city: "Austin", postalCode: "78701", contact: "michael.t@example.com | (512) 555-1201", salePrice: 49, description: "Urgent leak repair, ready to hire this week." },
  { id: "ld_002", name: "Sarah Jenkins", service: "Full Replacement", city: "Denver", postalCode: "80202", contact: "sarah.j@example.com | (303) 555-9823", salePrice: 79, description: "Insurance claim approved, full shingle replacement." },
  { id: "ld_003", name: "David Rivera", service: "Inspection", city: "Phoenix", postalCode: "85001", contact: "david.r@example.com | (602) 555-4412", salePrice: 29, description: "Needs pre-sale inspection report for real estate." },
  { id: "ld_004", name: "Linda Chen", service: "Gutter", city: "Portland", postalCode: "97201", contact: "linda.c@example.com | (503) 555-7783", salePrice: 35, description: "Gutter replacement + downspouts." },
  { id: "ld_005", name: "Robert Hayes", service: "Roof Repair", city: "Dallas", postalCode: "75201", contact: "robert.h@example.com | (214) 555-5621", salePrice: 55, description: "Storm damage, needs quick repair." },
  { id: "ld_006", name: "Jessica Wu", service: "Full Replacement", city: "Seattle", postalCode: "98101", contact: "jessica.w@example.com | (206) 555-3490", salePrice: 89, description: "Complete tear-off, 2500 sq ft, budget ready." },
  { id: "ld_007", name: "Carlos Mendez", service: "Inspection", city: "Miami", postalCode: "33101", contact: "carlos.m@example.com | (305) 555-2234", salePrice: 39, description: "Yearly roof certification needed." },
  { id: "ld_008", name: "Emily Foster", service: "Roof Repair", city: "Atlanta", postalCode: "30301", contact: "emily.f@example.com | (404) 555-6780", salePrice: 45, description: "Missing shingles after windstorm." }
];

// Track purchased leads per contractor (in-memory)
// Structure: { contractorId: [ purchasedLeadObjects ] }
const purchasedLeadsStore = new Map();

// License keys store (in-memory) - generated after successful payment
// Structure: { licenseKey: { plan, contractorEmail, createdAt, expiresAt } }
const licenseKeysStore = new Map();

// Helper: generate a unique license key
function generateLicenseKey(plan, email) {
  const hash = crypto.createHash('sha256').update(`${email}-${Date.now()}-${plan}`).digest('hex').substring(0, 16).toUpperCase();
  const parts = hash.match(/.{1,4}/g);
  return `NSKY-${parts.join('-')}`;
}

// -------------------- API Routes --------------------
// Get available leads (not purchased by this contractor)
app.get('/api/leads', (req, res) => {
  const contractorId = req.headers['x-contractor-id'];
  if (!contractorId) {
    return res.status(400).json({ error: 'Missing contractor ID' });
  }
  
  const purchased = purchasedLeadsStore.get(contractorId) || [];
  const purchasedIds = new Set(purchased.map(l => l.id));
  const available = MOCK_LEADS.filter(lead => !purchasedIds.has(lead.id));
  
  res.json({ leads: available });
});

// Purchase a lead
app.post('/api/purchase', (req, res) => {
  const { leadId, contractorId, contractorEmail } = req.body;
  if (!leadId || !contractorId || !contractorEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const leadToBuy = MOCK_LEADS.find(l => l.id === leadId);
  if (!leadToBuy) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  
  // Check if already purchased
  const purchased = purchasedLeadsStore.get(contractorId) || [];
  if (purchased.some(l => l.id === leadId)) {
    return res.status(409).json({ error: 'Lead already purchased' });
  }
  
  // Record purchase
  const purchasedLead = {
    ...leadToBuy,
    purchasedDate: new Date().toISOString(),
    buyerId: contractorId,
    buyerEmail: contractorEmail
  };
  purchased.push(purchasedLead);
  purchasedLeadsStore.set(contractorId, purchased);
  
  // In production, you would also charge the contractor via Stripe here.
  // For demo, we just return success.
  
  res.json({ success: true, lead: purchasedLead });
});

// Get purchased leads for a contractor
app.get('/api/my-purchases', (req, res) => {
  const contractorId = req.headers['x-contractor-id'];
  if (!contractorId) {
    return res.status(400).json({ error: 'Missing contractor ID' });
  }
  const purchases = purchasedLeadsStore.get(contractorId) || [];
  res.json({ leads: purchases });
});

// Verify license key (used by frontend paywall)
app.post('/api/verify-license', (req, res) => {
  const { licenseKey } = req.body;
  if (!licenseKey) {
    return res.status(400).json({ valid: false, error: 'Missing license key' });
  }
  
  const keyData = licenseKeysStore.get(licenseKey);
  if (!keyData) {
    return res.json({ valid: false, error: 'Invalid license key' });
  }
  
  // Check expiration (optional)
  if (keyData.expiresAt && new Date() > new Date(keyData.expiresAt)) {
    return res.json({ valid: false, error: 'License expired' });
  }
  
  res.json({ valid: true, plan: keyData.plan, contractorEmail: keyData.contractorEmail });
});

// -------------------- Stripe Webhook (to issue license keys after payment) --------------------
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.WEBHOOK_SECRET;

app.post('/webhook/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details.email;
    const plan = session.metadata.plan || 'Standard'; // 'Standard', 'Professional', 'Enterprise'
    
    // Generate a license key for this customer
    const licenseKey = generateLicenseKey(plan, customerEmail);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month validity, adjust as needed
    
    licenseKeysStore.set(licenseKey, {
      plan,
      contractorEmail: customerEmail,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    
    // Optionally, send email to customer with license key (implement with nodemailer)
    console.log(`✅ License generated for ${customerEmail}: ${licenseKey} (${plan} plan)`);
  }
  
  res.json({ received: true });
});

// -------------------- Admin endpoint to create test license (for development) --------------------
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/admin/generate-test-license', (req, res) => {
    const { plan, email } = req.body;
    const licenseKey = generateLicenseKey(plan, email);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    licenseKeysStore.set(licenseKey, {
      plan: plan || 'Standard',
      contractorEmail: email || 'test@example.com',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    res.json({ licenseKey });
  });
}

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 NorthSky Lead Store server running on http://localhost:${PORT}`);
  console.log(`   Static files served from /public`);
  console.log(`   API endpoints available at /api/...`);
  if (process.env.STRIPE_SECRET_KEY) {
    console.log(`   Stripe webhook endpoint: POST /webhook/stripe`);
  } else {
    console.log(`   ⚠️  Stripe not configured. Set STRIPE_SECRET_KEY and WEBHOOK_SECRET to enable license issuance.`);
  }
});