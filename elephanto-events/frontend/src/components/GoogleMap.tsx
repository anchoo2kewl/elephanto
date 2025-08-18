import React from 'react';

interface GoogleMapProps {
  address: string;
  className?: string;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({ 
  address, 
  className = "" 
}) => {
  // Encode the address for the Google Maps embed URL
  const encodedAddress = encodeURIComponent(address);
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
  
  // If no API key, show a clickable fallback
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return (
      <div className={`relative h-72 ${className}`}>
        <div 
          className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform border-2 border-dashed border-gray-300 dark:border-gray-600"
          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')}
        >
          <div className="text-center text-gray-700 dark:text-gray-300 p-6">
            <div className="text-4xl mb-3">📍</div>
            <div className="text-lg font-semibold mb-2">View on Google Maps</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">{address}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Click to open in Google Maps
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Google Maps embed URL
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&zoom=15&maptype=roadmap`;

  return (
    <div className={`relative ${className}`}>
      <iframe
        src={mapUrl}
        width="100%"
        height="300"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="rounded-lg"
        title={`Map showing ${address}`}
      />
      
      {/* Overlay for opening in Google Maps */}
      <button
        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')}
        className="absolute top-2 right-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-md text-sm font-medium shadow-lg hover:shadow-xl transition-shadow"
      >
        Open in Maps
      </button>
    </div>
  );
};