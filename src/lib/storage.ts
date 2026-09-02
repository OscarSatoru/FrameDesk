import { supabase } from './supabase';
import {
  uid,
  type Catalog,
  type Customer,
  type InviteCode,
  type Quote,
  type QuoteStatus,
  type User,
} from './types';

// ==================== AUTH & USERS ====================

const CURRENT_USER_KEY = 'framedesk_current_user';
const REGISTERED_USERS_KEY = 'framedesk_registered_users';

interface StoredAccount {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'sub_admin' | 'viewer' | 'מנהל' | 'מכירות';
  customerId?: string;
  createdAt: string;
}

function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: 'admin-default',
      email: 'admin@framedesk.com',
      password: 'admin',
      fullName: 'מנהל המערכת',
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function login(
  emailInput: string,
  passwordInput?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = emailInput.trim().toLowerCase();

  if (!cleanEmail) {
    return { success: false, error: 'יש להזין כתובת אימייל' };
  }

  // 1. בדיקת מנהל ברירת מחדל
  if (
    cleanEmail === 'admin' &&
    (!passwordInput || passwordInput === 'admin' || passwordInput === 'admin123')
  ) {
    const defaultAdmin: User = {
      id: 'admin-default',
      username: 'admin@framedesk.com',
      fullName: 'מנהל המערכת',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultAdmin));
    return { success: true };
  }

  // 2. בדיקה בחשבונות השמורים מקומית
  const accounts = getStoredAccounts();
  const foundAccount = accounts.find((acc) => acc.email.toLowerCase() === cleanEmail);

  if (foundAccount) {
    if (foundAccount.password && passwordInput && foundAccount.password !== passwordInput) {
      return { success: false, error: 'סיסמה שגויה. נסו שוב.' };
    }

    const user: User = {
      id: foundAccount.id,
      username: foundAccount.email,
      fullName: foundAccount.fullName,
      customerId: foundAccount.customerId,
      role: foundAccount.role,
      createdAt: foundAccount.createdAt,
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true };
  }

  // 3. בדיקה ב-Supabase במידה וקיים פרופיל
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profile) {
      const user: User = {
        id: profile.id,
        username: profile.email,
        fullName: profile.full_name,
        role: profile.role || 'sub_admin',
        createdAt: profile.created_at,
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return { success: true };
    }
  } catch (err) {
    console.warn('Supabase login check skipped', err);
  }

  return {
    success: false,
    error: 'משתמש לא נמצא. נא לבדוק את האימייל או להירשם עם קוד הזמנה.',
  };
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    id: 'admin-default',
    username: 'admin@framedesk.com',
    fullName: 'מנהל המערכת',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
}

export function logout(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

// ==================== INVITE CODES ====================

export function getInviteCodes(): InviteCode[] {
  try {
    const raw = localStorage.getItem('framedesk_invites');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export async function fetchInviteCodes(): Promise<InviteCode[]> {
  try {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const list: InviteCode[] = data.map((item) => ({
        id: item.id,
        code: item.code,
        role: item.role,
        used: item.used,
        usedBy: item.used_by || undefined,
        expiresAt: item.expires_at,
        createdAt: item.created_at,
      }));
      localStorage.setItem('framedesk_invites', JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Supabase fetch invite codes failed, using local storage', err);
  }

  return getInviteCodes();
}

export async function createInviteCode(
  role: 'admin' | 'sub_admin' | 'viewer' = 'sub_admin',
  hoursValid: number = 48,
  assignedCustomerId?: string
): Promise<InviteCode> {
  const expiresDate = new Date();
  expiresDate.setHours(expiresDate.getHours() + hoursValid);

  const newInvite: InviteCode = {
    id: uid(),
    code: 'FD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    role,
    assignedCustomerId: role === 'viewer' ? assignedCustomerId : undefined,
    used: false,
    expiresAt: expiresDate.toISOString(),
    createdAt: new Date().toISOString(),
  };

  const current = getInviteCodes();
  localStorage.setItem('framedesk_invites', JSON.stringify([newInvite, ...current]));

  try {
    await supabase.from('invite_codes').insert({
      id: newInvite.id,
      code: newInvite.code,
      role: newInvite.role,
      assigned_customer_id: newInvite.assignedCustomerId,
      expires_at: newInvite.expiresAt,
      used: false,
      created_at: newInvite.createdAt,
    });
  } catch (err) {
    console.warn('Supabase invite insert skipped', err);
  }

  return newInvite;
}

export async function deleteInviteCode(id: string): Promise<void> {
  const filtered = getInviteCodes().filter((i) => i.id !== id);
  localStorage.setItem('framedesk_invites', JSON.stringify(filtered));

  try {
    await supabase.from('invite_codes').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase delete invite skipped', err);
  }
}

export async function register(
  email: string,
  fullName: string,
  password: string,
  inviteCodeText: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inviteCodeText.trim().toUpperCase();

  if (!cleanEmail.includes('@')) {
    return { success: false, error: 'נא להזין כתובת אימייל תקינה' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: 'הסיסמה חייבת להכיל לפחות 4 תווים' };
  }

  let invite: InviteCode | undefined;

  try {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (!error && data) {
      invite = {
        id: data.id,
        code: data.code,
        role: data.role,
        used: data.used,
        usedBy: data.used_by || undefined,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
      };
    }
  } catch (err) {
    console.warn('Supabase fetch invite failed, falling back to localStorage', err);
  }

  if (!invite) {
    const localInvites = getInviteCodes();
    invite = localInvites.find((i) => i.code === cleanCode);
  }

  if (!invite) {
    return { success: false, error: 'קוד ההזמנה אינו קיים במערכת' };
  }

  if (invite.used) {
    return { success: false, error: 'קוד הזמנה זה כבר נוצל' };
  }

  const isExpired = new Date(invite.expiresAt) < new Date();
  if (isExpired) {
    return { success: false, error: 'פג תוקפו של קוד ההזמנה (פנה למנהל לקבלת קוד חדש)' };
  }

  const newAccount: StoredAccount = {
    id: uid(),
    email: cleanEmail,
    password: password,
    fullName: fullName.trim(),
    role: invite.role,
    customerId: invite.assignedCustomerId,
    createdAt: new Date().toISOString(),
  };

  const allAccounts = getStoredAccounts().filter((a) => a.email !== cleanEmail);
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([...allAccounts, newAccount]));

  const localList = getInviteCodes().map((i) =>
    i.id === invite!.id ? { ...i, used: true, usedBy: cleanEmail } : i
  );
  localStorage.setItem('framedesk_invites', JSON.stringify(localList));

  const sessionUser: User = {
    id: newAccount.id,
    username: newAccount.email,
    fullName: newAccount.fullName,
    role: newAccount.role,
    customerId: newAccount.customerId,
    createdAt: newAccount.createdAt,
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

  try {
    await supabase
      .from('invite_codes')
      .update({ used: true, used_by: cleanEmail })
      .eq('id', invite.id);

    await supabase.from('profiles').upsert({
      id: newAccount.id,
      email: newAccount.email,
      full_name: newAccount.fullName,
      role: newAccount.role,
      created_at: newAccount.createdAt,
    });
  } catch (err) {
    console.warn('Supabase sync skipped on register', err);
  }

  return { success: true };
}

// ==================== CATALOG ====================

export function getCatalog(): Catalog {
  try {
    const raw = localStorage.getItem('framedesk_catalog');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    series: ['קליל 7000', 'קליל 9000', 'קליל 4300', 'קליל 1700', 'קליל 2200'],
    glassTypes: ['טריפלקס 3+3', 'בידודית 4-6-4', 'מחוסמת 8 מ"מ', 'חלבית 6 מ"מ', 'שקוף 4 מ"מ'],
    colors: ['RAL 9016 (לבן מבריק)', 'RAL 9005 (שחור מט)', 'RAL 7016 (אפור גרפיט)', 'אנודייז טבעי'],
    hardware: ['ידית סיבוב סטנדרט', 'מנעול רב-בריחי', 'רשת גרמנית שקופה', 'ללא'],
  };
}

export async function fetchCatalog(): Promise<Catalog> {
  try {
    const { data, error } = await supabase
      .from('catalog')
      .select('*')
      .eq('id', 'default')
      .single();

    if (!error && data) {
      const catalog: Catalog = {
        series: data.series || [],
        glassTypes: data.glass_types || [],
        colors: data.colors || [],
        hardware: data.hardware || [],
      };
      localStorage.setItem('framedesk_catalog', JSON.stringify(catalog));
      return catalog;
    }
  } catch (err) {
    console.warn('Supabase catalog fetch failed, using local storage', err);
  }

  return getCatalog();
}

export async function saveCatalog(catalog: Catalog): Promise<void> {
  localStorage.setItem('framedesk_catalog', JSON.stringify(catalog));
  try {
    await supabase.from('catalog').upsert({
      id: 'default',
      series: catalog.series,
      glass_types: catalog.glassTypes,
      colors: catalog.colors,
      hardware: catalog.hardware,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase save catalog skipped', err);
  }
}

// ==================== CUSTOMERS ====================

export function getCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem('framedesk_customers');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export async function fetchCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const customers: Customer[] = data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || undefined,
        address: c.address || undefined,
        createdAt: c.created_at,
      }));
      localStorage.setItem('framedesk_customers', JSON.stringify(customers));
      return customers;
    }
  } catch (err) {
    console.warn('Supabase fetch customers failed, using local', err);
  }

  return getCustomers();
}

export function getCustomer(id: string): Customer | undefined {
  return getCustomers().find((c) => c.id === id);
}

export async function saveCustomer(customer: Customer): Promise<void> {
  const current = getCustomers().filter((c) => c.id !== customer.id);
  const updated = [customer, ...current];
  localStorage.setItem('framedesk_customers', JSON.stringify(updated));

  try {
    await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      address: customer.address || null,
      created_at: customer.createdAt,
    });
  } catch (err) {
    console.warn('Supabase save customer skipped', err);
  }
}

// ==================== QUOTES ====================

export function getQuotes(): Quote[] {
  try {
    const raw = localStorage.getItem('framedesk_quotes');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export async function fetchQuotes(): Promise<Quote[]> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const quotes: Quote[] = data.map((q) => ({
        id: q.id,
        customerId: q.customer_id,
        title: q.title,
        date: q.date,
        status: q.status as QuoteStatus,
        notes: q.notes || '',
        items: q.items || [],
        paymentMilestones: q.payment_milestones || [],
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      }));
      localStorage.setItem('framedesk_quotes', JSON.stringify(quotes));
      return quotes;
    }
  } catch (err) {
    console.warn('Supabase fetch quotes failed, using local', err);
  }

  return getQuotes();
}

export function getQuote(id: string): Quote | undefined {
  return getQuotes().find((q) => q.id === id);
}

export async function saveQuote(quote: Quote): Promise<void> {
  const current = getQuotes().filter((q) => q.id !== quote.id);
  const updated = [quote, ...current];
  localStorage.setItem('framedesk_quotes', JSON.stringify(updated));

  try {
    await supabase.from('quotes').upsert({
      id: quote.id,
      customer_id: quote.customerId,
      title: quote.title,
      date: quote.date,
      status: quote.status,
      notes: quote.notes || '',
      items: quote.items || [],
      payment_milestones: quote.paymentMilestones || [],
      created_at: quote.createdAt,
      updated_at: quote.updatedAt,
    });
  } catch (err) {
    console.warn('Supabase save quote skipped', err);
  }
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<void> {
  const quotes = getQuotes().map((q) =>
    q.id === quoteId ? { ...q, status, updatedAt: new Date().toISOString() } : q
  );
  localStorage.setItem('framedesk_quotes', JSON.stringify(quotes));

  try {
    await supabase
      .from('quotes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', quoteId);
  } catch (err) {
    console.warn('Supabase update status skipped', err);
  }
}

export async function deleteQuote(quoteId: string): Promise<void> {
  const quotes = getQuotes().filter((q) => q.id !== quoteId);
  localStorage.setItem('framedesk_quotes', JSON.stringify(quotes));

  try {
    await supabase.from('quotes').delete().eq('id', quoteId);
  } catch (err) {
    console.warn('Supabase delete quote skipped', err);
  }
}