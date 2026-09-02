import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, FileText, Pencil, Printer, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { deleteQuote, getCustomers, getQuotes, updateQuoteStatus } from '@/lib/storage';
import {
  computeSubtotal,
  formatDateISO,
  formatILS,
  QUOTE_STATUSES,
  STATUS_BADGE_CLASSES,
  type Customer,
  type Quote,
  type QuoteStatus,
} from '@/lib/types';

export default function Index() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all');
  const [toDelete, setToDelete] = useState<Quote | null>(null);

  useEffect(() => {
    setQuotes(getQuotes());
    setCustomers(getCustomers());
  }, []);

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      const customer = customerById.get(quote.customerId);
      const matchesSearch =
        !query ||
        (customer?.name ?? '').toLowerCase().includes(query) ||
        (customer?.phone ?? '').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, search, statusFilter, customerById]);

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all';

  const handleDelete = () => {
    if (!toDelete) return;
    deleteQuote(toDelete.id);
    setQuotes(getQuotes());
    setToDelete(null);
    toast.success('ההצעה נמחקה');
  };

  const handleStatusChange = (quoteId: string, status: QuoteStatus) => {
    updateQuoteStatus(quoteId, status);
    setQuotes(getQuotes());
    toast.success(`הסטטוס עודכן ל"${status}"`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">הצעות מחיר</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} הצעות מתוך {quotes.length} בסך הכל
          </p>
        </div>
        <Button asChild>
          <Link to="/quotes/new">
            <FilePlus2 className="me-2 h-4 w-4" />
            הצעת מחיר חדשה
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי שם לקוח או טלפון..."
            className="ps-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as 'all' | QuoteStatus)}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="סינון לפי סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {QUOTE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          {quotes.length === 0 ? (
            <>
              <h2 className="text-lg font-semibold">אין עדיין הצעות מחיר</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                כאן יופיעו כל הצעות המחיר שתיצרו, עם סטטוס, סכום ופרטי לקוח — התחילו בהצעה הראשונה.
              </p>
              <Button asChild className="mt-6">
                <Link to="/quotes/new">
                  <FilePlus2 className="me-2 h-4 w-4" />
                  הצעת מחיר חדשה
                </Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">לא נמצאו הצעות מתאימות</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                נסו לשנות את החיפוש או הסינון כדי למצוא את ההצעה שאתם מחפשים.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  ניקוי חיפוש וסינון
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="font-semibold">כותרת</TableHead>
                <TableHead className="font-semibold">לקוח</TableHead>
                <TableHead className="font-semibold">טלפון</TableHead>
                <TableHead className="font-semibold">סטטוס</TableHead>
                <TableHead className="font-semibold">תאריך</TableHead>
                <TableHead className="text-end font-semibold">סה"כ כולל מע"מ (₪)</TableHead>
                <TableHead className="text-end font-semibold">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((quote) => {
                const customer = customerById.get(quote.customerId);
                return (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.title}</TableCell>
                    <TableCell>{customer?.name ?? '—'}</TableCell>
                    <TableCell dir="ltr" className="text-end tabular-nums">
                      {customer?.phone ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={quote.status}
                        onValueChange={(value) => handleStatusChange(quote.id, value as QuoteStatus)}
                      >
                        <SelectTrigger
                          className={`h-8 w-auto gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium ${STATUS_BADGE_CLASSES[quote.status]}`}
                          aria-label={`שינוי סטטוס עבור ${quote.title}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUOTE_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDateISO(quote.date)}</TableCell>
                    <TableCell className="text-end font-medium tabular-nums">
                      {formatILS(Math.round(computeSubtotal(quote.items) * 1.18))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="עריכת הצעה"
                          className="h-8 w-8"
                        >
                          <Link to={`/quotes/${quote.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="תצוגת הדפסה"
                          className="h-8 w-8"
                        >
                          <Link to={`/quotes/${quote.id}/print`}>
                            <Printer className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="מחיקת הצעה"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setToDelete(quote)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת הצעת מחיר</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את ההצעה "{toDelete?.title}"? פעולה זו אינה ניתנת לשחזור.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}