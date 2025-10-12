/* eslint-disable react/no-unescaped-entities */

export default function TermsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <article className="prose prose-gray dark:prose-invert max-w-none">
        <h2>Cassette Technologies - Terms of Service</h2>
        <p>
          <strong>Effective Date:</strong> October 27, 2025
        </p>
        <p>
          <strong>Contact:</strong>{" "}
          <a href="mailto:contact@cassette.tech">contact@cassette.tech</a>
        </p>
        <p>
          <strong>Entity:</strong> 'Cassette Technologies' ('Cassette', 'we', 'us', 'our')
        </p>

        <section>
          <h3>1) Acceptance of Terms</h3>
          <p>
            By accessing cassette.tech or any related pages, creating an account, or generating MusicLinks or shareable profiles (collectively, the 'Service'), you agree to these Terms of Service ('Terms'). If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h3>2) Eligibility</h3>
          <p>
            You must be at least 13 years old to use the Service. If you are under the age of majority in your jurisdiction, you may use the Service only with the consent of a parent or guardian. You represent that you have the capacity to enter these Terms.
          </p>
        </section>

        <section>
          <h3>3) Accounts and Security</h3>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</li>
            <li>
              Notify us promptly at{" "}
              <a href="mailto:contact@cassette.tech">contact@cassette.tech</a> of suspected unauthorized use or security incidents.
            </li>
            <li>We may refuse, suspend, or terminate accounts that violate these Terms, create risk, or disrupt the Service.</li>
          </ul>
        </section>

        <section>
          <h3>4) The Service; MusicLinks; Public Profiles</h3>
          <ul>
            <li>
              <strong>Linking, not hosting.</strong> Cassette does not host copyrighted music. We convert or aggregate links and metadata to help recipients open content in their preferred streaming service.
            </li>
            <li>
              <strong>Public by default.</strong> MusicLinks and shareable profile URLs may be publicly accessible to anyone with the link. Do not post anything you do not want to be public.
            </li>
            <li>
              <strong>Conversion timing.</strong> For songs, albums, and artists, conversions may run in real time after a recipient selects a destination service. Availability depends on third-party catalogs and APIs.
            </li>
            <li>
              <strong>No affiliation.</strong> We are not affiliated with, endorsed by, or responsible for Spotify, Apple Music, Deezer, Tidal, YouTube Music, or any streaming service. Their content, availability, and terms are outside our control.
            </li>
          </ul>
        </section>

        <section>
          <h3>5) Third-Party Services and OAuth</h3>
          <ul>
            <li>
              <strong>OAuth only.</strong> We authenticate integrations through OAuth or similar token-based methods; we do not ask for or store streaming-service passwords.
            </li>
            <li>Your use of streaming services is subject to each provider&apos;s terms and policies. You must have the rights or permissions to link, display, or share items you reference through the Service.</li>
            <li>We may store tokens, IDs, and metadata necessary to operate the Service and may revoke or require you to reauthorize integrations at any time.</li>
          </ul>
        </section>

        <section>
          <h3>6) Your Content and License to Us</h3>
          <ul>
            <li>
              <strong>Your content.</strong> You are responsible for the content you submit or generate (for example, profile information, handles, images, descriptions, MusicLinks, playlists, titles, and artwork metadata).
            </li>
            <li>
              <strong>License.</strong> Solely to operate and improve the Service, you grant Cassette a worldwide, non-exclusive, royalty-free, transferable, sublicensable license to host, cache, reproduce, modify (for formatting or technical reasons), display, perform, and distribute your content in connection with the Service and our marketing of the Service.
            </li>
            <li>
              <strong>Feedback.</strong> If you give feedback or suggestions, we may use them without restriction or compensation.
            </li>
          </ul>
        </section>

        <section>
          <h3>7) Acceptable Use</h3>
          <ul>
            <li>Do not infringe intellectual property, publicity, or privacy rights or upload unlawful, defamatory, harassing, hateful, or otherwise harmful material.</li>
            <li>Do not misrepresent ownership or the source of content or attempt to circumvent DRM or access controls.</li>
            <li>Do not scrape, crawl, or harvest data except via public endpoints and only within published rate limits.</li>
            <li>Do not interfere with, disable, or probe the Service or our infrastructure or introduce malware.</li>
            <li>Do not use automated systems to create accounts or generate links at scale without our written consent.</li>
            <li>Do not use the Service in violation of applicable laws or third-party terms, including streaming-service terms.</li>
          </ul>
          <p>We may throttle or block traffic and remove content or accounts that violate these Terms.</p>
        </section>

        <section>
          <h3>8) DMCA and Repeat Infringer Policy</h3>
          <p>We respect intellectual property rights and comply with the DMCA.</p>
          <ul>
            <li>
              <strong>Notices.</strong> Send alleged infringement notices to our DMCA Agent:<br />
              [PLACEHOLDER - Name/Title]<br />
              Cassette Technologies - DMCA Agent<br />
              [PLACEHOLDER - Postal Address]<br />
              Email: <a href="mailto:dmca@cassette.tech">dmca@cassette.tech</a> (or <a href="mailto:contact@cassette.tech">contact@cassette.tech</a>)<br />
              Phone: [PLACEHOLDER]<br />
              Your notice must include the elements required by the DMCA.
            </li>
            <li>
              <strong>Counter-notices.</strong> Counter-notices may be submitted as permitted by law.
            </li>
            <li>
              <strong>Enforcement.</strong> We may remove or disable access to allegedly infringing material and terminate repeat infringers.
            </li>
            <li>
              <strong>Registration.</strong> Register the agent with the U.S. Copyright Office and update this section with the official record once complete.
            </li>
          </ul>
        </section>

        <section>
          <h3>9) Beta and Experimental Features</h3>
          <p>
            Certain features (for example, real-time conversions or previews) may be labeled Beta, Preview, or similar. They are provided as-is, may change or be discontinued, and may be subject to additional terms or limits.
          </p>
        </section>

        <section>
          <h3>10) Fees, Plans, and Trials (if or when offered)</h3>
          <ul>
            <li>
              <strong>Paid plans.</strong> We may offer paid features or subscriptions with auto-renewal unless canceled. Pricing and plan details will be presented at checkout.
            </li>
            <li>
              <strong>Billing.</strong> You authorize us and our payment processor to charge your payment method for recurring fees and applicable taxes.
            </li>
            <li>
              <strong>Cancellation.</strong> Cancel in your account settings effective at the end of the current billing period. Unless required by law, fees are non-refundable and partial periods are not prorated.
            </li>
            <li>
              <strong>Price changes.</strong> We may change prices upon reasonable notice to take effect in the next term.
            </li>
          </ul>
        </section>

        <section>
          <h3>11) Privacy</h3>
          <p>Our Privacy Policy describes how we collect and use personal data. By using the Service, you agree to our Privacy Policy.</p>
        </section>

        <section>
          <h3>12) Changes to the Service and Terms</h3>
          <p>
            We may modify or discontinue the Service in whole or in part and update these Terms. We will post changes with a revised effective date. Your continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h3>13) Disclaimers</h3>
          <p>
            THE SERVICE (AND ALL CONTENT AND LINKS) IS PROVIDED 'AS IS' AND 'AS AVAILABLE.' WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT CONTINUOUS, ERROR-FREE, OR SECURE OPERATION, OR THE AVAILABILITY OR ACCURACY OF THIRD-PARTY CONTENT OR LINKS.
          </p>
        </section>

        <section>
          <h3>14) Limitation of Liability</h3>
          <p>To the maximum extent permitted by law:</p>
          <ul>
            <li>Cassette will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or lost profits, revenue, goodwill, or data.</li>
            <li>Our total liability for any claims relating to the Service will not exceed the greater of US$100 or the amounts you paid to us for the Service in the 12 months before the event giving rise to liability.</li>
          </ul>
        </section>

        <section>
          <h3>15) Indemnification</h3>
          <p>
            You will defend, indemnify, and hold harmless Cassette and its officers, directors, employees, and agents from and against claims, losses, and expenses (including reasonable attorneys&apos; fees) arising from your content, your use of the Service, or your breach of these Terms or applicable law.
          </p>
        </section>

        <section>
          <h3>16) Export and Sanctions</h3>
          <p>You may not use the Service in violation of export control or sanctions laws. You represent that you are not located in, or a resident of, an embargoed or restricted jurisdiction.</p>
        </section>

        <section>
          <h3>17) Governing Law and Venue</h3>
          <p>
            These Terms are governed by the laws of the Commonwealth of Massachusetts and the United States without regard to conflict-of-law rules. Exclusive jurisdiction and venue lie in the state or federal courts located in Boston, Massachusetts, and you consent to personal jurisdiction there.
          </p>
        </section>

        <section>
          <h3>18) Miscellaneous</h3>
          <ul>
            <li>
              <strong>Assignment.</strong> You may not assign these Terms without our consent. We may assign these Terms.
            </li>
            <li>
              <strong>Severability.</strong> If any provision is unenforceable, the rest remain in effect.
            </li>
            <li>
              <strong>Entire agreement.</strong> These Terms and our Privacy Policy are the entire agreement between you and Cassette regarding the Service.
            </li>
            <li>
              <strong>Notices.</strong> We may provide notices by email, in-product messages, or by posting to the Site.
            </li>
            <li>
              <strong>No waiver.</strong> Failure to enforce a provision is not a waiver.
            </li>
          </ul>
        </section>

        <p>
          <strong>Questions?</strong>{" "}
          <a href="mailto:contact@cassette.tech">contact@cassette.tech</a>
        </p>
      </article>
    </div>
  );
}
