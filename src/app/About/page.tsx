import Link from "next/link";

const AboutPage = () => {
  return (
    <div className="page gap-10">
      <div>
        <h1>About Nightfalls</h1>
        <p className="text-sm text-gray-400">
          Never Miss Another Perfect Sunset
        </p>

        <p className="pt-4">
          Nightfalls is a web application born from a photographer&apos;s simple
          desire: to never miss another spectacular sunset. We combine precise
          astronomical data with real-time weather forecasts to help you capture
          or simply enjoy nature&apos;s daily masterpiece.
        </p>
      </div>
      <div></div>
      <div>
        <h2>Perfect Timing, Perfect Shot</h2>
        <h3>Sunset Predictions</h3>
        <p>
          Get precise sunset timing for your exact location, helping you plan
          your evening and arrive with plenty of time to set up your shot or
          find the perfect viewing spot.
        </p>
      </div>
      <div>
        <h3>Golden Hour Alerts</h3>
        <p>
          Know exactly when the magical golden hour begins—that perfect window
          of warm, soft light that photographers dream about and sunset
          enthusiasts live for.
        </p>
      </div>
      <div>
        <h3>Weather Integration</h3>
        <p>
          We don&apos;t just tell you when the sun sets; we help you understand
          the conditions. Our integrated weather forecasting helps you know if
          tonight&apos;s conditions will combine for a spectacular show.
        </p>
      </div>
      <div>
        <h3>Sunset Quality Forecast</h3>
        <p>
          Using our unique algorithm that analyzes weather patterns and
          atmospheric conditions, we predict the quality of each sunset. From
          &quot;Worth a Glance&quot; to &quot;Drop Everything Now,&quot;
          you&apos;ll know which evenings will paint the sky in unforgettable
          colors.
        </p>
      </div>
      <div>
        <h2>Built for Photo Enthusiasts and Sunset Lovers</h2>
        <p>Whether you&apos;re:</p>
        <ul>
          <li>- A photographer planning your next shoot</li>
          <li>- An enthusiast who loves to document beautiful moments</li>
          <li>
            - Someone who simply enjoys ending their day with a peaceful sunset
          </li>
          <li>
            - An adventure seeker looking for the perfect golden hour hike
          </li>
        </ul>
        <p>Nightfalls helps you make the most of every sunset opportunity.</p>
      </div>
      <div>
        <h2>Our Story</h2>
        <p>
          Nightfalls was created by a developer who, after missing one too many
          spectacular sunsets while working, decided to solve the problem once
          and for all. What started as a personal tool to catch nature&apos;s
          daily show has grown into a platform for anyone who believes that
          every perfect sunset is worth witnessing.
        </p>
      </div>
      <div>
        <h2>Technical Excellence</h2>
        <ul>
          <li>
            - Web-Based Platform: Access Nightfalls from any device with a web
            browser
          </li>
          <li>
            - Real-Time Updates: Conditions and predictions updated continuously
          </li>
          <li>- Location Precision: Accurate to your local city</li>
          <li>
            - Weather Integration: Powered by Open Meteo for reliable
            forecasting
          </li>
          <li>
            - Privacy Focused: No data retention, just real-time processing
          </li>
        </ul>
      </div>
      <div>
        <h2>Contact Me</h2>
        <p>
          Have questions, suggestions, or just want to share your perfect sunset
          shot? Reach out to me at{" "}
          <Link
            href="mailto:info@si8tech.com"
            className="underline"
          >
            info@si8tech.com
          </Link>
        </p>
        <p className="pt-4">
          &quot;Every sunset brings the promise of a new dawn&quot; - Ralph
          Waldo Emerson
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
