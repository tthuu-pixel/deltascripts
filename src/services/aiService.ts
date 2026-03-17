import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (prompt: string, apiKey: string, modelName: string = 'gemini-1.5-flash'): Promise<string> => {
  if (!apiKey) {
    throw new Error("Vui lòng nhập Gemini API Key trong phần Cài đặt.");
  }

  const getActualModel = (name: string) => {
    if (name === 'gemini-1.5-flash') return 'gemini-3-flash-preview';
    if (name === 'gemini-1.5-pro') return 'gemini-3.1-pro-preview';
    if (name === 'gemini-2.0-flash') return 'gemini-2.5-flash';
    return 'gemini-3-flash-preview';
  };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: getActualModel(modelName),
      contents: prompt,
      config: {
        systemInstruction: "Bạn là trợ lý AI DeltaScript, hỗ trợ học sinh học Toán 9. Chỉ gợi ý, không tự động đưa lời giải đầy đủ nếu chưa được yêu cầu rõ ràng.",
      }
    });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error: any) {
    console.error("AI Error:", error);
    const errorMessage = error.message || "";
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
      if (modelName !== 'gemini-1.5-flash') {
        throw new Error("QUOTA_EXCEEDED_FALLBACK");
      }
    }
    throw new Error(error.message || "Lỗi khi gọi AI.");
  }
};
