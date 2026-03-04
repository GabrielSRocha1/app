
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum RecurrenceType {
  UNIQUE = 'UNIQUE',
  RECURRING = 'RECURRING',
  INSTALLMENT = 'INSTALLMENT'
}

export type Category = string;

export type PaymentMethod = string;



export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  category: Category;
  paymentMethod?: PaymentMethod | null;
  bank?: string | null;
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
  notifications: AppNotification[];
}

export interface SpendingLimit {
  id: string;
  category: Category;
  limit: number;
  spent: number;
  user_email?: string;
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

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  isRead: boolean;
  date: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  familyId: string;
  avatar?: string;
}

export type ThemeMode = 'auto' | 'light' | 'dark';
