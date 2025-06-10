
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeminiApiResponse, PlantFruitIdentification, IdentificationError } from '../types';

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.error("ຕົວແປສະພາບແວດລ້ອມ API_KEY ບໍ່ໄດ້ຖືກຕັ້ງ. ແອັບພລິເຄຊັນຈະບໍ່ສາມາດເຊື່ອມຕໍ່ກັບ Gemini API ໄດ້.");
  // Note: We are not throwing an error here to allow the app to load,
  // but API calls will fail. The UI should handle this gracefully.
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); // Provide a dummy if missing to avoid constructor error
const model = 'gemini-2.5-flash-preview-04-17';

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
  if (!API_KEY) {
    return { error: "Configuration Error", message: "ລະຫັດ API ບໍ່ໄດ້ຖືກຕັ້ງຄ່າ." };
  }

  try {
    const base64ImageData = await fileToBase64(imageFile);

    const imagePart = {
      inlineData: {
        mimeType: imageFile.type || 'image/jpeg', // Use file's MIME type or default
        data: base64ImageData,
      },
    };

    const textPart = {
      text: `Identify the plant or fruit in this image.
Respond in JSON format. The JSON keys MUST be in English as specified below.
IMPORTANT: The values for 'name', 'description', 'edible', and 'origin' MUST be in Lao. The 'scientific_name' should be the standard scientific term.
The JSON structure is:
{
  "name": "ຊື່ສາມັນເປັນພາສາລາວ", 
  "scientific_name": "Scientific Name (if known, otherwise skip, do not translate this field)", 
  "description": "ລາຍລະອຽດໂດຍຫຍໍ້ເປັນພາສາລາວ (2-4 ປະໂຫຍກ, ລວມທັງລັກສະນະທາງສາຍຕາ, ການນຳໃຊ້ທົ່ວໄປ, ຫຼື ຂໍ້ເທັດຈິງທີ່ໜ້າສົນໃຈ)",
  "edible": "ຂໍ້ມູນການກິນໄດ້ເປັນພາສາລາວ (ຕົວຢ່າງ: 'ກິນໄດ້', 'ກິນບໍ່ໄດ້', 'ບາງສ່ວນກິນໄດ້', 'ເປັນພິດ', 'ບໍ່ຮູ້ຂໍ້ມູນ')",
  "origin": "ແຫຼ່ງກຳເນີດທາງພູມສາດ ຫຼື ເຂດທີ່ພົບເຫັນທົ່ວໄປເປັນພາສາລາວ (ຖ້າຮູ້, ຖ້າບໍ່ຮູ້ໃຫ້ຂ້າມໄປ)"
}. 
If unsure or if it's not a plant/fruit, return JSON with 'error' and 'message' fields, where the 'message' value MUST be in Lao:
{"error": "Unable to identify", "message": "ຂໍ້ຄວາມສະແດງຄວາມຜິດພາດເປັນພາສາລາວ, ເຊັ່ນ: ຮູບພາບອາດຈະບໍ່ມີພືດ ຫຼື ໝາກໄມ້ທີ່ສາມາດກວດສອບໄດ້, ຫຼື ຄຸນນະພາບຂອງຮູບຕ່ຳເກີນໄປ."}.
Focus on being informative and concise. All specified textual values must be in Lao, except for scientific_name.`
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        temperature: 0.5, 
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as GeminiApiResponse;
    
    // Fallback translation for a very specific English message, in case AI fails to translate it.
    // This is a safeguard; ideally, the AI provides the Lao message directly as per the prompt.
    if ((parsedData as IdentificationError).error && (parsedData as IdentificationError).message === "The image may not contain a recognizable plant or fruit, or the quality is too low.") {
        (parsedData as IdentificationError).message = "ຮູບພາບອາດຈະບໍ່ມີພືດ ຫຼື ໝາກໄມ້ທີ່ສາມາດກວດສອບໄດ້, ຫຼື ຄຸນນະພາບຂອງຮູບຕ່ຳເກີນໄປ.";
    }
    return parsedData;

  } catch (error: unknown) {
    console.error("Error identifying image:", error);
    let errorMessage = "An unexpected error occurred during identification."; 
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { error: "API Error", message: `ເກີດຂໍ້ຜິດພາດໃນການເຊື່ອມຕໍ່ API: ${errorMessage}` };
  }
};
