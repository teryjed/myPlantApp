
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Types (can be imported from a shared types.ts if preferred and build setup allows)
interface PlantFruitIdentification {
  name: string;
  description: string;
  scientific_name?: string;
  edible?: string;
  origin?: string;
}

interface IdentificationError {
  error: string;
  message?: string;
}

type GeminiApiResponse = PlantFruitIdentification | IdentificationError;

interface RequestBody {
  imageData: string; // base64 encoded image data
  mimeType: string;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "ວິທີການບໍ່ໄດ້ຮັບອະນຸຍາດ", message: "ຮັບສະເພາະການຮ້ອງຂໍແບບ POST ເທົ່ານັ້ນ." }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    console.error("API_KEY environment variable is not set in Netlify function environment.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ຂໍ້ຜິດພາດການຕັ້ງຄ່າ", message: "API Key ບໍ່ໄດ້ຖືກຕັ້ງຄ່າເທິງເຊີບເວີ." }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  let body: RequestBody;
  try {
    if (!event.body) {
      throw new Error("ເນື້ອໃນການຮ້ອງຂໍຫວ່າງເປົ່າ.");
    }
    const parsedBody = JSON.parse(event.body) as Partial<RequestBody>;
    if (typeof parsedBody.imageData !== 'string' || typeof parsedBody.mimeType !== 'string') {
      throw new Error("imageData ຫຼື mimeType ຂາດຫາຍໄປ ຫຼື ບໍ່ຖືກຕ້ອງໃນເນື້ອໃນການຮ້ອງຂໍ.");
    }
    body = { 
      imageData: parsedBody.imageData,
      mimeType: parsedBody.mimeType
    };
  } catch (error) {
    console.error("Error parsing request body:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "ການຮ້ອງຂໍບໍ່ຖືກຕ້ອງ", message: error instanceof Error ? error.message : "ເນື້ອໃນການຮ້ອງຂໍບໍ່ຖືກຕ້ອງ." }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const modelName = 'gemini-2.5-flash-preview-04-17';

  try {
    const imagePart = {
      inlineData: {
        mimeType: body.mimeType,
        data: body.imageData,
      },
    };

    const textPart = {
      text: `ກວດສອບພືດ ຫຼື ໝາກໄມ້ໃນຮູບນີ້. 
      ຕອບກັບໃນຮູບແບບ JSON ຕາມໂຄງສ້າງຕໍ່ໄປນີ້: 
      {
        "name": "ຊື່ສາມັນ", 
        "scientific_name": "ຊື່ວິທະຍາສາດ (ຖ້າຮູ້, ຖ້າບໍ່ຮູ້ໃຫ້ຂ້າມໄປ)", 
        "description": "ລາຍລະອຽດໂດຍຫຍໍ້ (2-4 ປະໂຫຍກ, ລວມທັງລັກສະນະທີ່ເບິ່ງເຫັນ, ການນຳໃຊ້ທົ່ວໄປ, ຫຼືຂໍ້ມູນທີ່ໜ້າສົນໃຈ)",
        "edible": "ຂໍ້ມູນການກິນໄດ້ (ຕົວຢ່າງ: 'ກິນໄດ້', 'ກິນບໍ່ໄດ້', 'ບາງສ່ວນກິນໄດ້', 'ເປັນພິດ', 'ບໍ່ຮູ້ຂໍ້ມູນ')",
        "origin": "ແຫຼ່ງກຳເນີດທາງພູມສາດ ຫຼື ເຂດທີ່ພົບເຫັນທົ່ວໄປ (ຖ້າຮູ້, ຖ້າບໍ່ຮູ້ໃຫ້ຂ້າມໄປ)"
      }. 
      ຖ້າບໍ່ແນ່ໃຈ ຫຼື ບໍ່ແມ່ນພືດ/ໝາກໄມ້, ໃຫ້ຕອບວ່າ {"error": "ບໍ່ສາມາດກວດສອບໄດ້", "message": "ຮູບພາບອາດບໍ່ມີພືດ ຫຼື ໝາກໄມ້ທີ່ສາມາດຈຳແນກໄດ້, ຫຼື ຄຸນນະພາບຂອງຮູບຕ່ຳເກີນໄປ."}.
      ເນັ້ນໃຫ້ຂໍ້ມູນທີ່ເປັນປະໂຫຍດ ແລະ ກະທັດຮັດ.`
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        temperature: 0.5, 
      }
    });

    const responseText = response.text; 

    if (typeof responseText !== 'string') {
        console.error("Gemini response text content is not a string or is missing:", responseText);
        throw new Error("Invalid response format from AI: Text content is not a string.");
    }

    let jsonStr = responseText.trim();
    const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s; 
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim(); 
    }
    
    const parsedData = JSON.parse(jsonStr) as GeminiApiResponse;

    return {
      statusCode: 200,
      body: JSON.stringify(parsedData),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: unknown) {
    console.error("Error identifying image with Gemini API:", error);
    let errorMessage = "ເກີດຂໍ້ຜິດພາດທີ່ບໍ່ຄາດຄິດໃນລະຫວ່າງການກວດສອບດ້ວຍແບບຈຳລອງ AI.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ຂໍ້ຜິດພາດຈາກບໍລິການ AI", message: errorMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
