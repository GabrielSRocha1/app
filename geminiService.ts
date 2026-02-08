import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TransactionType, Category, PaymentMethod, RecurrenceType } from "./types.ts";

export interface AISuggestion {
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  paymentMethod?: PaymentMethod | null;
  date: string;
  summaryText: string;
}

// Auxiliar para tocar áudio PCM bruto (retornado pelo Gemini TTS)
async function playPcmAudio(base64Data: string) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  
  return new Promise(resolve => {
    source.onended = () => {
      ctx.close();
      resolve(true);
    };
  });
}

export const speakText = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      await playPcmAudio(audioData);
    }
  } catch (error) {
    console.error("TTS falhou", error);
  }
};

export const processReceiptImage = async (base64Image: string): Promise<Partial<AISuggestion> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise este recibo ou nota fiscal. Extraia: valor total, descrição (nome da loja), data e categoria sugerida. O campo paymentMethod é opcional se for uma conta recorrente.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: Object.values(TransactionType) },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
            paymentMethod: { type: Type.STRING, nullable: true },
          },
          required: ["description", "amount", "type", "category"]
        }
      }
    });

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Erro na IA de Imagem", error);
    return null;
  }
};

export const processVoiceCommand = async (audioBase64: string, mimeType: string): Promise<AISuggestion | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Interprete o comando de voz financeiro. Extraia: valor, descrição, tipo, categoria. Identifique se é recorrente. Gere um 'summaryText' confirmando os dados. Se for conta fixa (como luz, aluguel), o paymentMethod pode ser nulo.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: audioBase64 } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        type: { type: Type.STRING, enum: Object.values(TransactionType) },
                        category: { type: Type.STRING },
                        paymentMethod: { type: Type.STRING, nullable: true },
                        summaryText: { type: Type.STRING }
                    },
                    required: ["description", "amount", "type", "category", "summaryText"]
                }
            }
        });

        return JSON.parse(response.text || "null");
    } catch (error) {
        console.error("Erro na IA de Voz", error);
        return null;
    }
};

export const interpretRecurrence = async (audioBase64: string, mimeType: string): Promise<RecurrenceType> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `O usuário disse se a conta é única ou recorrente. Identifique a intenção.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: audioBase64 } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recurrence: { type: Type.STRING, enum: Object.values(RecurrenceType) },
                    },
                    required: ["recurrence"]
                }
            }
        });
        const parsed = JSON.parse(response.text || "{}");
        return (parsed.recurrence as RecurrenceType) || RecurrenceType.UNIQUE;
    } catch (error) {
        return RecurrenceType.UNIQUE;
    }
};