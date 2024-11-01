export default function PrivacyPage() {
  return (
    <div className="page gap-10">
      <div>
        <h1 className="font-bold">Nightfall Privacy Policy</h1>
        <p className="text-xl italic">Last updated: November 2023</p>
      </div>
      <div>
        <p className="font-bold">1. About Nightfall</p>
        <p>
          This Privacy Policy explains how Nightfall (&quot;we,&quot;
          &quot;our,&quot; or &quot;us&quot;) collects, uses, and shares your
          information when you use our sunset prediction application (&quot;the
          App&quot;). We are committed to protecting your privacy and being
          transparent about our data practices. Nightfall is a sunset quality
          forecasting application that predicts the quality of sunsets based on
          various factors such as weather conditions, cloud cover, and more.
        </p>
      </div>
      <div>
        <div className="grid gap-2">
          <div>
            <h2>2. Information We Collect</h2>
          </div>
          <div>
            <h3 className="font-bold">2.1 Location Information</h3>
            <ul>
              <li>- Geographical location (latitude and longitude)</li>
              <li>- Time zone information</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold">2.2 Usage Information</h3>
            <ul>
              <li>- App performance data</li>
              <li>- Feature usage statistics</li>
              <li>- Device type and operating system</li>
              <li>- App interaction patterns</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold">2.3 How We Collect Information</h3>
            <ul>
              <li>- Direct location access through your device</li>
              <li>- When you manually search for locations</li>
              <li>
                - Through your device&apos;s GPS, IP address, or network
                information
              </li>
              <li>
                - Through analytics services that monitor app performance and
                usage
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div>
        <h2>3. Data Retention</h2>
        <p>
          We do not retain historical location data. Location information is
          processed in real-time and immediately discarded after use.
        </p>
      </div>
      <div>
        <h2>4. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>- Provide accurate sunset predictions for your location</li>
          <li>- Improve our prediction algorithms</li>
          <li>- Maintain and optimize our services</li>
          <li>- Analyze usage patterns to improve user experience</li>
          <li>- Monitor and improve app performance</li>
        </ul>
      </div>
      <div className="grid gap-2">
        <h2>5. Information Sharing and Disclosure</h2>
        <div>
          <h3>5.1 Third-Party Services</h3>
          <p>
            We share data with: Google Services for location processing, Open
            Meteo for weather and forecasting data, analytics services to
            improve our app performance and user experience
          </p>
        </div>
        <div>
          <h3>5.2 Legal Requirements</h3>
          <p>
            We may disclose information if required by law or in response to
            valid requests from public authorities.
          </p>
        </div>
      </div>
      <div>
        <h2>6. Your Rights and Choices</h2>
        <p>You have the right to:</p>
        <ul>
          <li>- Turn off location services at any time</li>
          <li>- Opt out of analytics collection</li>
          <li>- Request deletion of your data</li>
        </ul>
      </div>
      <div>
        <h2>7. Data Security</h2>
        <p>
          We implement appropriate security measures to protect your information
          during transmission and processing. Since we do not retain historical
          data, there is no long-term storage of personal information.
        </p>
      </div>
      <div>
        <h2>8. Account Information</h2>
        <p>
          Nightfall does not require user accounts and does not collect or store
          account information.
        </p>
      </div>
      <div>
        <h2>9. Cookies and Tracking</h2>
        <p>Nightfall does not use cookies or persistent tracking mechanisms.</p>
      </div>
      <div>
        <h2>10. Children&apos;s Privacy</h2>
        <p>
          Our service is available to users of all ages. We do not knowingly
          collect personal information from children under 13 without parental
          consent.
        </p>
      </div>
      <div>
        <h2>11. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy periodically. We will notify you of
          any changes by posting the new Privacy Policy on this page.
        </p>
      </div>
      <div>
        <h2>12. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          at: chengjie.michael.huang@gmail.com
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h2>13. Additional Information</h2>
        <h3>13.1 Data Storage and Processing</h3>
        <ul>
          <li>
            - Your information is processed in real-time and is not stored
          </li>
          <li>
            - By using the App, you consent to any such processing of
            information outside of your country
          </li>
        </ul>

        <h3>13.2 Your California Privacy Rights</h3>
        <p>
          California residents have additional rights regarding their personal
          information under the California Consumer Privacy Act (CCPA).
        </p>
      </div>
    </div>
  );
}
