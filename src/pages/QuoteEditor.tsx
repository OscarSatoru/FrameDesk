import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { getCatalog, getCustomer, getCustomers, getQuote, saveCustomer, saveQuote, updateQuoteStatus } from '@/lib/storage';
import {
  LOCATION_SUGGESTIONS,
  computeLineTotal,
  computeSubtotal,
  createEmptyItem,
  formatILS,
  QUOTE_STATUSES,
  todayISO,
  uid,
  type Catalog,
  type Customer,
  type Quote,
  type QuoteItem,
  type QuoteStatus,
  type PaymentMilestone,
} from '@/lib/types';

const STEPS = [
  { n: 1, label: 'לקוח ופרויקט' },
  { n: 2, label: 'פתחים' },
  { n: 3, label: 'סיכום ותשלומים' },
];

function StepsHeader({ current, onGo }: { current: number; onGo: (step: number) => void }) {
  return (
    <ol className="mb-8 flex items-center gap-2 sm:gap-3">
      {STEPS.map((step, index) => {
        const isDone = step.n < current;
        const isActive = step.n === current;
        return (
          <li key={step.n} className="flex flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => isDone && onGo(step.n)}
              disabled={!isDone}
              className={`flex items-center gap-2 rounded-full px-1.5 py-1 text-sm transition-colors ${
                isActive
                  ? 'font-semibold text-foreground'
                  : isDone
                    ? 'font-medium text-primary hover:text-primary/80'
                    : 'text-muted-foreground'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isDone
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : step.n}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${isDone ? 'bg-primary/60' : 'bg-border'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function numberValue(value: string): number | '' {
  return value === '' ? '' : Number(value);
}

const DEFAULT_MILESTONES = (total: number): PaymentMilestone[] => [
  { id: uid(), title: 'מקדמה עם חתימת ההזמנה', percentage: 30, amount: Math.round(total * 0.3), isPaid: false },
  { id: uid(), title: 'אספקת חומרים / הרכבה', percentage: 50, amount: Math.round(total * 0.5), isPaid: false },
  { id: uid(), title: 'גמר עבודה ומסירה', percentage: 20, amount: Math.round(total * 0.2), isPaid: false },
];

export default function QuoteEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const catalog: Catalog = useMemo(() => getCatalog(), []);

  const [step, setStep] = useState(1);
  const [original, setOriginal] = useState<Quote | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<QuoteStatus>('טיוטה');
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const customers = useMemo(() => getCustomers(), []);
  const subtotal = useMemo(() => computeSubtotal(items), [items]);
  const grandTotal = useMemo(() => Math.round(subtotal * 1.18), [subtotal]);

  useEffect(() => {
    if (id && id !== 'new') {
      const existing = getQuote(id);
      if (existing) {
        setOriginal(existing);
        setTitle(existing.title);
        setDate(existing.date || todayISO());
        setNotes(existing.notes);
        setStatus(existing.status);
        setSelectedCustomerId(existing.customerId);
        setCustomerMode('existing');
        setItems(existing.items.length > 0 ? existing.items : [createEmptyItem()]);
        const calcSub = computeSubtotal(existing.items);
        const total = Math.round(calcSub * 1.18);
        setMilestones(
          existing.paymentMilestones && existing.paymentMilestones.length > 0
            ? existing.paymentMilestones
            : DEFAULT_MILESTONES(total)
        );
      } else {
        toast.error('ההצעה המבוקשת לא נמצאה');
        navigate('/');
      }
    } else {
      setDate(todayISO());
      setItems([createEmptyItem()]);
      setMilestones([]);
    }
  }, [id, navigate]);

  const selectedCustomer = selectedCustomerId ? getCustomer(selectedCustomerId) : undefined;

  const updateItem = (itemId: string, patch: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);

  const removeItem = (itemId: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== itemId) : prev));

  const updateMilestone = (milestoneId: string, patch: Partial<PaymentMilestone>) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== milestoneId) return m;
        const updated = { ...m, ...patch };
        if (patch.percentage !== undefined && patch.amount === undefined) {
          updated.amount = Math.round((grandTotal * Number(patch.percentage)) / 100);
        } else if (patch.amount !== undefined && patch.percentage === undefined) {
          updated.percentage = grandTotal > 0 ? Math.round((Number(patch.amount) / grandTotal) * 100) : 0;
        }
        return updated;
      })
    );
  };

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      { id: uid(), title: 'שלב תשלום נוסף', percentage: 0, amount: 0, isPaid: false },
    ]);
  };

  const removeMilestone = (milestoneId: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
  };

  const moveMilestone = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= milestones.length) return;

    setMilestones((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });
  };

  const goToStep2 = () => {
    const nextErrors: Record<string, string> = {};
    if (customerMode === 'existing' && !selectedCustomerId) {
      nextErrors.customer = 'יש לבחור לקוח מהרשימה';
    }
    if (customerMode === 'new') {
      if (!newCustomer.name.trim()) nextErrors.customer = 'שם הלקוח הוא שדה חובה';
      else if (!newCustomer.phone.trim()) nextErrors.customer = 'טלפון הלקוח הוא שדה חובה';
    }
    if (!title.trim()) nextErrors.title = 'כותרת ההצעה היא שדה חובה';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  };

  const goToStep3 = () => {
    if (items.length === 0) {
      setErrors({ items: 'יש להוסיף לפחות פתח אחד' });
      return;
    }
    setErrors({});
    if (milestones.length === 0) {
      setMilestones(DEFAULT_MILESTONES(grandTotal));
    }
    setStep(3);
    window.scrollTo(0, 0);
  };

  const goToStep = (target: number) => {
    setErrors({});
    setStep(target);
    window.scrollTo(0, 0);
  };

  const handleStatusChange = (nextStatus: QuoteStatus) => {
    setStatus(nextStatus);
    if (original) {
      updateQuoteStatus(original.id, nextStatus);
      toast.success(`הסטטוס עודכן ל"${nextStatus}"`);
    }
  };

 const handleSave = async (saveStatus: QuoteStatus) => {
    let customerId = selectedCustomerId;
    if (customerMode === 'new') {
      const customer: Customer = {
        id: uid(),
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim() || undefined,
        address: newCustomer.address.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await saveCustomer(customer);
      customerId = customer.id;
    }

    const now = new Date().toISOString();
    const quote: Quote = {
      id: original?.id ?? uid(),
      customerId,
      title: title.trim(),
      date,
      status: saveStatus,
      notes: notes.trim(),
      items,
      paymentMilestones: milestones,
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
    };
    await saveQuote(quote);
    toast.success(saveStatus === 'טיוטה' ? 'ההצעה נשמרה כטיוטה' : 'ההצעה סומנה כהצעה שנשלחה');
    navigate('/');
  };

  const customerNameForSummary =
    customerMode === 'existing' ? selectedCustomer?.name ?? '' : newCustomer.name.trim();
  const customerPhoneForSummary =
    customerMode === 'existing' ? selectedCustomer?.phone ?? '' : newCustomer.phone.trim();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ms-2 mb-2 text-muted-foreground">
          <button type="button" onClick={() => navigate('/')}>
            <ArrowRight className="me-1.5 h-4 w-4" />
            חזרה לדשבורד
          </button>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {original ? 'עריכת הצעת מחיר' : 'הצעת מחיר חדשה'}
          </h1>
          {original && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">סטטוס:</span>
              <Select value={status} onValueChange={(value) => handleStatusChange(value as QuoteStatus)}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <StepsHeader current={step} onGo={goToStep} />

      {/* Step 1 — customer & project header */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">פרטי לקוח</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="inline-flex rounded-lg border bg-muted p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={customerMode === 'existing' ? 'default' : 'ghost'}
                  onClick={() => setCustomerMode('existing')}
                >
                  לקוח קיים
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={customerMode === 'new' ? 'default' : 'ghost'}
                  onClick={() => setCustomerMode('new')}
                >
                  לקוח חדש
                </Button>
              </div>

              {customerMode === 'existing' ? (
                <div className="space-y-2">
                  <Label htmlFor="customer-select">בחירת לקוח</Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(value) => setSelectedCustomerId(value)}
                  >
                    <SelectTrigger id="customer-select">
                      <SelectValue placeholder="בחרו לקוח מהרשימה" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          אין לקוחות שמורים — עברו ל"לקוח חדש"
                        </div>
                      )}
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} · {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customer && <p className="text-sm text-destructive">{errors.customer}</p>}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">שם מלא *</Label>
                    <Input
                      id="new-name"
                      value={newCustomer.name}
                      onChange={(event) =>
                        setNewCustomer({ ...newCustomer, name: event.target.value })
                      }
                      placeholder="ישראל כהן"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-phone">טלפון *</Label>
                    <Input
                      id="new-phone"
                      dir="ltr"
                      value={newCustomer.phone}
                      onChange={(event) =>
                        setNewCustomer({ ...newCustomer, phone: event.target.value })
                      }
                      placeholder="050-1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">אימייל</Label>
                    <Input
                      id="new-email"
                      type="email"
                      dir="ltr"
                      value={newCustomer.email}
                      onChange={(event) =>
                        setNewCustomer({ ...newCustomer, email: event.target.value })
                      }
                      placeholder="israel@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-address">כתובת</Label>
                    <Input
                      id="new-address"
                      value={newCustomer.address}
                      onChange={(event) =>
                        setNewCustomer({ ...newCustomer, address: event.target.value })
                      }
                      placeholder="רחוב הרצל 1, תל אביב"
                    />
                  </div>
                  {errors.customer && <p className="text-sm text-destructive sm:col-span-2">{errors.customer}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">פרטי פרויקט</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quote-title">כותרת ההצעה *</Label>
                <Input
                  id="quote-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="החלפת חלונות בדירת 4 חדרים"
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-date">תאריך</Label>
                <Input
                  id="quote-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-notes">הערות</Label>
                <Textarea
                  id="quote-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="הערות נוספות להצעה..."
                  rows={3}
                />
              </div>
              <div className="flex justify-start pt-2">
                <Button onClick={goToStep2}>
                  המשך לפתחים
                  <ArrowLeft className="ms-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2 — openings (פתחים) items */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">פתחים</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="me-1.5 h-4 w-4" />
                הוספת פתח
              </Button>
            </CardHeader>
            <CardContent>
              {errors.items && <p className="mb-3 text-sm text-destructive">{errors.items}</p>}
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead className="font-semibold">מיקום</TableHead>
                      <TableHead className="font-semibold">סדרה</TableHead>
                      <TableHead className="text-center font-semibold">רוחב (מ"מ)</TableHead>
                      <TableHead className="text-center font-semibold">גובה (מ"מ)</TableHead>
                      <TableHead className="text-center font-semibold">כמות</TableHead>
                      <TableHead className="font-semibold">סוג זכוכית</TableHead>
                      <TableHead className="font-semibold">צבע אלומיניום</TableHead>
                      <TableHead className="font-semibold">ידית / ציוד</TableHead>
                      <TableHead className="text-center font-semibold">מחיר יחידה (₪)</TableHead>
                      <TableHead className="text-end font-semibold">סה"כ שורה</TableHead>
                      <TableHead aria-label="מחיקה" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="p-2">
                          <Input
                            list="fd-locations"
                            value={item.location}
                            onChange={(event) => updateItem(item.id, { location: event.target.value })}
                            placeholder="סלון"
                            className="h-9 min-w-28"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Select
                            value={item.series}
                            onValueChange={(value) => updateItem(item.id, { series: value })}
                          >
                            <SelectTrigger className="h-9 min-w-36">
                              <SelectValue placeholder="בחרו סדרה" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalog.series.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={item.width}
                            onChange={(event) =>
                              updateItem(item.id, { width: numberValue(event.target.value) })
                            }
                            placeholder="1200"
                            className="h-9 w-24 text-center tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={item.height}
                            onChange={(event) =>
                              updateItem(item.id, { height: numberValue(event.target.value) })
                            }
                            placeholder="1400"
                            className="h-9 w-24 text-center tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.id, { quantity: Math.max(1, Number(event.target.value) || 1) })
                            }
                            className="h-9 w-16 text-center tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            list="fd-glass"
                            value={item.glassType}
                            onChange={(event) => updateItem(item.id, { glassType: event.target.value })}
                            placeholder="בחרו או הקלידו"
                            className="h-9 min-w-36"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            list="fd-colors"
                            value={item.color}
                            onChange={(event) => updateItem(item.id, { color: event.target.value })}
                            placeholder="בחרו או הקלידו"
                            className="h-9 min-w-40"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            list="fd-hardware"
                            value={item.hardware}
                            onChange={(event) => updateItem(item.id, { hardware: event.target.value })}
                            placeholder="אופציונלי"
                            className="h-9 min-w-28"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateItem(item.id, { unitPrice: numberValue(event.target.value) })
                            }
                            placeholder="0"
                            className="h-9 w-28 text-center tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="p-2 text-end font-medium tabular-nums">
                          {formatILS(computeLineTotal(item))}
                        </TableCell>
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="מחיקת שורה"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <datalist id="fd-locations">
                  {LOCATION_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <datalist id="fd-glass">
                  {catalog.glassTypes.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <datalist id="fd-colors">
                  {catalog.colors.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <datalist id="fd-hardware">
                  {catalog.hardware.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  סה"כ ביניים: <span className="font-semibold text-foreground tabular-nums">{formatILS(subtotal)}</span>
                </p>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="me-1.5 h-4 w-4" />
                  הוספת פתח
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => goToStep(1)}>
              <ArrowRight className="me-2 h-4 w-4" />
              חזרה
            </Button>
            <Button onClick={goToStep3}>
              המשך לסיכום ותשלומים
              <ArrowLeft className="ms-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — summary, milestones & save */}
      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">סיכום ההצעה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">כותרת</dt>
                    <dd className="mt-0.5 font-medium">{title}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">לקוח</dt>
                    <dd className="mt-0.5 font-medium">{customerNameForSummary}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">טלפון</dt>
                    <dd className="mt-0.5 font-medium tabular-nums" dir="ltr">
                      {customerPhoneForSummary}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">תאריך</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{date.split('-').reverse().join('/')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">מספר פתחים</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">סטטוס</dt>
                    <dd className="mt-0.5 font-medium">{status}</dd>
                  </div>
                  {notes.trim() && (
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-muted-foreground">הערות</dt>
                      <dd className="mt-0.5">{notes}</dd>
                    </div>
                  )}
                </dl>

                <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">סה"כ ביניים</span>
                    <span className="font-medium tabular-nums">{formatILS(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">מע"מ (18%)</span>
                    <span className="font-medium tabular-nums">
                      {formatILS(subtotal * 0.18)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="font-semibold">סה"כ כולל מע"מ</span>
                    <span className="text-xl font-bold text-primary tabular-nums">
                      {formatILS(grandTotal)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Milestones Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">חלוקת תשלומים (אבני דרך)</CardTitle>
                <Button variant="outline" size="sm" onClick={addMilestone}>
                  <Plus className="me-1.5 h-4 w-4" />
                  הוספת תשלום
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {milestones.map((m, index) => (
                    <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 bg-background">
                      <div className="flex flex-col gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => moveMilestone(index, 'up')}
                          className="h-4 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="הזז למעלה"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === milestones.length - 1}
                          onClick={() => moveMilestone(index, 'down')}
                          className="h-4 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="הזז למטה"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Input
                        value={m.title}
                        onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                        placeholder="תיאור השלב..."
                        className="h-9 flex-1 min-w-[150px]"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={m.percentage}
                          onChange={(e) => updateMilestone(m.id, { percentage: Number(e.target.value) || 0 })}
                          className="h-9 w-16 text-center tabular-nums"
                          min={0}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={m.amount}
                          onChange={(e) => updateMilestone(m.id, { amount: Number(e.target.value) || 0 })}
                          className="h-9 w-28 text-center tabular-nums"
                          min={0}
                        />
                        <span className="text-sm text-muted-foreground">₪</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMilestone(m.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t mt-3">
                  <span>סה"כ מוקצה באחוזים: <strong className="text-foreground font-semibold">{milestones.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0)}%</strong> מתוך 100%</span>
                  <span>סה"כ מוקצה (כולל מע"מ): <strong className="text-foreground font-semibold">{formatILS(milestones.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0))}</strong> מתוך {formatILS(grandTotal)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">שמירה ואישור</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                בחרו כיצד לשמור את ההצעה. תנאי התשלום יישמרו ויוצגו במסמך ההדפסה.
              </p>
              <Button variant="outline" className="w-full" onClick={() => handleSave('טיוטה')}>
                שמור כטיוטה
              </Button>
              <Button className="w-full" onClick={() => handleSave('נשלחה הצעה')}>
                סמן כהצעה שנשלחה
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => goToStep(2)}>
                <ArrowRight className="me-2 h-4 w-4" />
                חזרה לפתחים
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}