
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
        reject(new Error("ບໍ່ສາມາດອ່ານສະຕຣິງ base64 ຈາກໄຟລ໌ໄດ້."));
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
      const errorData = await response.json().catch(() => ({ error: "ຂໍ້ຜິດພາດເຄືອຂ່າຍ", message: `ການຮ້ອງຂໍລົ້ມເຫລວດ້ວຍສະຖານະ ${response.status}` }));
      return { 
        error: errorData.error || "ຂໍ້ຜິດພາດ API", 
        message: errorData.message || `ການຮ້ອງຂໍລົ້ມເຫລວດ້ວຍສະຖານະ ${response.status}` 
      };
    }

    const result = await response.json();
    return result as GeminiApiResponse;

  } catch (error: unknown) {
    console.error("Error calling identification function:", error);
    let errorMessage = "ເກີດຂໍ້ຜິດພາດທີ່ບໍ່ຄາດຄິດໃນຂະນະສື່ສານກັບບໍລິການກວດສອບ.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { error: "ຂໍ້ຜິດພາດຝັ່ງລູກຄ້າ", message: errorMessage };
  }
};
