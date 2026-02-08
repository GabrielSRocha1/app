
import os
import json
import google.generativeai as genai
from typing import Optional, Dict, Any

# Configuração da API do Gemini
API_KEY = os.getenv("API_KEY")
genai.configure(api_key=API_KEY)

CATEGORIES = [
  'Aluguel', 'Água', 'Luz', 'Academia', 'Internet', 'Plano de Saúde', 'Telefone', 
  'Prestação do Carro', 'Prestação Moto', 'Família e Filhos', 'Pets', 'Mercado', 
  'Compras', 'Alimentação', 'Bares e Restaurantes', 'Saúde', 'Trabalho', 
  'Dívidas e Empréstimos', 'Assinaturas e Serviços', 'Investimentos', 'Casa', 
  'Viagem', 'Educação', 'Impostos e Taxas', 'Lazer e Hobbies', 'Cuidados Pessoais', 
  'Dízimo e Oferta', 'Outros', 'Roupas', 'Transporte', 'Presentes e Doações', 
  'Salário', 'Refeição', 'Moradia', 'Outras Receitas'
]

SYSTEM_INSTRUCTION = f"""
Você é o motor de processamento financeiro do ZenFinanceiro AI.
Extraia dados de transações. Categorias: {', '.join(CATEGORIES)}.

REGRAS DE NEGÓCIO:
1. Se a transação for um compromisso fixo/recorrente (ex: Aluguel, Luz, Internet, Assinaturas):
   - Defina "recurrence" como "RECURRING".
   - O campo "paymentMethod" deve ser NULL ou omitido, pois contas fixas não exigem método imediato.
2. Para gastos eventuais:
   - Tente identificar o "paymentMethod" (Pix, Dinheiro, etc).

Retorne JSON:
{{
    "description": "string",
    "amount": float,
    "type": "INCOME" ou "EXPENSE",
    "category": "string",
    "date": "YYYY-MM-DD",
    "paymentMethod": "string ou null",
    "recurrence": "UNIQUE" ou "RECURRING"
}}
"""

class IAService:
    def __init__(self):
        self.model = genai.GenerativeModel(
            model_name='gemini-3-flash-preview',
            system_instruction=SYSTEM_INSTRUCTION
        )

    async def process_voice_transcription(self, text: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.model.generate_content(f"Analise o comando financeiro: '{text}'")
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Erro IA Voz: {e}")
            return None

    async def process_image_ocr(self, image_data: bytes, mime_type: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.model.generate_content([
                {'mime_type': mime_type, 'data': image_data},
                "Extraia os dados. O campo paymentMethod é opcional para contas fixas."
            ])
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Erro IA Imagem: {e}")
            return None

ia_service = IAService()
