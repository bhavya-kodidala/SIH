/**
 * Open-Meteo Live Weather & Flood Hazard Intelligence
 * Free, keyless API providing real-time precipitation, wind, weather code,
 * and automated flood hazard risk assessment.
 */

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
const WMO_CODES = {
  0: { label: "Clear sky", hazard: "safe" },
  1: { label: "Mainly clear", hazard: "safe" },
  2: { label: "Partly cloudy", hazard: "safe" },
  3: { label: "Overcast", hazard: "safe" },
  45: { label: "Foggy", hazard: "low" },
  48: { label: "Depositing rime fog", hazard: "low" },
  51: { label: "Light drizzle", hazard: "low" },
  53: { label: "Moderate drizzle", hazard: "low" },
  55: { label: "Dense drizzle", hazard: "warn" },
  61: { label: "Slight rain", hazard: "low" },
  63: { label: "Moderate rain", hazard: "warn" },
  65: { label: "Heavy rain", hazard: "danger" },
  71: { label: "Slight snowfall", hazard: "low" },
  73: { label: "Moderate snow", hazard: "warn" },
  75: { label: "Heavy snow", hazard: "danger" },
  80: { label: "Slight rain showers", hazard: "low" },
  81: { label: "Moderate rain showers", hazard: "warn" },
  82: { label: "Violent rain showers", hazard: "critical" },
  95: { label: "Thunderstorm", hazard: "danger" },
  96: { label: "Thunderstorm with slight hail", hazard: "danger" },
  99: { label: "Severe thunderstorm with heavy hail", hazard: "critical" },
};

/**
 * Assess Flood & Hazard Risk based on precipitation rate and weather code
 */
function assessFloodRisk(rainMmPerHour, weatherCode, windSpeedKmh) {
  let level = "safe"; // safe | low | warn | danger | critical
  let title = "Normal Weather Conditions";
  let description = "No severe weather or flood threats detected in your area.";

  const codeInfo = WMO_CODES[weatherCode] || { label: "Unknown weather", hazard: "safe" };

  if (rainMmPerHour > 25 || weatherCode === 82 || weatherCode === 99) {
    level = "critical";
    title = "FLASH FLOOD & SEVERE STORM ALERT";
    description = `Extreme rainfall intensity (${rainMmPerHour} mm/h). High risk of flash flooding and waterlogging. Avoid low-lying areas.`;
  } else if (rainMmPerHour > 12 || weatherCode === 65 || weatherCode === 95 || weatherCode === 96) {
    level = "danger";
    title = "High Flood Hazard & Storm Watch";
    description = `Heavy precipitation (${rainMmPerHour} mm/h) and storm activity. Monitor local drainage and avoid travel.`;
  } else if (rainMmPerHour > 4 || weatherCode === 63 || weatherCode === 81 || windSpeedKmh > 40) {
    level = "warn";
    title = "Moderate Weather Advisory";
    description = `Steady rainfall (${rainMmPerHour} mm/h) or gusty winds (${windSpeedKmh} km/h). Roadways may be slippery.`;
  } else if (rainMmPerHour > 0.5 || codeInfo.hazard === "low") {
    level = "low";
    title = "Light Rain / Overcast";
    description = `Mild precipitation (${rainMmPerHour} mm/h). No immediate flood hazard.`;
  }

  return { level, title, description, codeInfo };
}

/**
 * Fetch real live weather and compute flood hazard indicators
 */
export async function fetchLiveWeatherAndHazard(lat, lng) {
  if (lat == null || lng == null) return null;

  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m&hourly=precipitation_probability&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather service responded with status ${res.status}`);
  }

  const data = await res.json();
  const current = data?.current || {};

  const temp = Math.round(current.temperature_2m ?? 0);
  const feelsLike = Math.round(current.apparent_temperature ?? temp);
  const humidity = Math.round(current.relative_humidity_2m ?? 0);
  const rain = current.rain ?? current.precipitation ?? 0;
  const windSpeed = Math.round(current.wind_speed_10m ?? 0);
  const windGusts = Math.round(current.wind_gusts_10m ?? windSpeed);
  const weatherCode = current.weather_code ?? 0;

  const hazard = assessFloodRisk(rain, weatherCode, windSpeed);

  return {
    temp,
    feelsLike,
    humidity,
    rain, // mm/hour
    windSpeed, // km/h
    windGusts, // km/h
    weatherCode,
    condition: hazard.codeInfo.label,
    hazardLevel: hazard.level, // 'safe' | 'low' | 'warn' | 'danger' | 'critical'
    hazardTitle: hazard.title,
    hazardDescription: hazard.description,
    timestamp: Date.now(),
  };
}
