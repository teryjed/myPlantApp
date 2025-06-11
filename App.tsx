
import React, { useState, useEffect, useCallback } from 'react';
import ImageInput from './components/ImageInput';
import LoadingSpinner from './components/LoadingSpinner';
import { identifyImage } from './services/geminiService';
import { PlantFruitIdentification, IdentificationError, GeminiApiResponse } from './types';
import { SparklesIcon, AlertTriangleIcon, LeafIcon } from './components/IconComponents';

// Type guard to check if the result is an IdentificationError
const isIdentificationError = (result: GeminiApiResponse): result is IdentificationError => {
  return (result as IdentificationError).error !== undefined;
};

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<GeminiApiResponse | null>(null);

  const handleImageSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setScanResult(null); 
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleScanImage = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setScanResult(null);
    try {
      const result = await identifyImage(selectedFile);
      setScanResult(result);
    } catch (err) {
      console.error("Client-side error during scan:", err);
      setScanResult({ error: "ຂໍ້ຜິດພາດຝັ່ງລູກຄ້າ", message: "ເກີດຂໍ້ຜິດພາດກ່ອນຕິດຕໍ່ຫາ AI." });
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
          <h1 className="text-4xl font-bold text-green-700 ml-3">ເຄື່ອງມືກວດສອບພືດ ແລະ ໝາກໄມ້</h1>
        </div>
        <p className="text-lg text-gray-600">ສຳຫຼວດໂລກອ້ອມຕົວທ່ານ, ເທື່ອລະຮູບ.</p>
      </header>

      <main className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-xl shadow-2xl space-y-6">
        <ImageInput onImageSelected={handleImageSelected} disabled={isLoading} />

        {previewUrl && (
          <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">ສະແດງຕົວຢ່າງຮູບ:</h3>
            <img src={previewUrl} alt="Selected preview" className="max-w-full h-auto max-h-80 rounded-md shadow-md mx-auto" />
          </div>
        )}

        {selectedFile && (
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
            {isLoading ? 'ກໍາລັງກວດສອບ...' : 'ສະແກນຮູບດ້ວຍ AI'}
          </button>
        )}

        {isLoading && !scanResult && (
          <div className="mt-6 text-center">
            <LoadingSpinner text="ກໍາລັງວິເຄາະຮູບ, ກະລຸນາລໍຖ້າ..." />
          </div>
        )}

        {scanResult && (
          <div className="mt-6 p-6 bg-green-50 rounded-lg shadow-inner border border-green-200">
            <h2 className="text-2xl font-semibold text-green-800 mb-4">ຜົນການກວດສອບ:</h2>
            {isIdentificationError(scanResult) ? (
              <div className="text-red-700 bg-red-100 p-4 rounded-md border border-red-300">
                <div className="flex items-center mb-1">
                  <AlertTriangleIcon className="w-5 h-5 mr-2" />
                  <strong className="font-semibold">{scanResult.error}</strong>
                </div>
                <p className="text-sm">{scanResult.message || "ບໍ່ສາມາດກວດສອບລາຍການໄດ້. ກະລຸນາລອງຮູບອື່ນ ຫຼື ກວດສອບການເຊື່ອມຕໍ່ຂອງທ່ານ."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <ResultCard title="ຊື່ສາມັນ" value={(scanResult as PlantFruitIdentification).name} />
                <ResultCard title="ຊື່ວິທະຍາສາດ" value={(scanResult as PlantFruitIdentification).scientific_name} />
                <ResultCard title="ລາຍລະອຽດ" value={(scanResult as PlantFruitIdentification).description} />
                <ResultCard title="ກິນໄດ້" value={(scanResult as PlantFruitIdentification).edible} />
                <ResultCard title="ແຫຼ່ງກຳເນີດ" value={(scanResult as PlantFruitIdentification).origin} />
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} ເຄື່ອງມືກວດສອບພືດ ແລະ ໝາກໄມ້. ສະໜັບສະໜູນໂດຍ Gemini AI.</p>
      </footer>
    </div>
  );
};

export default App;
