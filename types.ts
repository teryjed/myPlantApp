
export interface PlantFruitIdentification {
  name: string;
  description: string;
  scientific_name?: string;
  edible?: string; // e.g., "Yes", "No", "Parts are edible"
  origin?: string;
}

export interface IdentificationError {
  error: string;
  message?: string;
}

export type GeminiApiResponse = PlantFruitIdentification | IdentificationError;
    