import { type Metadata } from "next";
import { FAQSchema } from "~/components/StructuredData";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sunset FAQ - Nightfalls | Golden Hour & Sunset Photography Questions",
  description:
    "Get answers to the most common questions about sunset times, golden hour photography, sunset prediction accuracy, and using Nightfalls for perfect sunset planning.",
  keywords:
    "sunset FAQ, golden hour questions, sunset prediction, sunset photography tips, sunset timing, golden hour calculator, sunset forecast accuracy, best sunset times, sunset app help, sunset quality prediction",
  alternates: {
    canonical: "/FAQ",
  },
  openGraph: {
    title: "Sunset FAQ - Common Questions About Golden Hour & Sunset Photography",
    description:
      "Find answers to frequently asked questions about sunset times, golden hour photography, and using Nightfalls for sunset predictions.",
    url: "https://www.nightfalls.ca/FAQ",
  },
};

const FAQPage = () => {
  return (
    <>
      <FAQSchema />
      <div className="page gap-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Everything you need to know about sunset predictions, golden hour timing, and sunset photography.
          Ready to start? <Link href="/App" className="text-orange-500 hover:text-orange-600 underline font-semibold">Try our sunset predictor →</Link>
        </p>
      </div>

      <div className="space-y-8">
        {/* Sunset Timing & Predictions */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-orange-500">
            🌅 Sunset Timing & Predictions
          </h2>

          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">What is golden hour and when does it occur?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Golden hour refers to the period shortly after sunrise and before sunset when the sun is low on the horizon (typically between 6 degrees below and 6 degrees above the horizon). During this time, the light is warmer, softer, and more flattering than midday sun. Golden hour typically lasts 1-2 hours near the equator, but can be much longer at higher latitudes, especially during certain seasons.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">How accurate are sunset time predictions?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sunset times are calculated using precise astronomical formulas and are accurate to within one minute for most locations. However, factors like elevation, atmospheric conditions, and local geography can affect the exact moment you see the sun disappear. Our predictions account for your specific location and elevation for maximum accuracy.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">How does location affect sunset times?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your latitude dramatically affects sunset timing and duration. Near the equator, sunset times change minimally throughout the year and golden hour is shorter. At higher latitudes, sunset times vary greatly by season - in summer, sunset can occur very late with extended golden hours, while winter brings early sunsets. Your elevation also matters: higher altitudes see the sun longer.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">What is blue hour and how is it different from golden hour?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Blue hour occurs immediately after golden hour (after sunset) and before golden hour (before sunrise) when the sun is just below the horizon. During blue hour, the sky takes on deep blue and purple hues, creating a different but equally beautiful photographic opportunity. While golden hour is warm and bright, blue hour is cool and moody, perfect for cityscapes and silhouettes.
              </p>
            </div>
          </div>
        </section>

        {/* Sunset Quality & Weather */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-blue-500">
            🌤️ Sunset Quality & Weather
          </h2>

          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">How do you predict sunset quality?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our sunset quality predictions analyze multiple weather factors including cloud cover, humidity, atmospheric pressure, and particulate matter. The best sunsets often occur with 30-70% cloud coverage, low humidity, stable atmospheric pressure, and clear air. We use advanced weather models to forecast these conditions up to 7 days in advance, giving you a quality score from poor to excellent.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Why do weather apps sometimes predict poor sunsets when they turn out spectacular?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Weather prediction for sunset quality is inherently challenging because small changes in atmospheric conditions can dramatically affect the visual outcome. A cloud formation that develops just 15 minutes before sunset can create amazing colors that weren&apos;t predicted. That&apos;s why many photographers recommend going out regardless of predictions - some of the most spectacular sunsets happen when least expected.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">What weather conditions make the best sunsets?</h3>
              <p className="text-muted-foreground leading-relaxed">
                The most spectacular sunsets typically occur with scattered to broken clouds (30-70% coverage), clear air with low pollution, stable atmospheric conditions, and after storm systems pass through. High, thin cirrus clouds can create brilliant colors, while low, thick clouds may block the sun entirely. The key is having clouds in the right place to catch and reflect the sun&apos;s light without completely obscuring it.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">How far in advance can you predict sunset quality?</h3>
              <p className="text-muted-foreground leading-relaxed">
                We provide sunset quality forecasts up to 7 days in advance, with accuracy decreasing over time. Same-day and next-day predictions are most reliable, while forecasts 3-7 days out give you a general idea but may change as conditions develop. Weather models update every 6 hours, so we recommend checking back regularly for the most current predictions.
              </p>
            </div>
          </div>
        </section>

        {/* Photography & Technical */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-purple-500">
            📸 Sunset Photography
          </h2>

          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">When is the best time to arrive for sunset photography?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Arrive at your location 45-60 minutes before sunset to allow time for setup, test shots, and composition adjustments. The best light often starts 30 minutes before sunset and continues 30 minutes after. Don&apos;t leave immediately after sunset - blue hour provides excellent opportunities for different types of shots, especially in urban settings.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">What camera settings work best for golden hour photography?</h3>
              <p className="text-muted-foreground leading-relaxed">
                During golden hour, shoot in RAW format for maximum editing flexibility. Use a lower ISO (100-400) for better image quality. Start with aperture priority mode (f/8-f/11 for landscapes, f/1.4-f/2.8 for portraits). The light changes rapidly, so check your exposure frequently and consider bracketing important shots. A tripod becomes essential as light fades.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Why is golden hour better than midday for photography?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Golden hour light is warmer, softer, and more directional than harsh midday sun. The sun&apos;s low angle creates longer shadows and more dimensional lighting. For portraits, golden hour eliminates unflattering shadows under eyes and noses. For landscapes, it enhances textures and creates more dramatic scenes. The warm color temperature is also more pleasing and romantic than the cool, blue-tinted light of midday.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">How do I find the best sunset photography locations?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Look for locations with unobstructed western views for sunset shots. Elevated positions like hills, bridges, or tall buildings provide better vantage points. Consider interesting foreground elements like water, mountains, or architecture to add depth to your compositions. Use apps like PhotoPills or Sun Surveyor to determine exactly where the sun will set from your chosen location.
              </p>
            </div>
          </div>
        </section>

        {/* Using Nightfalls */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-green-500">
            🌟 Using Nightfalls
          </h2>

          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">How does Nightfalls differ from other sunset apps?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Nightfalls combines precise astronomical calculations with detailed weather forecasting to provide comprehensive sunset planning. Unlike basic weather apps, we specifically analyze atmospheric conditions that affect sunset quality. Our scoring system helps you prioritize which evenings are worth planning around, and our global coverage works anywhere in the world with location-specific accuracy. <Link href="/About" className="text-green-500 hover:text-green-600 underline">Learn more about our story and mission</Link>.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Do I need to create an account to use Nightfalls?</h3>
              <p className="text-muted-foreground leading-relaxed">
                No account is required! Nightfalls works immediately when you visit the site. Simply enter your location or allow location access, and you&apos;ll get instant sunset predictions. We don&apos;t store personal data or require registration - just real-time sunset forecasting when you need it.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Can I get sunset predictions for locations I&apos;m traveling to?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Absolutely! Nightfalls works globally. Simply search for any city, landmark, or address worldwide to get location-specific sunset times, golden hour duration, and quality predictions. This makes it perfect for travel planning, destination photography, or checking sunset conditions for any location you&apos;re considering visiting.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">How often are the predictions updated?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our weather data updates every 6 hours with the latest atmospheric conditions and forecasts. Sunset times are calculated in real-time based on your exact location and current date. We recommend checking back daily for the most current sunset quality predictions, especially for locations with rapidly changing weather patterns.
              </p>
            </div>
          </div>
        </section>

        {/* Technical & Troubleshooting */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-red-500">
            🔧 Technical & Troubleshooting
          </h2>

          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Why isn&apos;t my location being detected automatically?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Location detection requires permission in your browser settings. Check that location services are enabled for your browser and that you&apos;ve allowed nightfalls.ca to access your location. If automatic detection isn&apos;t working, you can manually search for your city or address in the location search box for equally accurate results.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Do sunset predictions work in all countries?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Yes! Nightfalls provides accurate sunset predictions worldwide. Our astronomical calculations work for any location on Earth, from tropical beaches to Arctic regions. Weather integration is available globally through our weather data providers, ensuring you get complete sunset forecasting no matter where you are.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">What should I do if the sunset quality prediction seems wrong?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Weather prediction is inherently uncertain, and sunset conditions can change rapidly. If you notice consistent discrepancies, ensure your location is set correctly and check that you&apos;re viewing the prediction for the right date and time. Remember that spectacular sunsets can occur even when predictions suggest otherwise - atmospheric conditions are complex and sometimes surprising!
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Can I use Nightfalls on mobile devices?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Yes! Nightfalls is fully responsive and works perfectly on smartphones and tablets. The interface adapts to your screen size, and all features including location detection, predictions, and weather data are available on mobile. Perfect for checking sunset conditions while you&apos;re already out and about.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="text-center mt-12 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
        <p className="text-muted-foreground mb-4">
          We&apos;re here to help! Reach out with any questions about sunset predictions, photography tips, or using Nightfalls.
        </p>
        <a
          href="mailto:info@si8tech.com"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
    </>
  );
};

export default FAQPage;