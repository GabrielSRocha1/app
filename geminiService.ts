
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

import { elevenTTS } from "./elevenlabsService.ts";

export const speakText = async (text: string) => {
  if (process.env.ELEVENLABS_API_KEY) {
    return await elevenTTS(text);
  }

  // Fallback para o código original (que parece ser um placeholder ou experimental)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Corrigido de gemini-2.5 (hallucinated) para 1.5
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

export const processReceiptImage = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<Partial<AISuggestion> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType as any, data: base64Image } },
          {
            text: `Analise esta imagem de cupom fiscal, nota fiscal, recibo ou comprovante de pagamento.

Extraia as seguintes informações:
- description: nome do estabelecimento ou descrição da compra
- amount: valor TOTAL pago (número decimal, ex: 45.90) - procure por "TOTAL", "VALOR TOTAL", "TOTAL A PAGAR" ou similar
- type: sempre "EXPENSE" para compras/pagamentos, "INCOME" apenas se for depósito ou recebimento
- category: classifique em uma dessas categorias: Mercados, Alimentação, Saúde, Farmácia, Combustível, Roupas, Eletrônicos, Compras, Transporte, Lazer, Educação, Outros
- date: data no formato YYYY-MM-DD (se encontrada no cupom)
- paymentMethod: método de pagamento se identificado (Pix, Cartão de Crédito, Cartão de Débito, Dinheiro, etc.)

Retorne JSON apenas com os campos encontrados.`
          }
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
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: audioBase64 } },
          { text: "Extraia dados financeiros do áudio: valor, local/descrição, categoria, tipo (INCOME ou EXPENSE). Confirme em 'summaryText'. Retorne apenas JSON." }
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
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: audioBase64 } },
          { text: "Recorrência? UNIQUE ou RECURRING. JSON." }
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
export const processTextCommand = async (text: string): Promise<AISuggestion | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { text: `Extraia dados financeiros deste texto: "${text}". Categorias: Aluguel, Água, Luz, Academia, Internet, Mercados, Compras, Saúde, Lazer, etc. Retorne JSON com: description, amount (float), type (INCOME/EXPENSE), category, paymentMethod (opcional), summaryText (ex: "Registrado R$ 50 em Mercado").` }
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
    console.error("Erro na IA de Texto", error);
    return null;
  }
};
