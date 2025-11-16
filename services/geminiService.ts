import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ClothingCategory } from '../types';
import type { ClothingItem, Outfit, ShoppingSuggestion, Weather, SeasonalAnalysis, StyleDNA } from '../types';

const API_KEY = process.env.API_KEY; 
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });
const textModel = 'gemini-2.5-flash';
const proModel = 'gemini-2.5-pro';
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

export interface GeneratedOutfit {
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
    } else if (options.weather) {
        const occasionConstraint = options.occasion
            ? `1. The occasion is: "${options.occasion}".`
            : "1. The occasion is for general daily wear. Create versatile and practical outfits.";
        
        prompt = `You are a fashion stylist. Based on the following wardrobe items, create 3 diverse outfits.
  
    Constraints:
    ${occasionConstraint}
    2. The weather is: ${options.weather.temperature}°${options.weather.unit} and ${options.weather.condition}.
    3. Combine items based on color theory, style compatibility, and fashion principles, appropriate for the weather and occasion.
    4. Ensure each outfit is practical and stylish. For example, don't suggest shorts in cold weather.
    5. For each outfit, provide a quirky and insightful explanation (2-3 sentences) for why the combination works from a style perspective.
    6. Use only the item IDs provided from the wardrobe.
    
    Wardrobe: ${wardrobeData}${historyPrompt}`;
    } else {
        throw new Error("Either 'isSurprise' must be true, or 'weather' must be provided.");
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

export const getShoppingSuggestions = async (items: ClothingItem[], location?: {latitude: number, longitude: number}): Promise<Omit<ShoppingSuggestion, 'id'>[]> => {
    const wardrobeSummary = items.map(i => `${i.name} (${i.category})`).join(', ');
    const locationInfo = location ? `The user is in a region near latitude ${location.latitude}, longitude ${location.longitude}. Tailor suggestions and pricing to this region.` : "The user's location is not specified; assume a major global market like the US.";
    
    const prompt = `Based on a wardrobe that includes: ${wardrobeSummary}. ${locationInfo}

You are an expert personal shopper. Use Google Search to find 3 specific, real clothing items or accessories that would complement this collection and are available for purchase online.

For each item, provide:
1.  A descriptive name (e.g., "Everlane The Linen Workwear Shirt").
2.  A brief description of why it's a good addition.
3.  A specific category (e.g., 'Shirt', 'Handbag').
4.  A typical price range, including currency relevant to the user's location (e.g., "$80 - $100 USD", "€50 - €75").
5.  A direct URL to a retail page where the item can be purchased.
6.  A direct URL to a high-quality image of the product.

Return the result as a valid JSON array of objects. Each object must have keys: "name", "description", "category", "priceRange", "purchaseUrl", "imageUrl".`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
              tools: [{googleSearch: {}}],
            },
        });

        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        
        const suggestions = JSON.parse(cleanedJsonString);

        return suggestions;

    } catch (error) {
        console.error("Error getting shopping suggestions:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to get shopping suggestions from AI. The model returned an invalid format.");
        }
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

export const getSeasonalAnalysis = async (items: ClothingItem[], season: string): Promise<SeasonalAnalysis> => {
    const wardrobeData = JSON.stringify(items.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color, style: i.style })));
    const currentYear = new Date().getFullYear();

    const prompt = `You are an expert fashion stylist preparing a client's wardrobe for the upcoming season.
    
    Season: ${season}
    Wardrobe: ${wardrobeData}
    
    Your tasks:
    1.  Categorize every item from the wardrobe into one of three lists based on suitability for the '${season}' season:
        -   'keepOutIds': Items that are perfect for this season.
        -   'storeAwayIds': Items that are unsuitable for this season (e.g., heavy winter coats in summer).
        -   'transitionalIds': Versatile items that can be worn during the transition period into or out of the season.
    2.  Provide a brief, inspiring summary of key fashion trends for ${season} ${currentYear}.
    3.  Based on the user's existing wardrobe, suggest 3 to 5 specific types of items they are missing to create a complete and stylish wardrobe for this season. These should be generic item types, not specific brands.

    Provide the output as a single JSON object.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        keepOutIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                        storeAwayIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                        transitionalIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                        trendsSummary: { type: Type.STRING, description: `A summary of fashion trends for the specified season and year.` },
                        missingPieces: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "The name of the suggested missing item (e.g., 'White Linen Shirt')." },
                                    description: { type: Type.STRING, description: "A brief reason why this item would be a good addition." }
                                }
                            }
                        }
                    },
                    required: ['keepOutIds', 'storeAwayIds', 'transitionalIds', 'trendsSummary', 'missingPieces']
                }
            }
        });

        const jsonString = response.text;
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error getting seasonal analysis from Gemini:", error);
        throw new Error("Failed to get seasonal analysis. The AI model could not process the request.");
    }
};

export const getStyleDnaAnalysis = async (items: ClothingItem[]): Promise<StyleDNA> => {
    if (items.length < 10) {
        throw new Error("Please add at least 10 items to your wardrobe for an accurate Style DNA analysis.");
    }
    const wardrobeData = JSON.stringify(items.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color, style: i.style })));

    const prompt = `You are a world-class fashion analyst with a keen eye for personal style. Analyze the provided wardrobe data to create a comprehensive "Style DNA" report for the user. The report should be insightful, positive, and empowering.

    Wardrobe Data: ${wardrobeData}
    
    Your task is to generate a JSON object with the following structure:
    1.  'coreAesthetic': Identify the user's primary style essence. Give it a creative, descriptive title (e.g., "Effortless Parisian Chic", "Modern Minimalist", "Vintage-Inspired Eclectic") and a one-paragraph description explaining this aesthetic based on the items.
    2.  'colorPalette': Determine the user's dominant color palette. Give it a name (e.g., "Warm Earth Tones," "Cool Coastal Hues"), list the top 5-7 representative colors (as color names or hex codes), and write a short description of the palette's mood.
    3.  'keyPieces': Identify up to 4 items that are the cornerstones of their wardrobe. For each, provide the 'itemId' and a 'reason' explaining why it's a key piece (e.g., versatility, unique style statement).
    4.  'styleGaps': Based on the existing items, identify 2-3 potential gaps. For each gap, suggest a 'name' for the type of item that's missing (e.g., "A Versatile Blazer", "Classic White Sneakers") and a 'reason' explaining how it would enhance their collection and create more outfit possibilities.

    Please provide a thoughtful and high-quality analysis.`;

    try {
        const response = await ai.models.generateContent({
            model: proModel, // Use the more powerful model for deep analysis
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        coreAesthetic: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING }
                            }
                        },
                        colorPalette: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                                description: { type: Type.STRING }
                            }
                        },
                        keyPieces: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    itemId: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        },
                        styleGaps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ['coreAesthetic', 'colorPalette', 'keyPieces', 'styleGaps']
                }
            }
        });
        const jsonString = response.text;
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error getting Style DNA analysis:", error);
        throw new Error("Failed to generate your Style DNA. The AI model may be temporarily busy. Please try again in a few moments.");
    }
};

export const generateOutfitsForSingleItem = async (
    itemToFocus: ClothingItem,
    allItems: ClothingItem[]
): Promise<GeneratedOutfit[]> => {
    const wardrobeData = JSON.stringify(allItems.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color, style: i.style })));
    const focusedItemData = JSON.stringify({ id: itemToFocus.id, name: itemToFocus.name, category: itemToFocus.category, color: itemToFocus.color, style: itemToFocus.style });

    const prompt = `You are a creative stylist tasked with finding new ways to wear a specific item. From the provided wardrobe, create 3 diverse and stylish outfits that prominently feature the "Item to Focus".

    Item to Focus: ${focusedItemData}
    
    Full Wardrobe: ${wardrobeData}

    Constraints:
    1. Every generated outfit MUST include the "Item to Focus".
    2. Create varied looks (e.g., one casual, one smart-casual, one edgy).
    3. Provide a creative name and a suitable occasion for each outfit.
    4. For each outfit, provide an insightful explanation (2-3 sentences) for why the combination works.
    5. Use only the item IDs provided from the full wardrobe.
    `;
    
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
        const generatedOutfits = JSON.parse(jsonString) as GeneratedOutfit[];

        // Ensure the focused item is in every outfit, just in case the AI forgets.
        return generatedOutfits.map(outfit => ({
            ...outfit,
            itemIds: [...new Set([...outfit.itemIds, itemToFocus.id])]
        }));

    } catch (error) {
        console.error("Error generating single-item outfits:", error);
        throw new Error("Failed to generate outfits for the selected item.");
    }
};