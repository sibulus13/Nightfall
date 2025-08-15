# Nightfalls - Best Sunset Times & Golden Hour Predictions Worldwide

**Find the perfect sunset times, golden hour predictions, and sunset quality forecasts for any location worldwide.**

Nightfalls is your ultimate companion for sunset planning, photography, and viewing. Get accurate sunset predictions, golden hour timing, weather conditions, and quality scores to capture stunning sunset photos anywhere in the world.

## Live Site

https://www.nightfalls.ca/

## 🌅 Key Features

- **Accurate Sunset Predictions**: Get precise sunset times and quality forecasts for any location
- **Golden Hour Calculator**: Perfect timing for photographers with detailed golden hour predictions
- **Interactive Sunset Map**: Visualize sunset quality scores across locations with Google Maps
- **Global Sunset Coverage**: Works worldwide - from Hawaii beaches to Swiss mountains
- **Weather-Integrated Forecasts**: Sunset quality scores based on weather conditions and atmospheric factors
- **Photographer's Toolkit**: Golden hour timing, weather forecasts, and sunset quality scores
- **Real-time Location**: Use GPS or search any location for instant sunset predictions
- **Weekly Sunset Planning**: Plan your week with detailed 7-day sunset forecasts
- **Mobile-Optimized**: Perfect sunset planning on any device

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **State Management**: Redux Toolkit
- **Maps**: Google Maps API with @vis.gl/react-google-maps
- **Database**: MongoDB with Mongoose
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB database
- Google Maps API key

### Installation

1. Clone the repository

```bash
git clone https://github.com/sibulus13/Nightfall.git
cd Nightfall
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
```

Create a `.env.local` file based on `.env.example` and add your environment variables:

````

4. Run the development server

```bash
npm run dev
````

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. **Select Location**: Use the location search or click "Use My Location"
2. **View Predictions**: See weekly sunset quality scores in card format
3. **Map View**: Switch to map view to see scores across a grid
4. **Date Selection**: Choose specific days to view predictions
5. **Toggle Markers**: Show all markers or just top-scoring locations

## API Endpoints

- `GET /api/forecast/sunset` - Get sunset predictions for a location

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Links

- [Live Demo](https://nightfall-nine.vercel.app)
- [GitHub Repository](https://github.com/sibulus13/Nightfall)
