export const CNTower = () => {
  return (
    <div className="flex flex-col items-center">
      {/* CN Tower */}
      <div className="relative">
        {/* Main tower structure */}
        <div className="w-1 h-16 bg-gray-600 dark:bg-gray-400 mx-auto"></div>
        
        {/* Observation deck */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <div className="w-3 h-1 bg-gray-700 dark:bg-gray-300 rounded-full"></div>
        </div>
        
        {/* Restaurant/pod */}
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-1 bg-gray-600 dark:bg-gray-400 rounded-full"></div>
        </div>
        
        {/* Antenna */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <div className="w-px h-4 bg-gray-700 dark:bg-gray-300"></div>
        </div>
        
        {/* Spire tip */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="w-1 h-1 bg-red-500 rounded-full"></div>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">CN Tower</div>
    </div>
  );
};
