import { GeminiApiResponse, PlantFruitIdentification, IdentificationError } from '../types';

// Helper function to convert file to base64 - can be kept client-side or moved
// For this implementation, the client will send base64 to the serverless function.
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // result is data:mime/type;base64,xxxxxxxxxx
      // We need to strip the prefix "data:mime/type;base64,"
      const base64String = result.split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error("Failed to read base64 string from file."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const identifyImage = async (imageFile: File): Promise<GeminiApiResponse> => {
  try {
    const base64ImageData = await fileToBase64(imageFile);

    const response = await fetch('/.netlify/functions/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64ImageData,
        mimeType: imageFile.type || 'image/jpeg',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Network Error", message: `Request failed with status ${response.status}` }));
      return { 
        error: errorData.error || "API Error", 
        message: errorData.message || `Request failed with status ${response.status}` 
      };
    }

    const result = await response.json();
    return result as GeminiApiResponse;

  } catch (error: unknown) {
    console.error("Error calling identification function:", error);
    let errorMessage = "An unexpected error occurred while communicating with the identification service.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { error: "Client-Side Error", message: errorMessage };
  }
};