import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ClothingCategory } from '../types';
import type { ClothingItem, Outfit, ShoppingSuggestion, Weather } from '../types';

const API_KEY = process.env.API_KEY; 
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });
const textModel = 'gemini-2.5-flash';
const visionModel = 'gemini-2.5-flash-image';


const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const base64ToGenerativePart = (base64Data: string, mimeType: string = 'image/jpeg') => {
    const data = base64Data.startsWith('data:') ? base64Data.split(',')[1] : base64Data;
    return { inlineData: { data, mimeType } };
};

const clothingCategories = Object.values(ClothingCategory).join(', ');

export const analyzeImage = async (file: File): Promise<Partial<ClothingItem>> => {
  const imagePart = await fileToGenerativePart(file);
  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isRetry = attempt > 1;
    const retryInstruction = isRetry 
      ? `Your previous attempt returned an invalid category. Please try again. This is attempt ${attempt}.` 
      : '';
    const prompt = `${retryInstruction} Analyze the clothing item in the image. Identify its name, color, style (e.g., Casual, Formal, Sporty), and category. The category must be one of the following: ${clothingCategories}. Provide the output as a JSON object.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: { parts: [{text: prompt}, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: 'A descriptive name for the item, e.g., "Blue Denim Jeans".' },
                        category: { type: Type.STRING, description: `The category of the item. Must be one of: ${clothingCategories}.` },
                        color: { type: Type.STRING, description: 'The dominant color of the item.' },
                        style: { type: Type.STRING, description: 'The style of the item, e.g., Casual, Formal, Vintage.' },
                    }
                }
            }
        });
        
        const jsonString = response.text;
        const result = JSON.parse(jsonString) as Partial<ClothingItem>;
        
        const validCategories = Object.values(ClothingCategory);
        if (result.category && validCategories.includes(result.category)) {
            return result;
        } else {
            console.warn(`Attempt ${attempt} failed: Invalid category "${result.category}". Retrying...`);
            lastError = new Error(`The AI returned an invalid category: "${result.category}".`);
        }

    } catch (error) {
        console.error(`Error analyzing image with Gemini on attempt ${attempt}:`, error);
        lastError = error instanceof Error ? error : new Error("An unknown error occurred during image analysis.");
    }
  }

  console.error("All attempts to analyze image failed.");
  throw new Error(`Failed to classify the item after ${MAX_ATTEMPTS} attempts. Please try a different image or add the item details manually.`);
};

interface GeneratedOutfit {
    name: string;
    occasion: string;
    itemIds: string[];
    explanation: string;
}

export const generateOutfits = async (
    items: ClothingItem[],
    options: { occasion?: string; weather?: Weather; isSurprise?: boolean },
    history: string[][] = []
): Promise<GeneratedOutfit[]> => {
    const wardrobeData = JSON.stringify(items.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color, style: i.style })));

    let historyPrompt = '';
    if (history && history.length > 0) {
        const historyString = history
            .map(outfitIds => {
                const outfitItemNames = outfitIds
                    .map(id => items.find(item => item.id === id)?.name)
                    .filter(Boolean);
                if (outfitItemNames.length > 0) {
                    return `- An outfit with: ${outfitItemNames.join(', ')}`;
                }
                return null;
            })
            .filter(Boolean)
            .join('\n');
        
        if(historyString) {
             historyPrompt = `\n\nIMPORTANT: Avoid repetition. Do not generate outfits that are the same as or very similar to these recently suggested ones:\n${historyString}`;
        }
    }

    let prompt: string;

    if (options.isSurprise) {
        prompt = `You are a creative and daring fashion stylist. From the provided wardrobe, create 3 unique and unexpected but stylish outfits. Ignore conventional rules and create something bold and inspiring. Ensure each outfit has a creative name and an appropriate occasion. For each outfit, provide a quirky, fun, and insightful explanation (2-3 sentences) for why the unexpected combination is a fashion-forward statement. Use only the item IDs provided from the wardrobe.
    
    Wardrobe: ${wardrobeData}${historyPrompt}`;
    } else if (options.occasion && options.weather) {
        prompt = `You are a fashion stylist. Based on the following wardrobe items, create 3 diverse outfits.
  
    Constraints:
    1. The occasion is: "${options.occasion}".
    2. The weather is: ${options.weather.temperature}°${options.weather.unit} and ${options.weather.condition}.
    3. Combine items based on color theory, style compatibility, and fashion principles, appropriate for the weather and occasion.
    4. Ensure each outfit is practical and stylish. For example, don't suggest shorts in cold weather.
    5. For each outfit, provide a quirky and insightful explanation (2-3 sentences) for why the combination works from a style perspective.
    6. Use only the item IDs provided from the wardrobe.
    
    Wardrobe: ${wardrobeData}${historyPrompt}`;
    } else {
        throw new Error("Either 'isSurprise' must be true, or 'occasion' and 'weather' must be provided.");
    }

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: 'A creative name for the outfit.' },
                            occasion: { type: Type.STRING, description: 'A suitable occasion for the outfit.' },
                            itemIds: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: 'An array of item IDs from the provided wardrobe that make up this outfit.'
                            },
                            explanation: { type: Type.STRING, description: 'A quirky, insightful explanation for why the outfit works.' }
                        },
                        required: ['name', 'occasion', 'itemIds', 'explanation']
                    }
                }
            }
        });

        const jsonString = response.text;
        return JSON.parse(jsonString) as GeneratedOutfit[];

    } catch (error) {
        console.error("Error generating outfits with Gemini:", error);
        throw new Error("Failed to generate outfits. The AI model could not process the request.");
    }
};

export const getDiscardSuggestions = async (items: ClothingItem[]): Promise<{ itemId: string, reason: string }[]> => {
    const wardrobeData = JSON.stringify(items.map(i => ({ id: i.id, name: i.name, purchaseDate: i.purchaseDate.toISOString().split('T')[0] })));
    const prompt = `Analyze the provided wardrobe list. Identify one or two items that could be considered for discarding or donating. Base your suggestions on the item's age (purchase date) and whether its style might be considered dated or out of current fashion trends. Provide a brief, kind, and constructive reason for each suggestion.
    
    Wardrobe: ${wardrobeData}`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            itemId: { type: Type.STRING, description: 'The ID of the item to consider discarding.'},
                            reason: { type: Type.STRING, description: 'A brief, helpful reason for the suggestion.'}
                        }
                    }
                }
            }
        });
        const jsonString = response.text;
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error getting discard suggestions:", error);
        throw new Error("Failed to get discard suggestions from AI.");
    }
};

export const getShoppingSuggestions = async (items: ClothingItem[], location?: {latitude: number, longitude: number}): Promise<{ name: string; description: string; category: string; priceRange: string; }[]> => {
    const wardrobeSummary = items.map(i => `${i.name} (${i.category})`).join(', ');
    const locationInfo = location ? `The user is currently at latitude ${location.latitude}, longitude ${location.longitude}.` : "The user's location is not specified.";
    
    const prompt = `Based on a wardrobe that includes: ${wardrobeSummary}. ${locationInfo}
    
    Suggest 3 new, versatile clothing items or accessories that would complement this collection. For each suggestion, provide a name, a brief description of why it's a good addition, a specific category (e.g., 'Sneakers', 'Handbag'), and a typical price range (e.g., '$50 - $100').`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: 'The name of the suggested item.'},
                            description: { type: Type.STRING, description: 'A brief description of the item and why it fits.'},
                            category: { type: Type.STRING, description: 'A specific category for the item, e.g., "Sneakers", "Handbag".' },
                            priceRange: { type: Type.STRING, description: 'A typical price range for the item, e.g., "$50 - $100".' }
                        }
                    }
                }
            }
        });
        const jsonString = response.text;
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error getting shopping suggestions:", error);
        throw new Error("Failed to get shopping suggestions from AI.");
    }
};

export const generateVirtualTryOnImage = async (userImageBase64: string, clothingItems: ClothingItem[]): Promise<string> => {
    try {
        const userImagePart = base64ToGenerativePart(userImageBase64);
        const clothingParts = clothingItems.map(item => base64ToGenerativePart(item.imageUrl));

        const prompt = `Create a photorealistic image of the person from the first image wearing the clothes from the subsequent images. The person's face, pose, and body shape should be preserved. Place the person on a simple, light gray studio background.`;
        
        const allParts = [
            { text: prompt },
            userImagePart,
            ...clothingParts,
        ];

        const response = await ai.models.generateContent({
            model: visionModel,
            contents: { parts: allParts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
            const base64Image = firstPart.inlineData.data;
            return `data:${firstPart.inlineData.mimeType};base64,${base64Image}`;
        }
        
        throw new Error("The AI did not return a valid image.");

    } catch (error) {
        console.error("Error generating virtual try-on image:", error);
        throw new Error("Failed to generate virtual try-on image. The AI model may be temporarily unavailable.");
    }
};