
import React from 'react';
import { 
  DollarSign, ShoppingCart, Home, Car, HeartPulse, GraduationCap, 
  Users, Briefcase, Dog, Gift, Landmark, Receipt, Percent, Coffee, 
  Utensils, Laptop, CheckCircle, Search, ShoppingBag, GlassWater, 
  Repeat, TrendingUp, Plane, Gamepad2, Sparkles, HandHeart, MoreHorizontal, 
  Shirt, Bus, Droplets, Zap, Dumbbell, Wifi, Phone, Bike
} from 'lucide-react';
import { Category, PaymentMethod } from './types';

export const CATEGORIES: Record<Category, { icon: React.ReactNode; color: string; label: string }> = {
  // Novas Categorias Recorrentes
  'Aluguel': { icon: <Home className="w-5 h-5" />, color: 'bg-indigo-500/10 text-indigo-500', label: 'Aluguel' },
  'Água': { icon: <Droplets className="w-5 h-5" />, color: 'bg-blue-400/10 text-blue-400', label: 'Água' },
  'Luz': { icon: <Zap className="w-5 h-5" />, color: 'bg-yellow-500/10 text-yellow-500', label: 'Luz' },
  'Academia': { icon: <Dumbbell className="w-5 h-5" />, color: 'bg-orange-500/10 text-orange-500', label: 'Academia' },
  'Internet': { icon: <Wifi className="w-5 h-5" />, color: 'bg-cyan-500/10 text-cyan-500', label: 'Internet' },
  'Plano de Saúde': { icon: <HeartPulse className="w-5 h-5" />, color: 'bg-red-500/10 text-red-500', label: 'Plano de Saúde' },
  'Telefone': { icon: <Phone className="w-5 h-5" />, color: 'bg-green-400/10 text-green-400', label: 'Telefone' },
  'Prestação do Carro': { icon: <Car className="w-5 h-5" />, color: 'bg-blue-600/10 text-blue-600', label: 'Prestação do Carro' },
  'Prestação Moto': { icon: <Bike className="w-5 h-5" />, color: 'bg-rose-500/10 text-rose-500', label: 'Prestação Moto' },

  // Categorias Originais
  'Família e Filhos': { icon: <Users className="w-5 h-5" />, color: 'bg-purple-500/10 text-purple-500', label: 'Família e Filhos' },
  'Pets': { icon: <Dog className="w-5 h-5" />, color: 'bg-orange-500/10 text-orange-500', label: 'Pets' },
  'Mercado': { icon: <ShoppingCart className="w-5 h-5" />, color: 'bg-pink-500/10 text-pink-500', label: 'Mercado' },
  'Compras': { icon: <ShoppingBag className="w-5 h-5" />, color: 'bg-yellow-500/10 text-yellow-500', label: 'Compras' },
  'Alimentação': { icon: <Utensils className="w-5 h-5" />, color: 'bg-blue-500/10 text-blue-500', label: 'Alimentação' },
  'Bares e Restaurantes': { icon: <GlassWater className="w-5 h-5" />, color: 'bg-pink-400/10 text-pink-400', label: 'Bares e Restaurantes' },
  'Saúde': { icon: <HeartPulse className="w-5 h-5" />, color: 'bg-red-500/10 text-red-500', label: 'Saúde' },
  'Trabalho': { icon: <Briefcase className="w-5 h-5" />, color: 'bg-purple-600/10 text-purple-600', label: 'Trabalho' },
  'Dívidas e Empréstimos': { icon: <Landmark className="w-5 h-5" />, color: 'bg-gray-500/10 text-gray-500', label: 'Dívidas e Empréstimos' },
  'Assinaturas e Serviços': { icon: <Repeat className="w-5 h-5" />, color: 'bg-indigo-500/10 text-indigo-500', label: 'Assinaturas e Serviços' },
  'Investimentos': { icon: <TrendingUp className="w-5 h-5" />, color: 'bg-green-600/10 text-green-600', label: 'Investimentos' },
  'Casa': { icon: <Home className="w-5 h-5" />, color: 'bg-teal-500/10 text-teal-500', label: 'Casa' },
  'Viagem': { icon: <Plane className="w-5 h-5" />, color: 'bg-cyan-500/10 text-cyan-500', label: 'Viagem' },
  'Educação': { icon: <GraduationCap className="w-5 h-5" />, color: 'bg-blue-600/10 text-blue-600', label: 'Educação' },
  'Impostos e Taxas': { icon: <Percent className="w-5 h-5" />, color: 'bg-orange-600/10 text-orange-600', label: 'Impostos e Taxas' },
  'Lazer e Hobbies': { icon: <Gamepad2 className="w-5 h-5" />, color: 'bg-yellow-600/10 text-yellow-600', label: 'Lazer e Hobbies' },
  'Cuidados Pessoais': { icon: <Sparkles className="w-5 h-5" />, color: 'bg-rose-400/10 text-rose-400', label: 'Cuidados Pessoais' },
  'Dízimo e Oferta': { icon: <HandHeart className="w-5 h-5" />, color: 'bg-blue-400/10 text-blue-400', label: 'Dízimo e Oferta' },
  'Outros': { icon: <MoreHorizontal className="w-5 h-5" />, color: 'bg-slate-500/10 text-slate-500', label: 'Outros' },
  'Roupas': { icon: <Shirt className="w-5 h-5" />, color: 'bg-indigo-400/10 text-indigo-400', label: 'Roupas' },
  'Transporte': { icon: <Bus className="w-5 h-5" />, color: 'bg-emerald-500/10 text-emerald-500', label: 'Transporte' },
  'Presentes e Doações': { icon: <Gift className="w-5 h-5" />, color: 'bg-pink-500/10 text-pink-500', label: 'Presentes e Doações' },
  
  // Categorias de Receita
  'Salário': { icon: <DollarSign className="w-5 h-5" />, color: 'bg-green-500/10 text-green-500', label: 'Salário' },
  'Refeição': { icon: <Utensils className="w-5 h-5" />, color: 'bg-yellow-500/10 text-yellow-500', label: 'Refeição' },
  'Outras Receitas': { icon: <CheckCircle className="w-5 h-5" />, color: 'bg-green-500/10 text-green-500', label: 'Outras Receitas' },
  'Moradia': { icon: <Home className="w-5 h-5" />, color: 'bg-orange-500/10 text-orange-500', label: 'Moradia' },
};

export const INCOME_CATEGORIES: Category[] = [
  'Salário',
  'Investimentos',
  'Refeição',
  'Presentes e Doações',
  'Outras Receitas',
  'Outros'
];

export const EXPENSE_CATEGORIES: Category[] = [
  'Aluguel', 'Água', 'Luz', 'Academia', 'Internet', 'Plano de Saúde', 'Telefone', 'Prestação do Carro', 'Prestação Moto',
  'Família e Filhos', 'Pets', 'Mercado', 'Compras', 'Alimentação', 'Bares e Restaurantes', 'Saúde', 'Trabalho',
  'Dívidas e Empréstimos', 'Assinaturas e Serviços', 'Investimentos', 'Casa', 'Viagem', 'Educação', 'Impostos e Taxas',
  'Lazer e Hobbies', 'Cuidados Pessoais', 'Dízimo e Oferta', 'Outros', 'Roupas', 'Transporte', 'Presentes e Doações'
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Boleto', 'Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Nubank', 'Itaú', 'Inter'
];
