
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum RecurrenceType {
  UNIQUE = 'UNIQUE',
  RECURRING = 'RECURRING',
  INSTALLMENT = 'INSTALLMENT'
}

export type Category = 
  | 'Aluguel'
  | 'Água'
  | 'Luz'
  | 'Academia'
  | 'Internet'
  | 'Plano de Saúde'
  | 'Telefone'
  | 'Prestação do Carro'
  | 'Prestação Moto'
  | 'Família e Filhos'
  | 'Pets'
  | 'Mercado'
  | 'Compras'
  | 'Alimentação'
  | 'Bares e Restaurantes'
  | 'Saúde'
  | 'Trabalho'
  | 'Dívidas e Empréstimos'
  | 'Assinaturas e Serviços'
  | 'Investimentos'
  | 'Casa'
  | 'Viagem'
  | 'Educação'
  | 'Impostos e Taxas'
  | 'Lazer e Hobbies'
  | 'Cuidados Pessoais'
  | 'Dízimo e Oferta'
  | 'Outros'
  | 'Roupas'
  | 'Transporte'
  | 'Presentes e Doações'
  | 'Salário'
  | 'Refeição'
  | 'Moradia'
  | 'Outras Receitas';

export type PaymentMethod = 'Boleto' | 'Pix' | 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Nubank' | 'Itaú' | 'Inter';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  category: Category;
  paymentMethod?: PaymentMethod | null;
  recurrence: RecurrenceType;
  userId: string;
  familyId: string;
  isPaid?: boolean;
  is_paid?: boolean; // Suporte para nome vindo do banco antes do mapeamento
}

export interface RecurringTemplate {
  category: Category;
  isActive: boolean;
  defaultAmount: number;
}

export interface AppState {
  transactions: Transaction[];
  user: UserProfile;
  limits: SpendingLimit[];
  paymentMethods: CustomPaymentMethod[];
  creditCards: CreditCard[];
  recurringTemplates: RecurringTemplate[]; 
  currentMonth: string; 
  theme: ThemeMode;
  isSyncing: boolean;
}

export interface SpendingLimit {
  id: string;
  category: Category;
  limit: number;
  spent: number;
}

export interface CustomPaymentMethod {
  id: string;
  name: string;
  icon: string; 
  isArchived: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  icon: string;
  dueDay: number;
  isArchived: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  familyId: string;
  avatar?: string;
}

export type ThemeMode = 'auto' | 'light' | 'dark';
