
import React, { useRef } from 'react';
import { UploadIcon, CameraIcon } from './IconComponents';

interface ImageInputProps {
  onImageSelected: (file: File) => void;
  disabled?: boolean;
}

const ImageInput: React.FC<ImageInputProps> = ({ onImageSelected, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageSelected(event.target.files[0]);
    }
    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        disabled={disabled}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment" // Prioritize back camera
        onChange={handleFileChange}
        ref={cameraInputRef}
        className="hidden"
        disabled={disabled}
      />
      <button
        onClick={triggerFileInput}
        disabled={disabled}
        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors duration-150"
        aria-label="ອັບໂຫຼດຮູບ"
      >
        <UploadIcon className="w-5 h-5 mr-2" />
        ອັບໂຫຼດຮູບ
      </button>
      <button
        onClick={triggerCameraInput}
        disabled={disabled}
        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors duration-150"
        aria-label="ໃຊ້ກ້ອງຖ່າຍຮູບ"
      >
        <CameraIcon className="w-5 h-5 mr-2" />
        ໃຊ້ກ້ອງຖ່າຍຮູບ
      </button>
    </div>
  );
};

export default ImageInput;
