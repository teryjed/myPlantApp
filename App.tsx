import React, { useState, useEffect, useCallback } from 'react';
import ImageInput from './components/ImageInput';
import LoadingSpinner from './components/LoadingSpinner';
import { identifyImage } from './services/geminiService';
import { PlantFruitIdentification, IdentificationError, GeminiApiResponse } from './types';
import { SparklesIcon, AlertTriangleIcon, LeafIcon } from './components/IconComponents';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<GeminiApiResponse | null>(null);
  // const [apiKeyMissingError, setApiKeyMissingError] = useState<boolean>(false); // Removed

  // Removed useEffect for API key check as it's now handled server-side

  const handleImageSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setScanResult(null); 
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl]);

  useEffect(() => {
    // Cleanup preview URL on component unmount or when previewUrl changes
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleScanImage = async () => {
    if (!selectedFile) return;
    // if (apiKeyMissingError) return; // Removed

    setIsLoading(true);
    setScanResult(null);
    try {
      const result = await identifyImage(selectedFile);
      setScanResult(result);
    } catch (err) {
      // This catch is mostly for unexpected client-side errors before API call
      // API errors are handled within identifyImage and returned as IdentificationError
      console.error("Client-side error during scan:", err);
      setScanResult({ error: "Client Error", message: "An error occurred before contacting the AI." });
    } finally {
      setIsLoading(false);
    }
  };

  const ResultCard: React.FC<{ title: string; value?: string }> = ({ title, value }) => {
    if (!value) return null;
    return (
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-green-700">{title}:</h3>
        <p className="text-gray-700 text-sm">{value}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 py-8 px-4 flex flex-col items-center">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <LeafIcon className="w-12 h-12 text-green-600" />
          <h1 className="text-4xl font-bold text-green-700 ml-3">Plant & Fruit Identifier</h1>
        </div>
        <p className="text-lg text-gray-600">Discover the world around you, one image at a time.</p>
      </header>

      <main className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-xl shadow-2xl space-y-6">
        {/* apiKeyMissingError display removed */}

        <ImageInput onImageSelected={handleImageSelected} disabled={isLoading /*|| apiKeyMissingError*/} />

        {previewUrl && (
          <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Image Preview:</h3>
            <img src={previewUrl} alt="Selected preview" className="max-w-full h-auto max-h-80 rounded-md shadow-md mx-auto" />
          </div>
        )}

        {selectedFile && /* !apiKeyMissingError && */ (
          <button
            onClick={handleScanImage}
            disabled={isLoading || !selectedFile}
            className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg shadow-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 transition-all duration-150 transform hover:scale-105 active:scale-95"
          >
            {isLoading ? (
              <LoadingSpinner className="w-6 h-6 text-white" />
            ) : (
              <SparklesIcon className="w-6 h-6 mr-2" />
            )}
            {isLoading ? 'Identifying...' : 'Scan Image with AI'}
          </button>
        )}

        {isLoading && !scanResult && (
          <div className="mt-6 text-center">
            <LoadingSpinner text="Analyzing image, please wait..." />
          </div>
        )}

        {scanResult && (
          <div className="mt-6 p-6 bg-green-50 rounded-lg shadow-inner border border-green-200">
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Identification Result:</h2>
            {(scanResult as IdentificationError).error ? (
              <div className="text-red-700 bg-red-100 p-4 rounded-md border border-red-300">
                <div className="flex items-center mb-1">
                  <AlertTriangleIcon className="w-5 h-5 mr-2" />
                  <strong className="font-semibold">{(scanResult as IdentificationError).error}</strong>
                </div>
                <p className="text-sm">{(scanResult as IdentificationError).message || "Could not identify the item. Please try a different image or check your connection."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <ResultCard title="Common Name" value={(scanResult as PlantFruitIdentification).name} />
                <ResultCard title="Scientific Name" value={(scanResult as PlantFruitIdentification).scientific_name} />
                <ResultCard title="Description" value={(scanResult as PlantFruitIdentification).description} />
                <ResultCard title="Edible" value={(scanResult as PlantFruitIdentification).edible} />
                <ResultCard title="Origin" value={(scanResult as PlantFruitIdentification).origin} />
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Plant & Fruit Identifier. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default App;