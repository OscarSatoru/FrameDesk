/* Domain models, option constants and calculation helpers for FrameDesk. */

export type QuoteStatus = 'טיוטה' | 'נשלחה הצעה' | 'אושרה' | 'בוטלה';

export type UserRole = 'admin' | 'sub_admin' | 'viewer' | 'מנהל' | 'מכירות';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: string;
}

export interface PaymentMilestone {
  id: string;
  title: string;
  percentage: number;
  amount: number;
  isPaid: boolean;
}

export interface QuoteItem {
  id: string;
  location: string;
  series: string;
  width: number | '';
  height: number | '';
  quantity: number;
  glassType: string;
  color: string;
  hardware: string;
  unitPrice: number | '';
}

export interface Quote {
  id: string;
  customerId: string;
  title: string;
  /** ISO date string (yyyy-mm-dd) */
  date: string;
  status: QuoteStatus;
  notes: string;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
  paymentMilestones?: PaymentMilestone[];
}

export interface User {
  id: string;
  username: string;
  name?: string;
  fullName?: string;
  role: UserRole;
  createdAt: string;
}

export type AppUser = User;

/** Admin-managed option catalog (editable without touching code). */
export interface Catalog {
  series: string[];
  glassTypes: string[];
  colors: string[];
  hardware: string[];
}

/** One-time invite code for new-user registration. */
export interface InviteCode {
  id: string;
  code: string;
  role: 'admin' | 'sub_admin' | 'viewer';
  used: boolean;
  usedBy?: string;
  expiresAt: string; // תאריך תפוגה בפורמט ISO
  createdAt: string;
}

export const QUOTE_STATUSES: QuoteStatus[] = ['טיוטה', 'נשלחה הצעה', 'אושרה', 'בוטלה'];
export const DEFAULT_STATUS: QuoteStatus = 'טיוטה';

export const SERIES_OPTIONS = ['קליל 7300', 'קליל 9200', 'קליל 4300', 'קליל 1700', 'אחר'];
export const GLASS_OPTIONS = ['בידודית 4-12-4', 'טריפלקס 4+4', 'שקוף 6 מ"מ'];
export const COLOR_OPTIONS = ['RAL 7016 אפור כהה', 'RAL 9010 לבן', 'שחור מט'];

export const DEFAULT_CATALOG: Catalog = {
  series: [...SERIES_OPTIONS],
  glassTypes: [...GLASS_OPTIONS],
  colors: [...COLOR_OPTIONS],
  hardware: ['ידית סטנדרטית', 'ידית מודרנית מוגבהת', 'מנגנון נעילה רב-נקודתי'],
};

export const LOCATION_SUGGESTIONS = [
  'סלון',
  'מטבח',
  'חדר שינה',
  'חדר ילדים',
  'מרפסת',
  'חדר רחצה',
  'מסדרון',
  'משרד',
];

export const VAT_RATE = 0.18;

/* Status tones derived from the Zen palette (warm stone / sand / olive / muted red). */
export const STATUS_BADGE_CLASSES: Record<QuoteStatus, string> = {
  טיוטה:
    'bg-muted text-muted-foreground border-border dark:bg-muted/40 dark:text-muted-foreground dark:border-border',
  'נשלחה הצעה':
    'bg-[hsl(35_20%_60%_/_0.16)] text-[hsl(25_20%_30%)] border-[hsl(35_20%_60%_/_0.4)] dark:bg-[hsl(35_20%_60%_/_0.18)] dark:text-[hsl(35_30%_75%)] dark:border-[hsl(35_20%_60%_/_0.35)]',
  אושרה:
    'bg-[hsl(75_15%_40%_/_0.14)] text-[hsl(75_20%_25%)] border-[hsl(75_15%_40%_/_0.4)] dark:bg-[hsl(75_10%_55%_/_0.18)] dark:text-[hsl(75_15%_70%)] dark:border-[hsl(75_10%_55%_/_0.4)]',
  בוטלה:
    'bg-[hsl(10_30%_45%_/_0.12)] text-[hsl(10_35%_35%)] border-[hsl(10_30%_45%_/_0.35)] dark:bg-[hsl(10_40%_50%_/_0.16)] dark:text-[hsl(10_45%_68%)] dark:border-[hsl(10_40%_50%_/_0.35)]',
};

export const STATUS_DOT_CLASSES: Record<QuoteStatus, string> = {
  טיוטה: 'bg-muted-foreground/60',
  'נשלחה הצעה': 'bg-[hsl(35_20%_55%)] dark:bg-[hsl(35_25%_65%)]',
  אושרה: 'bg-[hsl(75_15%_40%)] dark:bg-[hsl(75_10%_55%)]',
  בוטלה: 'bg-[hsl(10_30%_45%)] dark:bg-[hsl(10_40%_50%)]',
};

export function createEmptyItem(): QuoteItem {
  return {
    id: uid(),
    location: '',
    series: '',
    width: '',
    height: '',
    quantity: 1,
    glassType: '',
    color: '',
    hardware: '',
    unitPrice: '',
  };
}

/** Line total = quantity × unit price */
export function computeLineTotal(item: Pick<QuoteItem, 'quantity' | 'unitPrice'>): number {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  return quantity * unitPrice;
}

export function computeSubtotal(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + computeLineTotal(item), 0);
}

export function computeVat(subtotal: number): number {
  return subtotal * VAT_RATE;
}

export function computeGrandTotal(subtotal: number): number {
  return subtotal + computeVat(subtotal);
}

export function formatILS(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(value);
}

export function todayISO(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Formats an ISO yyyy-mm-dd date as dd/mm/yyyy for display */
export function formatDateISO(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface ProjectAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'doc';
  uploadedAt: string;
}

// עדכון InviteCode: תמיכה בשיוך לקוח/הצעה
export interface InviteCode {
  id: string;
  code: string;
  role: 'admin' | 'sub_admin' | 'viewer';
  assignedCustomerId?: string; // הלקוח המשויך
  used: boolean;
  usedBy?: string;
  expiresAt: string;
  createdAt: string;
}

// עדכון User: שיוך למזהה לקוח
export interface User {
  id: string;
  username: string;
  name?: string;
  fullName?: string;
  role: UserRole;
  customerId?: string; // עבור viewer
  createdAt: string;
}