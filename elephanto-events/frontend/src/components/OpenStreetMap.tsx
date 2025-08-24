import React, { useState, useEffect } from 'react';

interface OpenStreetMapProps {
  address: string;
  className?: string;
}

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
}

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({ 
  address, 
  className = "" 
}) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Encode the address for OpenStreetMap
  const encodedAddress = encodeURIComponent(address);
  
  // Geocode the address using Nominatim API
  useEffect(() => {
    const geocodeAddress = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use Nominatim API to geocode the address
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
          {
            headers: {
              'User-Agent': 'ElephanTO Events App'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Geocoding failed');
        }
        
        const results: GeocodingResult[] = await response.json();
        
        if (results.length > 0) {
          const result = results[0];
          setCoordinates({
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon)
          });
        } else {
          throw new Error('Address not found');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setError('Unable to load map for this address');
        // Fallback to a default Toronto location
        setCoordinates({ lat: 43.647, lon: -79.397 });
      } finally {
        setLoading(false);
      }
    };
    
    if (address) {
      geocodeAddress();
    }
  }, [address, encodedAddress]);
  
  // Generate map URL with proper zoom level
  const getMapUrl = () => {
    if (!coordinates) return '';
    
    const { lat, lon } = coordinates;
    // Create a tight bounding box around the location for good zoom
    const offset = 0.002; // Approximately 200m at Toronto latitude
    const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
    
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  };
  
  if (loading) {
    return (
      <div className={`relative ${className} h-72 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center`}>
        <div className="text-gray-600 dark:text-gray-400">Loading map...</div>
      </div>
    );
  }
  
  if (error && !coordinates) {
    return (
      <div className={`relative ${className} h-72 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
           onClick={() => window.open(`https://www.openstreetmap.org/search?query=${encodedAddress}`, '_blank')}>
        <div className="text-center text-gray-600 dark:text-gray-400 p-6">
          <div className="text-4xl mb-3">📍</div>
          <div className="text-lg font-semibold mb-2">View on OpenStreetMap</div>
          <div className="text-sm mb-3">{address}</div>
          <div className="text-xs">Click to search on OpenStreetMap</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      <iframe
        src={getMapUrl()}
        width="100%"
        height="300"
        style={{ border: 0 }}
        loading="lazy"
        className="rounded-lg"
        title={`Map showing ${address}`}
      />
      
      
      {/* Fallback clickable area */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={() => window.open(`https://www.openstreetmap.org/search?query=${encodedAddress}`, '_blank')}
        title={`Click to view ${address} on OpenStreetMap`}
      />
    </div>
  );
};