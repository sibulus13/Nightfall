export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nightfalls",
    "url": "https://www.nightfalls.ca",
    "logo": "https://www.nightfalls.ca/favicon.png",
    "description": "Plan sunset photography with sunset quality forecasts, golden hour timing, blue hour guidance, and nearby viewpoint recommendations.",
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
    "description": "Sunset forecasts, golden hour times, blue hour guidance, and nearby sunset photography spot recommendations.",
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
    "description": "Get sunset predictions, golden hour timing, blue hour guidance, weather forecasts, and nearby viewpoint recommendations for sunset photography.",
    "applicationCategory": "PhotographyApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Sunset time predictions",
      "Golden hour calculations",
      "Blue hour and twilight guidance",
      "Nearby sunset spot recommendations",
      "Map-based viewpoint scouting",
      "Phase-specific sunset photography scoring",
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
        "name": "What is golden hour?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Golden hour is the warm, low-angle light before sunset or after sunrise. It is usually best for portraits, foreground texture, side light, and scenes where you want warm color on the subject."
        }
      },
      {
        "@type": "Question",
        "name": "What is the sun disk phase?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The sun disk phase is the short window when the visible sun is close to the horizon. It is best for silhouettes, compressed telephoto compositions, clean horizon lines, and scenes where the actual circle of the sun matters."
        }
      },
      {
        "@type": "Question",
        "name": "What is blue hour?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Blue hour is the period after sunset when the sun is below the horizon and the sky turns cooler blue. It is especially useful for city lights, water reflections, silhouettes, and calmer contrast."
        }
      },
      {
        "@type": "Question",
        "name": "What is the Belt of Venus?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Belt of Venus is the pink or purple band that appears opposite the sunset direction shortly after sunset. For this phase, the best composition may face away from the sun toward the antisolar sky."
        }
      },
      {
        "@type": "Question",
        "name": "What is civil twilight?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Civil twilight is the brighter twilight period just after sunset, before the sky becomes fully dark. It is useful for balanced landscape detail, soft color, and photos where you still want readable foregrounds."
        }
      },
      {
        "@type": "Question",
        "name": "How do you predict sunset quality?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nightfalls combines astronomical timing with forecast signals such as cloud layers, visibility, humidity, pressure, precipitation, air quality, and atmospheric stability. The score is a planning signal, not a guarantee."
        }
      },
      {
        "@type": "Question",
        "name": "How does Nightfalls recommend sunset locations?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The recommendation model looks for map and local-reference signals such as water, elevation, viewpoints, parks, beaches, open horizons, western exposure, public access, and phase-specific fit."
        }
      },
      {
        "@type": "Question",
        "name": "Can I compare my own saved locations?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Use the map planner to save up to five pins, compare forecasts by date, and add recommended spots into your prediction set."
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
