
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models
from ia_service import ia_service
from datetime import datetime

app = FastAPI(title="ZenFinanceiro AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependência do Banco de Dados
def get_db():
    db = "database_session" 
    try:
        yield db
    finally:
        pass

@app.post("/process-entry")
async def process_entry(
    entry_type: str = Form(...), # 'voice' ou 'image'
    text_content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Endpoint principal para processamento multimodal.
    Se voice: text_content deve ser enviado.
    Se image: file deve ser enviado.
    """
    if entry_type == "voice" and text_content:
        result = await ia_service.process_voice_transcription(text_content)
    elif entry_type == "image" and file:
        content = await file.read()
        result = await ia_service.process_image_ocr(content, file.content_type)
    else:
        raise HTTPException(status_code=400, detail="Entrada inválida")

    if not result:
        raise HTTPException(status_code=422, detail="Não foi possível extrair dados da entrada")
    
    if result.get("amount") is None:
        raise HTTPException(status_code=422, detail="Valor da transação não identificado")

    return result

@app.post("/auth/register", status_code=201)
async def register_user(user_data: dict):
    return {"message": "Usuário registrado com sucesso", "family_id": 1}

@app.post("/transactions", status_code=201)
async def create_transaction(transaction: dict, db: Session = Depends(get_db)):
    # Aqui salvaríamos no PostgreSQL usando models.Transaction
    return {"id": 123, "status": "recorded", "data": transaction}

@app.get("/transactions")
async def get_transactions(family_id: int):
    return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
