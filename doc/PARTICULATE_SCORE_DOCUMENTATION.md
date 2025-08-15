# Smoke/Particulate Score Implementation for Sunset Prediction

## Overview

This document outlines the implementation of smoke/particulate matter scoring in the sunset prediction algorithm. The particulate score is a new component that evaluates how air quality conditions, specifically PM2.5 and PM10 levels, affect sunset quality, providing a more comprehensive assessment that accounts for the "pollution paradox."

## Scientific Justification

### Why Particulate Matter Matters for Sunsets

Particulate matter (PM2.5 and PM10) has a complex relationship with sunset quality that involves the well-documented "pollution paradox" - some air pollution can actually enhance sunset colors while reducing overall visibility and air quality:

#### 1. Light Scattering Enhancement

- **Fine particles (PM2.5)**: Scatter sunlight more effectively than larger particles
- **Optimal size range**: Particles in the 0.1-2.5 μm range are most effective at scattering blue light
- **Color enhancement**: This scattering can create more dramatic red/orange colors during sunset
- **Rayleigh scattering**: Fine particles enhance the natural scattering that makes skies blue and sunsets red

#### 2. Pollution Paradox

- **Moderate pollution (10-35 μg/m³ PM2.5)**: Can enhance sunset colors through optimal scattering
- **High pollution (>35 μg/m³ PM2.5)**: Typically reduces visibility too much despite potential color enhancement
- **Very low pollution (<5 μg/m³ PM2.5)**: May lack the scattering needed for dramatic colors
- **Urban observations**: Cities often have spectacular sunsets despite poor air quality

#### 3. Particle Size Effects

- **PM2.5 (≤2.5 μm)**: Most effective at scattering blue light, enhancing red/orange hues
- **PM10 (≤10 μm)**: Larger particles that can block more light and reduce visibility
- **Optimal enhancement**: Occurs with moderate PM2.5 levels (15-35 μg/m³)
- **Size distribution**: The ratio of PM2.5 to PM10 affects scattering efficiency

#### 4. Geographic and Seasonal Variations

- **Urban areas**: Often have higher baseline pollution but spectacular sunsets
- **Wildfire smoke**: Can create dramatic sunset effects but poor air quality
- **Industrial pollution**: Patterns vary by region and season
- **Coastal areas**: May have different particulate patterns due to sea salt aerosols

#### 5. Health vs. Aesthetic Considerations

- **Health impacts**: While pollution can enhance sunset colors, it's harmful to health
- **Balanced scoring**: The algorithm balances aesthetic appeal with air quality concerns
- **Very high pollution**: Penalized despite potential color enhancement
- **Public awareness**: Helps users understand the trade-offs between beauty and health

## Implementation Details

### Scoring Algorithm

The particulate score uses a tiered approach based on PM2.5 levels, with consideration for the pollution paradox:

```typescript
function particulateScore(prediction: PredictionData) {
  const pm2_5 = prediction.pm2_5;
  const pm10 = prediction.pm10;

  // Primary scoring based on PM2.5 levels
  if (pm2_5 > 55) {
    return 0.4; // Very high pollution - poor conditions and health risks
  }
  if (pm2_5 > 35) {
    return 0.6; // High pollution - reduced visibility despite potential color enhancement
  }
  if (pm2_5 > 15) {
    return 0.9; // Moderate pollution - optimal sunset enhancement
  }
  if (pm2_5 > 5) {
    return 0.95; // Good conditions - some enhancement without health risks
  }
  return 0.85; // Very clean air - may lack dramatic colors but excellent visibility
}
```

### Threshold Analysis

- **PM2.5 <5 μg/m³**: Very clean air, may lack dramatic colors (85% score)
- **PM2.5 5-15 μg/m³**: Good conditions, some enhancement without health risks (95% score)
- **PM2.5 15-35 μg/m³**: Moderate pollution, optimal sunset enhancement (90% score)
- **PM2.5 35-55 μg/m³**: High pollution, reduced visibility despite color enhancement (60% score)
- **PM2.5 >55 μg/m³**: Very high pollution, poor conditions and health risks (40% score)

### Integration with Overall Score

The particulate score is integrated into the overall sunset quality calculation using a multiplicative approach:

```typescript
score *= cCScore * vsScore * hScore * pScore * partScore;
```

This reflects the reality that particulate matter affects light transmission and scattering, which are fundamental to sunset quality.

## Technical Implementation

### API Changes

1. **Updated API Route**: Added air quality data fetching to the Open-Meteo API request

   ```typescript
   const airQualityUrl = `https://api.open-meteo.com/v1/airquality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,european_aqi`;
   ```

2. **Parallel Data Fetching**: Weather and air quality data are fetched simultaneously

   ```typescript
   const [weatherRes, airQualityRes] = await Promise.all([
     fetch(weatherUrl),
     fetch(airQualityUrl),
   ]);
   ```

3. **Type Definitions**: Updated types to include air quality data
   ```typescript
   export type AirQualityForecast = {
     hourly: {
       time: string[];
       pm10: number[];
       pm2_5: number[];
       european_aqi: number[];
       // ... other air quality parameters
     };
   };
   ```

### Data Processing

1. **Interpolation**: Air quality data is interpolated for sunset time
2. **Fallback values**: Default values (0) when air quality data is unavailable
3. **Type safety**: Proper handling of optional air quality data
4. **Error handling**: Graceful degradation when air quality API fails

### UI Updates

1. **Expandable Prediction Card**: Added particulate score to the 6-column score breakdown grid
2. **Sunset Details Component**: Added particulate score display with red color coding
3. **Tooltips**: Added descriptive tooltips for particulate score
4. **Visual indicators**: Color-coded display to show air quality impact

## Scientific Basis

The relationship between particulate matter and sunset quality is supported by:

### Atmospheric Science Research

- **Mie scattering theory**: Explains how particles scatter light based on size
- **Rayleigh scattering**: Natural scattering enhanced by particulate matter
- **Aerosol optical depth**: Measures how particles affect light transmission
- **Urban air quality studies**: Document the pollution paradox effect

### Observational Evidence

- **Urban sunsets**: Cities often have spectacular sunsets despite poor air quality
- **Wildfire events**: Dramatic sunset colors during smoke events
- **Industrial areas**: Enhanced sunset colors in polluted regions
- **Clean air areas**: Often have less dramatic but clearer sunsets

### Health Considerations

- **WHO guidelines**: PM2.5 levels above 35 μg/m³ are unhealthy
- **EPA standards**: PM2.5 levels above 55 μg/m³ are very unhealthy
- **Public health**: Balancing aesthetic appeal with health awareness
- **Environmental justice**: Air quality impacts vary by location and socioeconomic factors

## Limitations and Considerations

### Current Limitations

- **Data availability**: Air quality data may not be available in all regions
- **Temporal resolution**: Hourly data may not capture rapid changes
- **Geographic coverage**: Air quality monitoring varies by location
- **Complex interactions**: Particulate effects interact with other factors

### Future Improvements

- **Real-time data**: Integration with real-time air quality monitoring
- **Regional adjustments**: Location-specific particulate thresholds
- **Seasonal variations**: Adjustments for seasonal pollution patterns
- **Health warnings**: Integration with health advisory systems
- **Machine learning**: Optimization of particulate scoring weights

## Testing and Validation

### Recommended Testing Scenarios

1. **Clean air conditions** (<5 μg/m³ PM2.5) - should show good but not optimal scores
2. **Moderate pollution** (15-35 μg/m³ PM2.5) - should show optimal sunset enhancement scores
3. **High pollution** (35-55 μg/m³ PM2.5) - should show reduced scores due to visibility issues
4. **Very high pollution** (>55 μg/m³ PM2.5) - should show poor scores despite potential color enhancement

### Validation Metrics

- **Correlation analysis**: Between particulate scores and actual sunset quality
- **User feedback**: Subjective assessment of sunset predictions
- **Geographic validation**: Testing across different air quality regions
- **Seasonal patterns**: Validation during different pollution seasons

## Conclusion

The smoke/particulate score implementation provides a scientifically-grounded enhancement to the sunset prediction algorithm. By incorporating particulate matter as a key factor, the system can better predict sunset quality based on fundamental atmospheric science principles while acknowledging the complex "pollution paradox."

The particulate score complements existing factors (cloud coverage, visibility, humidity, pressure) by providing insight into air quality conditions that significantly affect light scattering and sunset colors. This creates a more comprehensive and accurate prediction system that balances aesthetic appeal with health considerations.

The implementation is designed to be robust, well-documented, and extensible for future improvements, including real-time air quality data integration and regional-specific optimizations.
