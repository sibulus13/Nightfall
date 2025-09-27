export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nightfalls",
    "url": "https://www.nightfalls.ca",
    "logo": "https://www.nightfalls.ca/favicon.png",
    "description": "Find the perfect sunset times, golden hour predictions, and sunset quality forecasts for any location worldwide.",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "info@si8tech.com",
      "contactType": "Customer Service"
    },
    "sameAs": [],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "CA"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Nightfalls",
    "url": "https://www.nightfalls.ca",
    "description": "Best sunset times and golden hour predictions worldwide",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://www.nightfalls.ca/App?location={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Nightfalls Sunset Predictor",
    "url": "https://www.nightfalls.ca/App",
    "description": "Get accurate sunset predictions, golden hour timing, and weather forecasts to capture stunning sunset photos anywhere in the world.",
    "applicationCategory": "Photography, Weather",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Sunset time predictions",
      "Golden hour calculations",
      "Weather integration",
      "Sunset quality forecasting",
      "Global location support",
      "Photography timing"
    ],
    "screenshot": "https://www.nightfalls.ca/og-image.jpg"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is golden hour and when does it occur?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Golden hour refers to the period shortly after sunrise and before sunset when the sun is low on the horizon (typically between 6 degrees below and 6 degrees above the horizon). During this time, the light is warmer, softer, and more flattering than midday sun. Golden hour typically lasts 1-2 hours near the equator, but can be much longer at higher latitudes, especially during certain seasons."
        }
      },
      {
        "@type": "Question",
        "name": "How accurate are sunset time predictions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sunset times are calculated using precise astronomical formulas and are accurate to within one minute for most locations. However, factors like elevation, atmospheric conditions, and local geography can affect the exact moment you see the sun disappear. Our predictions account for your specific location and elevation for maximum accuracy."
        }
      },
      {
        "@type": "Question",
        "name": "How does location affect sunset times?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Your latitude dramatically affects sunset timing and duration. Near the equator, sunset times change minimally throughout the year and golden hour is shorter. At higher latitudes, sunset times vary greatly by season - in summer, sunset can occur very late with extended golden hours, while winter brings early sunsets. Your elevation also matters: higher altitudes see the sun longer."
        }
      },
      {
        "@type": "Question",
        "name": "How do you predict sunset quality?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our sunset quality predictions analyze multiple weather factors including cloud cover, humidity, atmospheric pressure, and particulate matter. The best sunsets often occur with 30-70% cloud coverage, low humidity, stable atmospheric pressure, and clear air. We use advanced weather models to forecast these conditions up to 7 days in advance, giving you a quality score from poor to excellent."
        }
      },
      {
        "@type": "Question",
        "name": "When is the best time to arrive for sunset photography?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Arrive at your location 45-60 minutes before sunset to allow time for setup, test shots, and composition adjustments. The best light often starts 30 minutes before sunset and continues 30 minutes after. Don't leave immediately after sunset - blue hour provides excellent opportunities for different types of shots, especially in urban settings."
        }
      },
      {
        "@type": "Question",
        "name": "How does Nightfalls differ from other sunset apps?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nightfalls combines precise astronomical calculations with detailed weather forecasting to provide comprehensive sunset planning. Unlike basic weather apps, we specifically analyze atmospheric conditions that affect sunset quality. Our scoring system helps you prioritize which evenings are worth planning around, and our global coverage works anywhere in the world with location-specific accuracy."
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}