import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCustomer, getQuote } from '@/lib/storage';
import { computeLineTotal, computeSubtotal, formatILS } from '@/lib/types';

export default function PrintPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const quote = useMemo(() => (id ? getQuote(id) : undefined), [id]);
  const customer = useMemo(
    () => (quote ? getCustomer(quote.customerId) : undefined),
    [quote]
  );

  useEffect(() => {
    if (!quote && id) {
      navigate('/');
    }
  }, [quote, id, navigate]);

  if (!quote) return null;

  const subtotal = computeSubtotal(quote.items);
  const vatAmount = subtotal * 0.18;
  const grandTotal = Math.round(subtotal * 1.18);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8 print:bg-white print:p-0">
      {/* סרגל עליון */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowRight className="me-1.5 h-4 w-4" />
          חזרה
        </Button>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          הדפסה / שמירה כ-PDF
        </Button>
      </div>

      {/* דף ההצעה הרשמי */}
      <div className="mx-auto max-w-4xl rounded-lg border bg-card p-8 shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none">
        {/* כותרת */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">הצעת מחיר</h1>
            <p className="mt-1 text-sm text-muted-foreground">מספר הצעה: #{quote.id.slice(0, 8)}</p>
          </div>
          <div className="text-start">
            <h2 className="text-lg font-semibold text-foreground">ניהול עבודות אלומיניום</h2>
            <p className="text-sm text-muted-foreground">תאריך: {quote.date.split('-').reverse().join('/')}</p>
          </div>
        </div>

        {/* פרטי לקוח ופרויקט */}
        <div className="my-6 grid grid-cols-2 gap-4 rounded-md border bg-muted/20 p-4 text-sm">
          <div>
            <span className="font-semibold text-foreground">לכבוד:</span> {customer?.name || 'לקוח מזדמן'}
            {customer?.phone && (
              <p className="text-muted-foreground" dir="ltr">
                טלפון: {customer.phone}
              </p>
            )}
            {customer?.address && <p className="text-muted-foreground">כתובת: {customer.address}</p>}
          </div>
          <div>
            <span className="font-semibold text-foreground">פרויקט:</span> {quote.title}
            {quote.notes && <p className="mt-1 text-muted-foreground">הערות: {quote.notes}</p>}
          </div>
        </div>

        {/* מפרט פתחים */}
        <div className="my-6 overflow-hidden rounded-md border">
          <table className="w-full text-right text-sm">
            <thead className="border-b bg-muted/60 text-xs font-semibold text-foreground">
              <tr>
                <th className="p-2.5">מיקום</th>
                <th className="p-2.5">סדרה</th>
                <th className="p-2.5 text-center">מידות (ר×ג מ"מ)</th>
                <th className="p-2.5 text-center">כמות</th>
                <th className="p-2.5">זכוכית</th>
                <th className="p-2.5">גוון</th>
                <th className="p-2.5 text-end">מחיר יח' (לפני מע"מ)</th>
                <th className="p-2.5 text-end">סה"כ שורה</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2.5 font-medium">{item.location || '—'}</td>
                  <td className="p-2.5">{item.series || '—'}</td>
                  <td className="p-2.5 text-center tabular-nums">
                    {item.width} × {item.height}
                  </td>
                  <td className="p-2.5 text-center tabular-nums">{item.quantity}</td>
                  <td className="p-2.5">{item.glassType || '—'}</td>
                  <td className="p-2.5">{item.color || '—'}</td>
                  <td className="p-2.5 text-end tabular-nums">{formatILS(Number(item.unitPrice) || 0)}</td>
                  <td className="p-2.5 text-end font-medium tabular-nums">{formatILS(computeLineTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* סיכום כספי */}
        <div className="flex justify-end">
          <div className="w-72 space-y-1.5 rounded-md border bg-muted/20 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">סה"כ לפני מע"מ:</span>
              <span className="font-medium tabular-nums">{formatILS(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">מע"מ (18%):</span>
              <span className="font-medium tabular-nums">{formatILS(vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-bold text-foreground">
              <span>סה"כ לתשלום (כולל מע"מ):</span>
              <span className="tabular-nums text-base">{formatILS(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* שלבי פריסת תשלומים - כולל מע"מ */}
        {quote.paymentMilestones && quote.paymentMilestones.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold tracking-tight text-foreground">תנאי פריסת תשלומים</h3>
              <span className="text-xs text-muted-foreground font-medium">* הסכומים לתשלום כוללים מע"מ כחוק</span>
            </div>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-right text-sm">
                <thead className="border-b bg-muted/60 text-xs font-semibold text-foreground">
                  <tr>
                    <th className="p-2.5 text-center w-12">#</th>
                    <th className="p-2.5">שלב / אבן דרך</th>
                    <th className="p-2.5 text-center w-28">אחוז מסה"כ</th>
                    <th className="p-2.5 text-end w-40">סכום לתשלום (כולל מע"מ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quote.paymentMilestones.map((milestone, idx) => (
                    <tr key={milestone.id}>
                      <td className="p-2.5 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="p-2.5 font-medium">{milestone.title}</td>
                      <td className="p-2.5 text-center tabular-nums">{milestone.percentage}%</td>
                      <td className="p-2.5 text-end font-semibold tabular-nums">{formatILS(milestone.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* חתימות */}
        <div className="mt-14 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="mx-auto mb-2 h-14 w-48 border-b border-dashed"></div>
            <p className="text-muted-foreground">חתימת הלקוח ואישור ההצעה</p>
          </div>
          <div>
            <div className="mx-auto mb-2 h-14 w-48 border-b border-dashed"></div>
            <p className="text-muted-foreground">חתימת בית העסק</p>
          </div>
        </div>
      </div>
    </div>
  );
}