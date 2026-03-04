
export const elevenSTT = async (audioBlob: Blob): Promise<string | null> => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error("ElevenLabs API Key não configurada");
        return null;
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model_id', 'scribe_v1'); // Scribe v1 ou v2

    try {
        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("STT ElevenLabs falhou:", errorText);
            return null;
        }

        const result = await response.json();
        return result.text;
    } catch (error) {
        console.error("Erro no STT ElevenLabs:", error);
        return null;
    }
};

export const elevenTTS = async (text: string) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error("ElevenLabs API Key não configurada");
        return;
    }

    const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // Harry (ou qualquer voz padrão)

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("TTS ElevenLabs falhou:", errorText);
            return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
    } catch (error) {
        console.error("Erro no TTS ElevenLabs:", error);
    }
};
