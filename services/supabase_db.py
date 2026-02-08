
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class SupabaseService:
    """
    Serviço centralizado para interação com o Supabase (Database e Auth).
    """
    def __init__(self):
        self.url: str = os.getenv("SUPABASE_URL")
        self.key: str = os.getenv("SUPABASE_ANON_KEY")
        
        if not self.url or not self.key:
            print("Aviso: Credenciais do Supabase não encontradas no .env")
            self.client = None
        else:
            self.client: Client = create_client(self.url, self.key)

    def get_client(self) -> Client:
        return self.client

# Instância única para uso em toda a aplicação
supabase_db = SupabaseService()
