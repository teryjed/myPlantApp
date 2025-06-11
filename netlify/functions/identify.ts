
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
      body: JSON.stringify({ error: "Method Not Allowed", message: "Only POST requests are accepted." }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    console.error("API_KEY environment variable is not set in Netlify function environment.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuration Error", message: "API Key is not configured on the server." }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  let body: RequestBody;
  try {
    if (!event.body) {
      throw new Error("Request body is empty.");
    }
    body = JSON.parse(event.body);
    if (!body.imageData || !body.mimeType) {
      throw new Error("Missing imageData or mimeType in request body.");
    }
  } catch (error) {
    console.error("Error parsing request body:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad Request", message: error instanceof Error ? error.message : "Invalid request body." }),
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
      text: `Identify the plant or fruit in this image. 
      Respond in JSON format with the following structure: 
      {
        "name": "Common Name", 
        "scientific_name": "Scientific Name (if known, otherwise skip)", 
        "description": "A brief description (2-4 sentences, including visual characteristics, common uses, or interesting facts)",
        "edible": "Provide edibility information (e.g., 'Yes', 'No', 'Parts are edible', 'Toxic', 'Unknown')",
        "origin": "Geographical origin or common regions (if known, otherwise skip)"
      }. 
      If unsure or if it's not a plant/fruit, return {"error": "Unable to identify", "message": "The image may not contain a recognizable plant or fruit, or the quality is too low."}.
      Focus on being informative and concise.`
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        temperature: 0.5, // A moderate temperature for factual but slightly creative descriptions
      }
    });

    const responseText = response.text; // Access the text property directly

    if (typeof responseText !== 'string') {
        console.error("Gemini response text content is not a string or is missing:", responseText);
        throw new Error("Invalid response format from AI: Text content is not a string.");
    }

    let jsonStr = responseText.trim();
    const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s; // Regex to remove markdown code fences
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim(); // Get the content within the fences and trim again
    }
    
    const parsedData = JSON.parse(jsonStr) as GeminiApiResponse;

    return {
      statusCode: 200,
      body: JSON.stringify(parsedData),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: unknown) {
    console.error("Error identifying image with Gemini API:", error);
    let errorMessage = "An unexpected error occurred during identification with the AI model.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "AI Service Error", message: errorMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
