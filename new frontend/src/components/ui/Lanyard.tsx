import React, { useState } from 'react';

interface LanyardProps {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
  transparent?: boolean;
}

export default function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true
}: LanyardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position2D, setPosition2D] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const x = ((e.clientX - rect.left - centerX) / centerX) * 50;
      const y = ((e.clientY - rect.top - centerY) / centerY) * 30;
      setPosition2D({ x: Math.max(-50, Math.min(50, x)), y: Math.max(-30, Math.min(30, y)) });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Animate back to center
    setTimeout(() => {
      setPosition2D({ x: 0, y: 0 });
    }, 100);
  };

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background particles effect */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 15 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-green-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Lanyard container */}
      <div className="relative flex flex-col items-center">
        {/* Rope/Lanyard cord */}
        <div className="relative">
          {/* Main rope segments */}
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="w-2 h-6 bg-gradient-to-b from-gray-600 to-gray-800 mx-auto mb-1 rounded-full shadow-sm border border-gray-700"
              style={{
                transform: `translateX(${position2D.x * (i / 4) * 0.08}px) rotate(${position2D.x * 0.03}deg)`,
                transition: isDragging ? 'none' : 'transform 1.2s cubic-bezier(0.23, 1, 0.32, 1)'
              }}
            />
          ))}
          
          {/* Connection point */}
          <div 
            className="w-4 h-4 bg-gray-800 rounded-full mx-auto shadow-lg border-2 border-green-500"
            style={{
              transform: `translateX(${position2D.x * 0.06}px)`,
              transition: isDragging ? 'none' : 'transform 1.2s cubic-bezier(0.23, 1, 0.32, 1)'
            }}
          />
        </div>

        {/* Certificate Card */}
        <div
          className={`relative mt-2 transform ${isDragging ? 'cursor-grabbing' : 'hover:scale-105 cursor-grab transition-transform duration-300'}`}
          style={{
            transform: `translate(${position2D.x}px, ${position2D.y}px) rotate(${position2D.x * 0.08}deg) ${isDragging ? 'scale(1.03)' : ''}`,
            transition: isDragging ? 'none' : 'transform 1.2s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Card shadow */}
          <div className="absolute inset-0 bg-black opacity-20 blur-xl transform translate-y-4 translate-x-2 rounded-xl" />
          
          {/* Main card */}
          <div className="relative w-64 h-80 bg-gradient-to-br from-black via-gray-900 to-black rounded-xl border-2 border-green-500 shadow-2xl overflow-hidden">
            {/* Card shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-green-400/10 to-transparent transform -skew-x-12 translate-x-full animate-pulse" />
            
            {/* Card content */}
            <div className="relative p-4 h-full flex flex-col justify-center text-white z-10">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg border-2 border-green-300">
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">NFT Certificate</h3>
                <p className="text-xs opacity-90 text-green-200">Blockchain Verified ✓</p>
              </div>
              
              {/* Details */}
              <div className="space-y-3 text-xs mb-6">
                <div className="flex justify-between items-center p-2 bg-gray-800/60 rounded-md backdrop-blur-sm border border-green-500/30">
                  <span className="opacity-75 text-gray-300">Event:</span>
                  <span className="font-semibold text-green-400">Web3 Workshop</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-800/60 rounded-md backdrop-blur-sm border border-green-500/30">
                  <span className="opacity-75 text-gray-300">Network:</span>
                  <span className="font-semibold text-green-400">Base Sepolia</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="text-center">
                <div className="w-full h-1.5 bg-gradient-to-r from-green-500 via-green-400 to-green-600 rounded-full mb-2 shadow-lg"></div>
                <p className="text-xs opacity-60 text-gray-300">0x.Certs Platform</p>
              </div>
            </div>
            
            {/* Holographic effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-green-400/10 to-green-600/20 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-xs text-green-400 opacity-70 font-medium">
        Click and drag the certificate
      </div>
    </div>
  );
}