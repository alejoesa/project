import React from 'react';
import { FileUploader } from './components/FileUploader';
import { CloudCog } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <CloudCog className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            S3 File Uploader
          </h1>
          <p className="text-lg text-gray-600">
            Easily upload your files to Amazon S3
          </p>
        </div>
        
        <FileUploader />
        
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Secure file upload powered by AWS S3</p>
        </footer>
      </div>
    </div>
  );
}

export default App;