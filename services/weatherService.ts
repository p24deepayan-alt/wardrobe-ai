import type { Weather } from '../types';

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
const weatherCodeMap: { [key: number]: string } = {
  0: 'Sunny', // Clear sky
  1: 'Sunny', // Mainly clear
  2: 'Cloudy', // Partly cloudy
  3: 'Cloudy', // Overcast
  45: 'Cloudy', // Fog
  46: 'Cloudy', // Depositing rime fog
  51: 'Rainy', // Drizzle: Light intensity
  53: 'Rainy', // Drizzle: Moderate intensity
  55: 'Rainy', // Drizzle: Dense intensity
  61: 'Rainy', // Rain: Slight intensity
  63: 'Rainy', // Rain: Moderate intensity
  65: 'Rainy', // Rain: Heavy intensity
  80: 'Rainy', // Rain showers: Slight
  81: 'Rainy', // Rain showers: Moderate
  82: 'Rainy', // Rain showers: Violent
};

export const getWeather = async (latitude: number, longitude: number): Promise<Weather> => {
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Weather API request failed with status ${response.status}`);
    }
    const data = await response.json();
    
    if (!data.current) {
        throw new Error("Invalid response from weather API");
    }

    const temperature = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    const condition = weatherCodeMap[code] || 'Cloudy'; // Default to cloudy if code is unknown

    return {
      temperature,
      condition,
      unit: 'C',
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw new Error("Could not fetch current weather data. Please try again later.");
  }
};
