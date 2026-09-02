import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Printer, 
  Upload, 
  Image as ImageIcon, 
  FileCheck, 
  Clock, 
  Calendar,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, getQuotes, getCustomer } from '@/lib/storage';
import { 
  formatILS, 
  computeSubtotal, 
  STATUS_BADGE_CLASSES, 
  type Quote, 
  type Customer 
} from '@/lib/types';

export default function ClientPortal() {
  const user = getCurrentUser();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; date: string }>>([]);

  useEffect(() => {
    const allQuotes = getQuotes();
    // סינון: הלקוח רואה אך ורק את הפרויקטים שלו
    const myQuotes = allQuotes.filter(
      (q) => q.customerId === user?.customerId || q.customerId === user?.id
    );
    setQuotes(myQuotes);

    if (user?.customerId) {
      const c = getCustomer(user.customerId);
      if (c) setCustomer(c);
    }
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fakeUrl = URL.createObjectURL(file);
    setAttachments((prev) => [
      ...prev,
      { name: file.name, url: fakeUrl, date: new Date().toLocaleDateString('he-IL') },
    ]);
  };

  if (quotes.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 text-center">
        <div className="rounded-xl border border-dashed p-12 bg-card">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">הפרויקט שלך בהכנה</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
            הצעת המחיר והמפרט הטכני נערכים כעת על ידי מנהל הפרויקט. ברגע שההצעה תהיה מוכנה, תוכל לצפות בכל הפרטים, התוכניות ופריסת התשלומים כאן.
          </p>
        </div>
      </div>
    );
  }

  const activeQuote = quotes[0];
  const subtotal = computeSubtotal(activeQuote.items);
  const grandTotal = Math.round(subtotal * 1.18);

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-8">
      {/* כותרת הפורטל */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">פורטל לקוח</span>
          <h1 className="text-3xl font-bold tracking-tight mt-1">{activeQuote.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            שלום {user?.fullName || customer?.name || 'לקוח יקר'}, כאן מרוכזים כל פרטי הפרויקט, המפרט הטכני והמסמכים שלך.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`text-sm px-3 py-1 border ${STATUS_BADGE_CLASSES[activeQuote.status]}`}>
            סטטוס: {activeQuote.status}
          </Badge>
          <Button asChild variant="outline" className="gap-2">
            <Link to={`/quotes/${activeQuote.id}/print`}>
              <Printer className="h-4 w-4" />
              צפייה / הורדת הצעה רשמית
            </Link>
          </Button>
        </div>
      </div>

      {/* כרטיסי מידע מרכזיים */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>סה"כ פרויקט (כולל מע"מ)</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary tabular-nums">
              {formatILS(grandTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            לפני מע"מ: {formatILS(subtotal)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>פתחים ומפרטים</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {activeQuote.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} יחידות
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            מתוכם {activeQuote.items.length} מפרטים שונים
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>תאריך עדכון הצעה</CardDescription>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {activeQuote.date.split('-').reverse().join('/')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            מספר הצעה: #{activeQuote.id.slice(0, 8)}
          </CardContent>
        </Card>
      </div>

      {/* מפרט הפתחים - לקריאה בלבד */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">מפרט פתחים ודגמים</CardTitle>
          <CardDescription>פרטי המידות, הסדרות וסוגי הזכוכית שנבחרו לפרויקט שלך</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-right text-sm">
              <thead className="border-b bg-muted/50 text-xs font-semibold">
                <tr>
                  <th className="p-3">מיקום</th>
                  <th className="p-3">דגם / סדרה</th>
                  <th className="p-3 text-center">מידות (מ"מ)</th>
                  <th className="p-3 text-center">כמות</th>
                  <th className="p-3">סוג זכוכית</th>
                  <th className="p-3">גוון</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeQuote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-medium">{item.location || 'פתח כללי'}</td>
                    <td className="p-3">{item.series}</td>
                    <td className="p-3 text-center tabular-nums">{item.width} × {item.height}</td>
                    <td className="p-3 text-center tabular-nums font-semibold">{item.quantity}</td>
                    <td className="p-3">{item.glassType}</td>
                    <td className="p-3">{item.color}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* שלבי תשלום (אם הוגדרו) */}
      {activeQuote.paymentMilestones && activeQuote.paymentMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">פריסת תשלומים ואבני דרך</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeQuote.paymentMilestones.map((m, idx) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-sm">{m.title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{m.percentage}%</span>
                    <span className="font-bold tabular-nums text-sm">{formatILS(m.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* אזור הדמיות, תוכניות ומסמכים */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">הדמיות, תוכניות ומסמכים</CardTitle>
            <CardDescription>תמונות מהשטח, הדמיות אלומיניום וקבצים סרוקים</CardDescription>
          </div>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf"
            />
            <Button asChild size="sm" variant="outline" className="cursor-pointer gap-2">
              <label htmlFor="file-upload">
                <Upload className="h-4 w-4" />
                העלאת קובץ / תמונה
              </label>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
              <ImageIcon className="mx-auto h-8 w-8 opacity-40 mb-2" />
              <p className="text-sm">אין עדיין קבצים או הדמיות שהועלו לפרויקט זה.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {attachments.map((att, index) => (
                <div key={index} className="group relative rounded-lg border overflow-hidden bg-card p-2">
                  <div className="aspect-video bg-muted flex items-center justify-center rounded overflow-hidden">
                    <img src={att.url} alt={att.name} className="object-cover h-full w-full" />
                  </div>
                  <p className="text-xs font-medium truncate mt-2">{att.name}</p>
                  <p className="text-[10px] text-muted-foreground">{att.date}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}