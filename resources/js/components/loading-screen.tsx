// components/common/LoadingScreen.tsx
import React from 'react';

const LoadingScreen: React.FC<{ message?: string }> = ({
    message = "Cargando..."
}) => (
    <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">{message}</p>
        </div>
    </div>
);

export default LoadingScreen;
