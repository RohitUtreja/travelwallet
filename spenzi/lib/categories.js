import {
  House, ShoppingBasket, UtensilsCrossed, Zap, Dumbbell, ShieldCheck, TrendingUp,
  Clapperboard, Bus, Car, CarTaxiFront, BedDouble, Plane, Ticket, ShoppingBag,
  Fuel, Pill, Smartphone, CircleEllipsis,
} from 'lucide-react'

// Order = picker order. `legacy` ids stay readable in old data but are hidden from the picker.
export const CATEGORIES = {
  rent:          { label: 'Rent',          icon: House,           color: '#b9a3d9' },
  groceries:     { label: 'Groceries',     icon: ShoppingBasket,  color: '#86bf9f' },
  eatingout:     { label: 'Eating out',    icon: UtensilsCrossed, color: '#e58b7f' },
  utilities:     { label: 'Utilities',     icon: Zap,             color: '#e4cf9e' },
  fitness:       { label: 'Fitness',       icon: Dumbbell,        color: '#8fc9c4' },
  insurance:     { label: 'Insurance',     icon: ShieldCheck,     color: '#9bb5d6' },
  investment:    { label: 'Investment',    icon: TrendingUp,      color: '#c9a96a' },
  entertainment: { label: 'Entertainment', icon: Clapperboard,    color: '#d6a0b5' },
  transport:     { label: 'Transport',     icon: Bus,             color: '#9bb5d6' },
  car:           { label: 'Car',           icon: Car,             color: '#a9a3d9' },
  taxi:          { label: 'Taxi',          icon: CarTaxiFront,    color: '#d9b38c' },
  fuel:          { label: 'Fuel',          icon: Fuel,            color: '#d98f7a' },
  hotel:         { label: 'Hotel',         icon: BedDouble,       color: '#8fc9c4' },
  flights:       { label: 'Flights',       icon: Plane,           color: '#86bfd0' },
  activities:    { label: 'Activities',    icon: Ticket,          color: '#d9b38c' },
  shopping:      { label: 'Shopping',      icon: ShoppingBag,     color: '#d98fa9' },
  medical:       { label: 'Medical',       icon: Pill,            color: '#b9a3d9' },
  other:         { label: 'Other',         icon: CircleEllipsis,  color: '#9a9488' },
  // legacy ids from earlier versions of the app
  food:          { label: 'Food',          icon: UtensilsCrossed, color: '#e58b7f', legacy: true },
  comms:         { label: 'Comms',         icon: Smartphone,      color: '#9bb5d6', legacy: true },
}

export const PICKER_CATEGORIES = Object.entries(CATEGORIES).filter(([, c]) => !c.legacy)

export function getCategory(id) {
  return CATEGORIES[id] ?? CATEGORIES.other
}
