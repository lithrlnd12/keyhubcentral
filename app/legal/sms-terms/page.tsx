import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SMS Terms & Conditions | KeyHub',
  description: 'Terms and conditions for SMS and call communications from KeyHub.',
};

export default function SmsTermsPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-6">
            SMS & Call Terms and Conditions
          </h1>

          <p className="text-gray-400 text-sm mb-8">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Consent to Receive Communications</h2>
              <p>
                By providing your phone number and checking the consent box, you agree to receive
                autodialed calls and text messages from KeyHub, Key Trade Solutions, Key Renovations,
                Keynote Digital, and their affiliates regarding your inquiry, quotes, appointments,
                project updates, and promotional offers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Message Frequency</h2>
              <p>
                Message frequency varies based on your interaction with our services. You may receive
                messages regarding appointment confirmations, project updates, follow-ups on your
                inquiries, and occasional promotional offers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Message and Data Rates</h2>
              <p>
                Message and data rates may apply. Please contact your wireless carrier for details
                about your text messaging plan. KeyHub is not responsible for any charges incurred
                from your wireless provider.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. How to Opt Out</h2>
              <p>
                You can opt out of receiving text messages at any time by replying <strong>STOP</strong> to
                any message you receive from us. After opting out, you will receive a confirmation
                message and will no longer receive text messages from us unless you opt in again.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. How to Get Help</h2>
              <p>
                If you need assistance or have questions about our messaging program, reply <strong>HELP</strong> to
                any message you receive from us, or contact us at:
              </p>
              <ul className="list-disc list-inside mt-2 ml-4 text-gray-400">
                <li>Email: support@keyhubcentral.com</li>
                <li>Phone: (555) 555-5555</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Consent Not Required for Purchase</h2>
              <p>
                Your consent to receive calls and text messages is not a condition of purchasing any
                goods or services from KeyHub or its affiliates. You may choose not to provide consent
                and still receive services from us through other communication methods.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Supported Carriers</h2>
              <p>
                Our SMS services are supported by major U.S. wireless carriers including AT&T, Verizon,
                T-Mobile, Sprint, and most other carriers. Carriers are not liable for delayed or
                undelivered messages.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Privacy</h2>
              <p>
                Your phone number and the information you provide will be handled in accordance with
                our Privacy Policy. We do not sell, rent, or share your phone number with third parties
                for their marketing purposes without your explicit consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued participation in
                our messaging program after changes are posted constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="pt-6 border-t border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-3">Contact Information</h2>
              <p>
                KeyHub Central<br />
                Email: support@keyhubcentral.com<br />
                Phone: (555) 555-5555
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
