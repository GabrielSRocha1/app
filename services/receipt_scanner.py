
import os
import json
import base64
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Optional, Dict, Any

load_dotenv()

class GeminiReceiptScanner:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY")
        if not self.api_key:
            raise ValueError("API_KEY não configurada.")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-3-flash-preview')

    def _prepare_image_data(self, image_input: str) -> Dict[str, Any]:
        try:
            if "," in image_input or len(image_input) > 500:
                base64_data = image_input.split(",")[-1] if "," in image_input else image_input
                return {"mime_type": "image/jpeg", "data": base64.b64decode(base64_data)}
            with open(image_input, "rb") as img_file:
                return {"mime_type": "image/jpeg", "data": img_file.read()}
        except Exception as e:
            raise ValueError(f"Erro imagem: {e}")

    def scan_receipt(self, image_input: str) -> Optional[Dict[str, Any]]:
        image_payload = self._prepare_image_data(image_input)
        prompt = """
        Extraia os dados do recibo.
        Retorne JSON puro com as chaves:
        - description: Nome do local
        - amount: Valor total (float)
        - date: YYYY-MM-DD
        - category: Categoria sugerida
        - paymentMethod: Método detectado (OPCIONAL, pode ser nulo)
        """
        try:
            response = self.model.generate_content([image_payload, prompt])
            json_text = response.text.strip()
            if json_text.startswith("```"):
                json_text = json_text.split("json")[-1].split("```")[0].strip()
            return json.loads(json_text)
        except Exception as e:
            return None

receipt_scanner = GeminiReceiptScanner()
