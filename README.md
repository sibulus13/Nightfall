# Nightfalls - Sunset Quality Forecast

A web application that provides location-based weekly sunset quality forecasts with interactive maps and detailed predictions.

## Live Site

https://www.nightfalls.ca/

## Features

- **Sunset Score Predictions**: Get weekly sunset quality forecasts for any location
- **Interactive Map View**: Visualize sunset scores across a grid with Google Maps integration
- **Global Coverage**: Works worldwide from Vancouver to Sydney
- **Photographer-Friendly**: Includes golden hour timing and weather conditions
- **Real-time Location**: Use your current location or search for any place
- **Responsive Design**: Works on desktop and mobile devices

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
