'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-6">
            Privacy Policy
          </h1>

          <p className="text-gray-400 text-sm mb-8">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
              <p>
                KeyHub Central (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to protecting
                your personal information. This Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you use our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
              <p className="mb-3">We may collect the following types of information:</p>
              <ul className="list-disc list-inside ml-4 text-gray-400 space-y-2">
                <li><strong>Personal Information:</strong> Name, email address, phone number, and mailing address</li>
                <li><strong>Project Information:</strong> Details about your home improvement projects and service requests</li>
                <li><strong>Communication Data:</strong> Records of your communications with us, including SMS messages and phone calls</li>
                <li><strong>Device Information:</strong> IP address, browser type, and device identifiers when you visit our website</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
              <p className="mb-3">We use your information to:</p>
              <ul className="list-disc list-inside ml-4 text-gray-400 space-y-2">
                <li>Respond to your inquiries and provide quotes</li>
                <li>Schedule and manage appointments</li>
                <li>Send service updates and project communications</li>
                <li>Send promotional messages (with your consent)</li>
                <li>Improve our services and customer experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. SMS and Phone Communications</h2>
              <p>
                If you opt in to receive SMS messages or phone calls, we will use your phone number to send
                automated text messages and make calls related to your service inquiries, appointments, and
                project updates. We do not sell, rent, or share your phone number with third parties for
                their marketing purposes. Your phone number will only be used for the purposes you consented to.
              </p>
              <p className="mt-3">
                You can opt out of SMS messages at any time by replying STOP to any message. Standard message
                and data rates may apply.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Information Sharing</h2>
              <p className="mb-3">We may share your information with:</p>
              <ul className="list-disc list-inside ml-4 text-gray-400 space-y-2">
                <li><strong>Service Providers:</strong> Contractors and partners who help us deliver services to you</li>
                <li><strong>Business Affiliates:</strong> Key Trade Solutions, Key Renovations, and Keynote Digital for service fulfillment</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
              <p className="mt-3">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal
                information against unauthorized access, alteration, disclosure, or destruction. However,
                no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes for
                which it was collected, including to satisfy legal, accounting, or reporting requirements.
                SMS consent records are retained for at least 4 years as required by regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights</h2>
              <p className="mb-3">You have the right to:</p>
              <ul className="list-disc list-inside ml-4 text-gray-400 space-y-2">
                <li>Access and receive a copy of your personal information</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of marketing communications</li>
                <li>Withdraw consent for SMS and phone communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Children&apos;s Privacy</h2>
              <p>
                Our services are not directed to individuals under 18 years of age. We do not knowingly
                collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material
                changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date.
              </p>
            </section>

            <section className="pt-6 border-t border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-3">Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="mt-3">
                KeyHub Central<br />
                Email: privacy@keyhubcentral.com<br />
                Phone: (405) 990-7821
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
