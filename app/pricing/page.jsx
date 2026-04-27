export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-gray-400 mb-12">
          Built for contractors, roofers, and service businesses that need real leads.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="border border-gray-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-2">Starter</h2>
            <p className="text-4xl font-bold mb-4">$97/mo</p>
            <p>Perfect for solo operators getting organized.</p>
          </div>

          <div className="border border-gray-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-2">Growth</h2>
            <p className="text-4xl font-bold mb-4">$297/mo</p>
            <p>For growing teams needing stronger systems.</p>
          </div>

          <div className="border border-gray-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-2">Pro</h2>
            <p className="text-4xl font-bold mb-4">$697/mo</p>
            <p>Built for serious operations that want scale.</p>
          </div>
        </div>
      </div>
    </main>
  );
}