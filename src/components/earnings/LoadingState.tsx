
import React from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';

const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      <Footer />
    </div>
  );
};

export default LoadingState;
