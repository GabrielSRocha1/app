
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import enum
from datetime import datetime

Base = declarative_base()

class TransactionType(enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class RecurrenceType(enum.Enum):
    UNIQUE = "UNIQUE"
    RECURRING = "RECURRING"
    INSTALLMENT = "INSTALLMENT"

class Family(Base):
    __tablename__ = "families"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    users = relationship("User", back_populates="family")
    transactions = relationship("Transaction", back_populates="family")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    
    family = relationship("Family", back_populates="users")
    created_transactions = relationship("Transaction", back_populates="creator")

class Transaction(Base):
    """
    IMPORTANTE: Para resolver o erro PGRST204, execute no SQL Editor do Supabase:
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "paymentMethod" text;
    """
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Float)
    date = Column(String) 
    type = Column(String) 
    category = Column(String)
    
    # Mapeamento explícito para o nome usado pelo PostgREST do Supabase vindo do Frontend
    paymentMethod = Column("paymentMethod", String, nullable=True, default=None) 
    recurrence = Column(String, nullable=True)    
    user_email = Column(String, nullable=True)    
    is_paid = Column(Boolean, default=False)      
    
    ai_summary = Column(String, nullable=True)
    is_ai_generated = Column(Boolean, default=False)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    
    creator = relationship("User", back_populates="created_transactions")
    family = relationship("Family", back_populates="transactions")
