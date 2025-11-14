
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult, ImageInput, Quality } from "../types";

export interface DirectorSuggestion {
    orbitalRotationY: number;
    orbitalRotationX: number;
    focalLength: number;
    aperture: number;
    lights: {
        id: 'key' | 'fill' | 'rim';
        position: { x: number; y: number };
        color: string;
        intensity: number;
        hardness: number;
    }[];
    colorGrade: string;
    weather: string[];
    filmGrain: number;
    lensFlare: number;
}

export interface SceneSuggestionResult {
    scenes: string[];
    stages: string[];
}


export const generateSingleImage = async (
  prompt: string,
  images: ImageInput[] = []
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts: any[] = [];
  
  if (images && images.length > 0) {
    for (const image of images) {
        parts.push({
            inlineData: {
                data: image.base64,
                mimeType: image.mimeType,
            },
        });
    }
  }
  
  const textPart = { text: prompt };
  parts.push(textPart);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
    throw new Error("The API response was blocked or did not contain any content. This might be due to safety settings or an invalid request.");
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
      const base64ImageBytes: string = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("No image found in the API response.");
};

export const generateNImages = async (
  prompt: string,
  images: ImageInput[] = [],
  count: number
): Promise<string[]> => {
  const promises = Array(count).fill(null).map(() => generateSingleImage(prompt, images));
  const results = await Promise.all(promises);
  return results;
};


export const generateFourImages = async (
  prompt: string,
  images: ImageInput[] = []
): Promise<string[]> => {
  return generateNImages(prompt, images, 4);
};


export const analyzeImageAndSuggestStyles = async (
  imageBase64: string,
  mimeType: string
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType,
    },
  };
  
  const textPart = {
      text: `Phân tích hình ảnh này và trả về kết quả dưới dạng JSON.
      1. 'description': Mô tả chi tiết, khách quan về người và trang phục trong ảnh để dùng làm prompt tạo ảnh. Tập trung vào các chi tiết như kiểu tóc, nét mặt, quần, áo, váy, phụ kiện, giày dép.
      2. 'personality': Đưa ra MỘT từ tiếng Việt duy nhất để mô tả cá tính hoặc phong cách toát ra từ người trong ảnh (ví dụ: Dịu dàng, Năng động, Thanh lịch, Cá tính).
      3. 'styles': Gợi ý 7 phong cách thời trang khác nhau (bằng tiếng Việt) mà người này có thể thử, dựa trên phân tích.
      Chỉ trả về đối tượng JSON, không có giải thích hay định dạng markdown.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: {
            type: Type.STRING,
            description: "Mô tả chi tiết về người và trang phục trong ảnh."
          },
          personality: {
            type: Type.STRING,
            description: "Một từ tiếng Việt mô tả cá tính."
          },
          styles: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            },
            description: "Danh sách 7 phong cách thời trang gợi ý."
          }
        },
        required: ["description", "personality", "styles"]
      }
    }
  });

  const jsonString = response.text.trim();
  try {
    const result = JSON.parse(jsonString);
    if (result.description && result.personality && Array.isArray(result.styles) && result.styles.length > 0) {
        return result as AnalysisResult;
    } else {
        throw new Error("Invalid JSON structure received from API.");
    }
  } catch (e) {
    console.error("Failed to parse JSON response:", jsonString, e);
    throw new Error("Could not parse the analysis from the AI.");
  }
};

export const getPromptSuggestions = async (
  fieldType: 'subject' | 'action' | 'setting' | 'lighting',
  currentPrompt: { subject: string; action: string; setting: string; style: string; shotType: string; lighting: string; }
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const fieldLabels: { [key: string]: string } = {
      subject: 'Chủ thể (Subject)',
      action: 'Hành động (Action)',
      setting: 'Bối cảnh (Setting)',
      style: 'Phong cách (Style)',
      shotType: 'Góc quay (Shot Type)',
      lighting: 'Ánh sáng (Lighting)'
  };

  const contextParts = Object.entries(currentPrompt)
      .filter(([key, value]) => key !== fieldType && value)
      .map(([key, value]) => `${fieldLabels[key as keyof typeof fieldLabels]}: ${value}`)
      .join(', ');

  const prompt = `Bạn là một trợ lý sáng tạo cho việc tạo ảnh AI.
Dựa trên các yếu tố đã có: ${contextParts || 'Không có'}.
Hãy gợi ý 5 ý tưởng sáng tạo cho mục "${fieldLabels[fieldType]}".
Chỉ trả về một mảng JSON chứa 5 chuỗi gợi ý bằng tiếng Việt, mỗi chuỗi không quá 15 từ. Ví dụ: ["gợi ý 1", "gợi ý 2", "gợi ý 3", "gợi ý 4", "gợi ý 5"]
Không thêm bất kỳ giải thích hay định dạng markdown nào.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const jsonString = response.text.trim();
  try {
    const result = JSON.parse(jsonString);
    if (Array.isArray(result) && result.every(item => typeof item === 'string')) {
      return result;
    } else {
      console.error("Received non-array or non-string array:", result);
      throw new Error("Invalid JSON structure received from API.");
    }
  } catch (e) {
    console.error("Failed to parse JSON suggestion response:", jsonString, e);
    throw new Error("Could not parse suggestions from the AI.");
  }
};

export const analyzeAndImprovePrompt = async (
  prompt: string,
  images: ImageInput[]
): Promise<{ analysis: string; improvedPrompt: string }> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `Bạn là một chuyên gia sáng tạo prompt cho AI tạo ảnh, chuyên về thay đổi trang phục và tư thế.

Bối cảnh: Người dùng đã cung cấp các ảnh tham khảo và một prompt ban đầu để kết hợp chúng.
- Ảnh 1 là **Người mẫu** (cần giữ lại khuôn mặt và tóc).
- Ảnh 2 (nếu có) là **Kiểu dáng mẫu** (chỉ lấy tư thế, dáng người, và bối cảnh).
- Ảnh 3 (hoặc 2 nếu không có ảnh kiểu dáng) là **Trang phục** cần thay.

Prompt hiện tại của người dùng: "${prompt}"

Yêu cầu của bạn:
1. **Phân tích (analysis):** Đánh giá prompt hiện tại. Nó đã tận dụng tốt các ảnh tham khảo chưa? Đặc biệt, phần mô tả tư thế có chỉ tập trung vào dáng người, vị trí tay chân, hướng nhìn mà không mô tả các chi tiết không liên quan (như quần áo, khuôn mặt) của người trong ảnh kiểu dáng không?
2. **Cải thiện (improvedPrompt):** Viết lại một prompt hoàn toàn mới, tốt hơn bằng tiếng Việt. Prompt mới phải hướng dẫn AI một cách rõ ràng:
    - Lấy người từ ảnh **Người mẫu**.
    - Giữ nguyên 100% khuôn mặt và tóc của người mẫu.
    - Áp dụng chính xác **TƯ THẾ** và **BỐI CẢNH** từ ảnh **Kiểu dáng mẫu** (nếu có).
    - Mặc cho người mẫu **Trang phục** từ ảnh trang phục.
    - Khi mô tả tư thế, hãy chi tiết (dáng người, vị trí tay, chân, độ nghiêng đầu, hướng nhìn) nhưng tuyệt đối **KHÔNG** mô tả người, quần áo, hay các chi tiết nhận dạng cá nhân khác từ ảnh **Kiểu dáng mẫu**.
    - Kết hợp tất cả các yếu tố trên thành một bức ảnh tả thực, liền mạch.

Trả về kết quả dưới dạng một đối tượng JSON duy nhất.
Chỉ trả về JSON, không có định dạng markdown hay giải thích thêm.`;

  const imageParts = images.map(image => ({
    inlineData: {
      data: image.base64,
      mimeType: image.mimeType,
    },
  }));
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [...imageParts, { text: "Please analyze and improve the prompt based on the system instruction and provided images." }] },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.STRING,
            description: "Văn bản phân tích prompt của người dùng."
          },
          improvedPrompt: {
            type: Type.STRING,
            description: "Prompt đã được cải thiện."
          }
        },
        required: ["analysis", "improvedPrompt"]
      }
    }
  });

  const jsonString = response.text.trim();
  try {
    const result = JSON.parse(jsonString);
    if (result.analysis && result.improvedPrompt) {
        return result as { analysis: string; improvedPrompt: string };
    } else {
        throw new Error("Invalid JSON structure received from prompt analysis API.");
    }
  } catch (e) {
    console.error("Failed to parse JSON response for prompt analysis:", jsonString, e);
    throw new Error("Could not parse the prompt analysis from the AI.");
  }
};

export const analyzeImageForPromptPart = async (
  image: ImageInput,
  partType: 'subject' | 'setting' | 'outfit'
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let promptText = '';
    switch (partType) {
        case 'subject':
            promptText = 'Phân tích hình ảnh nhân vật này và đưa ra một mô tả chi tiết, khách quan về người và trang phục của họ để sử dụng trong một prompt tạo ảnh. Tập trung vào các chi tiết như kiểu tóc, nét mặt, quần, áo, váy, phụ kiện, giày dép. Chỉ trả về một chuỗi văn bản mô tả, không có nhãn hay định dạng markdown.';
            break;
        case 'setting':
            promptText = 'Phân tích hình ảnh bối cảnh này và đưa ra một mô tả chi tiết về địa điểm, không khí và các yếu tố chính trong cảnh để sử dụng trong một prompt tạo ảnh. Chỉ trả về một chuỗi văn bản mô tả, không có nhãn hay định dạng markdown.';
            break;
        case 'outfit':
            promptText = 'Phân tích hình ảnh trang phục/sản phẩm này. Mô tả chi tiết các đặc điểm của nó (kiểu dáng, màu sắc, chất liệu, họa tiết) để AI có thể mặc nó cho người mẫu một cách chính xác. Chỉ trả về chuỗi văn bản mô tả.';
            break;
    }
  
  const imagePart = { inlineData: { data: image.base64, mimeType: image.mimeType } };
  const textPart = { text: promptText };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  return response.text.trim();
};

export const suggestActionForImages = async (
  images: ImageInput[]
): Promise<string[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Bạn là một giám đốc sáng tạo cho một buổi chụp ảnh quảng cáo sản phẩm.
    Dựa trên các hình ảnh tham khảo được cung cấp (có thể bao gồm nhân vật, sản phẩm, và bối cảnh), hãy gợi ý 5 ý tưởng về "Hành động (Action)" để kết hợp các yếu tố này lại một cách hài hòa, tự nhiên và hấp dẫn nhất.
    Mỗi gợi ý phải là một chuỗi ngắn gọn.
    Chỉ trả về một mảng JSON chứa 5 chuỗi gợi ý bằng tiếng Việt. Ví dụ: ["tương tác với sản phẩm một cách tự nhiên", "tự tin sải bước trong bối cảnh", "nhìn vào ống kính với vẻ mặt rạng rỡ", "thể hiện sự năng động bên sản phẩm", "ngồi thư giãn trong không gian"].
    Không thêm bất kỳ giải thích hay định dạng markdown nào.`;
    
    const imageParts = images.map(image => ({
        inlineData: { data: image.base64, mimeType: image.mimeType },
    }));
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    
    const jsonString = response.text.trim();
    try {
        const result = JSON.parse(jsonString);
        if (Array.isArray(result) && result.every(item => typeof item === 'string')) {
            return result;
        } else {
            console.error("Received non-array or non-string array:", result);
            throw new Error("Invalid JSON structure received from API for action suggestion.");
        }
    } catch (e) {
        console.error("Failed to parse JSON action suggestion response:", jsonString, e);
        throw new Error("Could not parse action suggestions from the AI.");
    }
};

export const translatePrompt = async (
  text: string,
  targetLanguage: 'en' | 'vi'
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  if (!text.trim()) {
    return "";
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const languageName = targetLanguage === 'en' ? 'English' : 'Vietnamese';

  const prompt = `Translate the following text to ${languageName}. Only return the translated text, with no extra explanations or markdown formatting.\n\nText to translate:\n"${text}"`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text.trim();
};

export const analyzeImageForPose = async (image: ImageInput): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const promptText = 'Phân tích kỹ lưỡng tư thế của người trong ảnh. Chỉ mô tả các chi tiết về dáng người, vị trí tay, chân, độ nghiêng đầu, và hướng nhìn. Tuyệt đối không mô tả khuôn mặt, quần áo, bối cảnh, hay bất kỳ đặc điểm nhận dạng cá nhân nào. Mô tả phải chi tiết và khách quan để dùng làm prompt cho AI tạo ảnh. Chỉ trả về chuỗi văn bản mô tả.';
  
  const imagePart = { inlineData: { data: image.base64, mimeType: image.mimeType } };
  const textPart = { text: promptText };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  return response.text.trim();
};

export const analyzeImageForContext = async (image: ImageInput): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const promptText = 'Phân tích BỨC ẢNH NÀY. Chỉ tập trung vào BỐI CẢNH. Mô tả chi tiết địa điểm, môi trường, ánh sáng, màu sắc, và không khí chung. TUYỆT ĐỐI KHÔNG được mô tả, đề cập, hay phân tích bất kỳ người, sinh vật sống nào trong ảnh. Nếu có người, hãy hoàn toàn bỏ qua họ và chỉ mô tả những gì ở phía sau và xung quanh họ. Chỉ trả về chuỗi văn bản mô tả bối cảnh.';
  
  const imagePart = { inlineData: { data: image.base64, mimeType: image.mimeType } };
  const textPart = { text: promptText };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  return response.text.trim();
};

export const suggestPoses = async (): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Bạn là một đạo diễn sáng tạo cho buổi chụp hình thời trang. Gợi ý 5 tư thế tạo dáng sáng tạo và chuyên nghiệp cho người mẫu nữ. Mỗi gợi ý phải mô tả rõ ràng về dáng đứng hoặc ngồi, vị trí tay chân, và biểu cảm. Chỉ trả về một mảng JSON chứa 5 chuỗi gợi ý bằng tiếng Việt. Ví dụ: ["Đứng nghiêng 3/4 người, một tay chống hông, tay kia buông lỏng tự nhiên, ánh mắt nhìn xa xăm.", "Ngồi trên ghế cao, bắt chéo chân, lưng thẳng, hai tay đặt nhẹ lên đùi, mỉm cười nhẹ nhàng."]`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const jsonString = response.text.trim();
  try {
    const result = JSON.parse(jsonString);
    if (Array.isArray(result) && result.every(item => typeof item === 'string')) {
      return result;
    } else {
      console.error("Received non-array or non-string array for poses:", result);
      throw new Error("Invalid JSON structure received from pose suggestion API.");
    }
  } catch (e) {
    console.error("Failed to parse JSON pose suggestion response:", jsonString, e);
    throw new Error("Could not parse pose suggestions from the AI.");
  }
};

export const optimizePosePrompt = async (
  poseDescription: string,
  poseImage: ImageInput
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const promptText = `Bạn là một chuyên gia về prompt kỹ thuật cho AI tạo ảnh, đặc biệt về việc mô tả tư thế.
  Bối cảnh: Tôi có một mô tả ban đầu về tư thế của người trong ảnh tham khảo.
  Mô tả ban đầu: "${poseDescription}"

  Nhiệm vụ của bạn:
  1. Dựa vào ảnh tham khảo, hãy **tối ưu hóa** mô tả ban đầu.
  2. Mô tả mới phải **cực kỳ chi tiết** và **khách quan** về dáng người: vị trí chính xác của tay, chân, ngón tay, độ nghiêng của đầu, hướng của ánh mắt, độ cong của lưng, vị trí của vai, v.v.
  3. **Quan trọng nhất**: Chỉ mô tả tư thế. Tuyệt đối **KHÔNG** đề cập đến quần áo, khuôn mặt, tóc, bối cảnh, hoặc bất kỳ đặc điểm nhận dạng cá nhân nào khác.
  4. Viết lại prompt sao cho AI tạo ảnh có thể tái tạo lại tư thế này một cách chính xác nhất có thể trên một người mẫu khác.
  
  Chỉ trả về chuỗi văn bản là prompt đã được tối ưu hóa, không có giải thích hay định dạng markdown.`;
  
  const imagePart = { inlineData: { data: poseImage.base64, mimeType: poseImage.mimeType } };
  const textPart = { text: promptText };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  return response.text.trim();
};

export const suggestVideoPrompt = async (
  videoFrame: ImageInput,
  selectedImages: ImageInput[]
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [];
    
    parts.push({text: "Frame from sample video:"});
    parts.push({
        inlineData: {
            data: videoFrame.base64,
            mimeType: videoFrame.mimeType,
        },
    });

    if (selectedImages.length > 0) {
        parts.push({text: "Reference images of subjects/objects to include:"});
        for (const image of selectedImages) {
            parts.push({
                inlineData: {
                    data: image.base64,
                    mimeType: image.mimeType,
                },
            });
        }
    }

    const textPrompt = `As a creative director, analyze the style, mood, color grading, and composition of the sample video frame. Then, analyze the reference images. Your task is to write a single, detailed, and professional video generation prompt in English that merges the aesthetic and theme from the video frame with the subjects/objects from the reference images. The final prompt should be a creative and coherent instruction for a video AI model like Veo. Only return the final prompt text, with no explanations, titles, or markdown formatting.`;
    parts.push({text: textPrompt});

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
    });
    
    return response.text.trim();
};

export const removeImageBackground = async (image: ImageInput): Promise<string> => {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
    const imagePart = {
        inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
        },
    };
    
    const textPart = { text: "Perfectly remove the background of this image. The output should be only the main subject(s) with a transparent background. The output image must be a PNG." };
  
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
  
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
        throw new Error("The API response for background removal was blocked or empty.");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
  
    throw new Error("No image found in the background removal API response.");
  };
  
export const analyzeImageForStyle = async (image: ImageInput): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const promptText = 'Phân tích PHONG CÁCH của bức ảnh này. Tập trung vào các yếu tố trừu tượng như: xu hướng thiết kế (ví dụ: minimalist, vintage, futuristic), bảng màu chủ đạo, chất lượng ánh sáng (ví dụ: soft, dramatic, natural), và thể loại nhiếp ảnh (ví dụ: portrait, landscape, fashion). TUYỆT ĐỐI KHÔNG mô tả con người hay các vật thể cụ thể. Chỉ trả về một chuỗi văn bản mô tả phong cách nghệ thuật.';

    const imagePart = { inlineData: { data: image.base64, mimeType: image.mimeType } };
    const textPart = { text: promptText };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    return response.text.trim();
};

export const suggestScenesForProduct = async (
  productImage: ImageInput
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Bạn là một giám đốc sáng tạo cho buổi chụp ảnh sản phẩm.
  Phân tích hình ảnh sản phẩm được cung cấp.
  Dựa trên sản phẩm, hãy gợi ý 5 bối cảnh (scenes) chụp ảnh thật sáng tạo và đa dạng.
  Các gợi ý phải bao gồm nhiều phong cách khác nhau: hiện đại, cổ điển, hoài cổ, lãng mạn, tối giản, v.v.
  Hãy xem xét các yếu tố như màu sắc, ánh sáng, và không gian phù hợp với sản phẩm.
  Chỉ trả về một mảng JSON chứa 5 chuỗi gợi ý bằng tiếng Việt. Ví dụ: ["gợi ý 1", "gợi ý 2", ...].
  Không thêm bất kỳ giải thích hay định dạng markdown nào.`;
  
  const imagePart = { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const jsonString = response.text.trim();
  try {
    const result = JSON.parse(jsonString);
    if (Array.isArray(result) && result.every(item => typeof item === 'string')) {
      return result;
    } else {
      console.error("Received non-array or non-string array for scene suggestions:", result);
      throw new Error("Invalid JSON structure received from scene suggestion API.");
    }
  } catch (e) {
    console.error("Failed to parse JSON scene suggestion response:", jsonString, e);
    throw new Error("Could not parse scene suggestions from the AI.");
  }
};

export const createFashionMoodboard = async (
    image: ImageInput,
    quality: Quality,
    aspectRatio: string
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let qualityPrompt = '';
    if (quality === 'ultra') {
        qualityPrompt = " The final image must be ultra high quality, 8K, and hyperrealistic.";
    } else if (quality === 'high') {
        qualityPrompt = " The final image must be high quality, 4K, and detailed.";
    }

    const prompt = `Create a fashion mood board collage based on the input image.
    **Instructions:**
    1.  **Analyze the Outfit:** Identify the main person and each individual fashion item they are wearing (e.g., top, bottom, shoes, accessories).
    2.  **Compose the Collage:**
        *   The background should be a textured, off-white paper or a light pastel color, resembling a scrapbook page.
        *   Place the original person's portrait on the right side of the collage.
        *   On the left and around the portrait, create clean, high-quality cutouts of each identified fashion item. Arrange them artistically.
    3.  **Add Annotations:**
        *   For each cutout item, add playful, handwritten-style notes and cute sketches (like arrows, stars, hearts, clouds). Use a playful, marker-style font.
        *   Each annotation must include a short, creative description of the item in English (e.g., "Cozy Ribbed Sweater", "Pleated Maxi Skirt").
        *   Also include placeholder text for "Brand: [Suggest a plausible brand]" and "Source: [Suggest a plausible source, e.g., Online Shop]".
    4.  **Aesthetic:** The overall style must be creative, cute, playful, and visually appealing, like a digital scrapbook.
    5.  **Output:** The final result must be a single, high-resolution image containing the complete collage, with an aspect ratio of ${aspectRatio}.${qualityPrompt}`;

    const imagePart = {
        inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
        },
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
        throw new Error("The API response was blocked or did not contain any content. This might be due to safety settings or an invalid request.");
    }

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }

    throw new Error("No image found in the API response for moodboard creation.");
};

export const suggestLookbookPrompt = async (images: ImageInput[]): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Là một giám đốc sáng tạo cho một buổi chụp hình thời trang cao cấp, hãy phân tích các hình ảnh tham khảo được cung cấp (có thể bao gồm người mẫu, quần áo, phụ kiện và bối cảnh).
    Viết một prompt duy nhất, chi tiết và đầy sáng tạo bằng tiếng Việt để tạo ra một hình ảnh lookbook gắn kết và phong cách, kết hợp các yếu tố này.
    Prompt nên mô tả tư thế của người mẫu, tâm trạng tổng thể, môi trường, và cách các món đồ khác nhau được mặc hoặc sắp đặt.
    **QUAN TRỌNG: Prompt bạn tạo ra PHẢI BAO GỒM chỉ thị "Giữ nguyên 100% khuôn mặt và các đặc điểm trên mặt của người mẫu trong ảnh tham chiếu. Không thay đổi bất cứ điều gì trên khuôn mặt."**
    Chỉ trả về văn bản prompt, không có lời giải thích hay định dạng markdown.`;

    const imageParts = images.map(image => ({
        inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
        },
    }));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, { text: prompt }] },
    });

    return response.text.trim();
};

export interface OutfitSuggestionResult {
    textualSuggestion: string;
    imageUrls: string[];
}

export const suggestOutfitsAndGenerateImages = async (
    characterImage: ImageInput,
    query: string
): Promise<OutfitSuggestionResult> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const textPrompt = `Phân tích người trong ảnh và yêu cầu của họ: "${query}".
    Dựa vào đó, hãy:
    1.  Viết một đoạn văn bản tư vấn thời trang (tối đa 50 từ).
    2.  Liệt kê 3-5 món đồ (quần, áo, giày, phụ kiện...) để tạo nên bộ trang phục đó. Mỗi món đồ phải được mô tả thật chi tiết (kiểu dáng, màu sắc, chất liệu) để AI có thể vẽ lại được.
    
    Chỉ trả về một đối tượng JSON, không có giải thích hay markdown.
    Ví dụ JSON:
    {
      "suggestion": "Với yêu cầu đi đám cưới, một bộ vest màu xanh navy lịch lãm kết hợp sơ mi trắng và giày da nâu sẽ là lựa chọn hoàn hảo, vừa sang trọng vừa hiện đại.",
      "items": [
        "một chiếc áo blazer nam màu xanh navy, kiểu dáng slim-fit, chất liệu len pha",
        "một chiếc áo sơ mi nam màu trắng, cổ bẻ, chất liệu cotton cao cấp",
        "một chiếc quần âu nam màu xanh navy, ống đứng",
        "một đôi giày tây nam da thật màu nâu, kiểu Oxford"
      ]
    }`;

    const characterImagePart = {
        inlineData: {
            data: characterImage.base64,
            mimeType: characterImage.mimeType,
        },
    };

    const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [characterImagePart, { text: textPrompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestion: { type: Type.STRING },
                    items: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["suggestion", "items"]
            }
        }
    });

    const textResult = JSON.parse(textResponse.text.trim());
    const textualSuggestion: string = textResult.suggestion;
    const itemDescriptions: string[] = textResult.items;

    if (!textualSuggestion || !Array.isArray(itemDescriptions) || itemDescriptions.length === 0) {
        throw new Error("AI không thể tạo gợi ý trang phục.");
    }

    const imageGenerationPromises = itemDescriptions.map(description => {
        const imagePrompt = `Ảnh chụp sản phẩm chuyên nghiệp, độ phân giải cao của ${description} trên nền trắng trơn, phong cách e-commerce. High quality product photography of ${description} on a plain white background, e-commerce style.`;
        return generateSingleImage(imagePrompt);
    });

    const imageUrls = await Promise.all(imageGenerationPromises);

    return { textualSuggestion, imageUrls };
};

export const getDirectorSuggestion = async (intent: string): Promise<DirectorSuggestion> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Bạn là một Đạo diễn Hình ảnh (Director of Photography) AI chuyên nghiệp. Dựa trên "Ý đồ Cảnh quay" của người dùng, hãy đưa ra các thông số kỹ thuật chính xác để thiết lập một cảnh quay điện ảnh.

Ý đồ Cảnh quay: "${intent}"

Nhiệm vụ: Trả về một đối tượng JSON duy nhất chứa các thông số sau:
-   **Camera:** góc quay, tiêu cự, khẩu độ, hiệu ứng vertigo.
-   **Lighting:** một hệ thống 3 đèn (key, fill, rim) với vị trí, màu sắc, cường độ, và độ gắt.
-   **Post-Production:** một gam màu (color grade), hiệu ứng thời tiết, và các hiệu ứng phim.

Hãy sáng tạo và đưa ra các thông số phản ánh đúng nhất tinh thần của ý đồ cảnh quay. Chỉ trả về đối tượng JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    orbitalRotationY: { type: Type.NUMBER, description: "Góc quay ngang (-90 đến 90)." },
                    orbitalRotationX: { type: Type.NUMBER, description: "Góc quay dọc (-45 đến 45)." },
                    focalLength: { type: Type.NUMBER, description: "Tiêu cự ống kính (20-200mm)." },
                    aperture: { type: Type.NUMBER, description: "Khẩu độ (1.2-22)." },
                    lights: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                position: {
                                    type: Type.OBJECT,
                                    properties: {
                                        x: { type: Type.NUMBER },
                                        y: { type: Type.NUMBER }
                                    },
                                    required: ["x", "y"]
                                },
                                color: { type: Type.STRING },
                                intensity: { type: Type.NUMBER },
                                hardness: { type: Type.NUMBER }
                            },
                            required: ["id", "position", "color", "intensity", "hardness"]
                        }
                    },
                    colorGrade: { type: Type.STRING, description: "Tên gam màu (Teal & Orange, Vintage Film, Noir, Cyberpunk Neon, Pastel Dream)." },
                    weather: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hiệu ứng thời tiết (Mưa, Sương mù, Tuyết)." },
                    filmGrain: { type: Type.NUMBER, description: "Độ nhiễu hạt (0-100)." },
                    lensFlare: { type: Type.NUMBER, description: "Độ lóa ống kính (0-100)." }
                },
                required: ["orbitalRotationY", "orbitalRotationX", "focalLength", "aperture", "lights", "colorGrade", "weather", "filmGrain", "lensFlare"]
            }
        }
    });

    const jsonString = response.text.trim();
    try {
        const result = JSON.parse(jsonString);
        return result as DirectorSuggestion;
    } catch (e) {
        console.error("Failed to parse JSON response for director suggestion:", jsonString, e);
        throw new Error("Could not parse director suggestion from the AI.");
    }
};

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return String(error);
};

export const suggestSceneForLayers = async (
  images: ImageInput[],
  texts: string[]
): Promise<SceneSuggestionResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Bạn là một giám đốc sáng tạo cho việc thiết kế poster quảng cáo.
Dựa trên các yếu tố được cung cấp (bao gồm hình ảnh sản phẩm, logo và các đoạn văn bản), hãy:
1. Gợi ý 5 ý tưởng cho "Bối cảnh" (Scene) chung của poster.
2. Gợi ý 5 ý tưởng cho "Sân khấu" (Stage) - nơi các sản phẩm chính được đặt nổi bật.
Các gợi ý phải ngắn gọn, sáng tạo và đa dạng về phong cách.
Chỉ trả về một đối tượng JSON duy nhất.

Các yếu tố văn bản có trong poster: ${texts.join(', ') || 'Không có'}`;

  const imageParts = images.map(image => ({
    inlineData: {
      data: image.base64,
      mimeType: image.mimeType,
    },
  }));
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [...imageParts, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5 gợi ý cho bối cảnh."
          },
          stages: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5 gợi ý cho sân khấu."
          }
        },
        required: ["scenes", "stages"]
      }
    }
  });

  const jsonString = response.text.trim();
  try {
    const result = JSON.parse(jsonString);
    if (result.scenes && result.stages) {
        return result as SceneSuggestionResult;
    } else {
        throw new Error("Invalid JSON structure for scene suggestions.");
    }
  } catch (e) {
    console.error("Failed to parse JSON for scene suggestions:", jsonString, e);
    throw new Error("Could not parse scene suggestions from the AI.");
  }
};

export const generateSingleVideo = async (
    prompt: string,
    image?: ImageInput
): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key is not configured.");
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '9:16' // Or make this configurable
        }
    });

    // FIX: Replaced unsafe type assertion `(operation as any).done` with a direct property check `operation.done`, improving type safety and preventing potential runtime errors.
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        const pollingAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
        operation = await pollingAi.operations.getVideosOperation({ operation: operation });
    }

    const op = operation as any;

    if (op.error) {
         throw new Error(getErrorMessage(op.error) || "Video generation failed during polling.");
    }

    const downloadLink = op.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation finished but no video URI was found.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    
    const videoBlob: Blob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
};