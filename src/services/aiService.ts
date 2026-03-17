import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (prompt: string, apiKey: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("Vui lòng nhập Gemini API Key trong phần Cài đặt.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: "Bạn là trợ lý AI DeltaScript, hỗ trợ học sinh học Toán 9. Chỉ gợi ý, không tự động đưa lời giải đầy đủ nếu chưa được yêu cầu rõ ràng.",
      }
    });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error: any) {
    console.error("AI Error:", error);
    throw new Error(error.message || "Lỗi khi gọi AI.");
  }
};
