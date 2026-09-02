import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Copy, 
  Trash2, 
  Plus, 
  Clock, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Layers,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  createInviteCode,
  deleteInviteCode,
  fetchInviteCodes,
  fetchCatalog,
  saveCatalog,
  fetchCustomers,
} from '@/lib/storage';
import type { Catalog, InviteCode, Customer } from '@/lib/types';

export default function Admin() {
  const [catalog, setCatalog] = useState<Catalog>({
    series: [],
    glassTypes: [],
    colors: [],
    hardware: [],
  });
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedRole, setSelectedRole] = useState<'sub_admin' | 'viewer'>('sub_admin');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [hoursValid, setHoursValid] = useState<number>(48);
  const [loadingInvite, setLoadingInvite] = useState(false);

  // ערכים להוספה מהירה לקטלוג
  const [newSeries, setNewSeries] = useState('');
  const [newGlass, setNewGlass] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newHardware, setNewHardware] = useState('');

  useEffect(() => {
    fetchCatalog().then((cat) => {
      if (cat) setCatalog(cat);
    });
    fetchInviteCodes().then(setInvites);
    fetchCustomers().then(setCustomers);
  }, []);

  // יצירת קוד הזמנה עם שיוך לקוח במידת הצורך
  const handleCreateInvite = async () => {
    if (selectedRole === 'viewer' && !selectedCustomerId) {
      toast.error('נא לבחור לקוח לשיוך הפרויקט');
      return;
    }

    setLoadingInvite(true);
    try {
      const newCode = await createInviteCode(
        selectedRole, 
        hoursValid, 
        selectedRole === 'viewer' ? selectedCustomerId : undefined
      );
      setInvites((prev) => [newCode, ...prev]);
      toast.success(`קוד ${newCode.code} נוצר בהצלחה לתוקף של ${hoursValid} שעות!`);
      setSelectedCustomerId('');
    } catch (err) {
      toast.error('שגיאה ביצירת קוד הזמנה');
      console.error(err);
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    await deleteInviteCode(id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
    toast.info('הקוד נמחק');
  };

  const handleCopy = async (code: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      toast.success(`קוד ${code} הועתק ללוח!`);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('שגיאה בהעתקת הקוד, ניתן להעתיק ידנית');
    }
  };

  // פעולות ניהול קטלוג
  const addItemToCatalog = async (
    key: keyof Catalog, 
    value: string, 
    resetInput: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (catalog[key].includes(trimmed)) {
      toast.error('פריט זה כבר קיים ברשימה');
      return;
    }

    const updatedCatalog: Catalog = {
      ...catalog,
      [key]: [...catalog[key], trimmed],
    };

    setCatalog(updatedCatalog);
    resetInput();
    try {
      await saveCatalog(updatedCatalog);
      toast.success('נוסף בהצלחה לקטלוג!');
    } catch (e) {
      toast.error('שגיאה בשמירת הקטלוג');
    }
  };

  const removeItemFromCatalog = async (key: keyof Catalog, itemToRemove: string) => {
    const updatedCatalog: Catalog = {
      ...catalog,
      [key]: catalog[key].filter((item) => item !== itemToRemove),
    };

    setCatalog(updatedCatalog);
    try {
      await saveCatalog(updatedCatalog);
      toast.info('הפריט הוסר');
    } catch (e) {
      toast.error('שגיאה בעדכון הקטלוג');
    }
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return null;
    const found = customers.find((c) => c.id === customerId);
    return found ? found.name : 'לקוח משויך';
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ניהול מערכת וצוות</h1>
        <p className="text-muted-foreground mt-1">
          ניהול הגדרות קטלוג (דגמים, זכוכיות, גוונים), והנפקת קודי הרשמה לצוות וללקוחות
        </p>
      </div>

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            קטלוג ומפרטי ייצור
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            קודי הזמנה וצוות
          </TabsTrigger>
        </TabsList>

        {/* טאב ניהול קטלוג */}
        <TabsContent value="catalog" className="space-y-6">
          {/* סדרות ודגמים */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>דגמים וסדרות אלומיניום</span>
                <Badge variant="secondary">{catalog.series.length} דגמים</Badge>
              </CardTitle>
              <CardDescription>
                הסדרות שיופיעו לבחירה בעת הוספת פתחים בהצעת המחיר (למשל: קליל 7000, 9000 וכו')
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="שם דגם/סדרה חדשה (לדוגמה: קליל 7300)..."
                  value={newSeries}
                  onChange={(e) => setNewSeries(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItemToCatalog('series', newSeries, () => setNewSeries(''))}
                />
                <Button onClick={() => addItemToCatalog('series', newSeries, () => setNewSeries(''))}>
                  <Plus className="h-4 w-4 ml-1" />
                  הוסף
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {catalog.series.map((item) => (
                  <Badge key={item} variant="outline" className="text-sm py-1.5 px-3 flex items-center gap-2 bg-background">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItemFromCatalog('series', item)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* סוגי זכוכית */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>סוגי זכוכית</span>
                <Badge variant="secondary">{catalog.glassTypes.length} סוגים</Badge>
              </CardTitle>
              <CardDescription>
                סוגי והרכבי הזכוכית שיופיעו בהצעות המחיר (טריפלקס, בידודית, מחוסמת)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="סוג זכוכית חדש (לדוגמה: בידודית 4-16-4)..."
                  value={newGlass}
                  onChange={(e) => setNewGlass(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItemToCatalog('glassTypes', newGlass, () => setNewGlass(''))}
                />
                <Button onClick={() => addItemToCatalog('glassTypes', newGlass, () => setNewGlass(''))}>
                  <Plus className="h-4 w-4 ml-1" />
                  הוסף
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {catalog.glassTypes.map((item) => (
                  <Badge key={item} variant="outline" className="text-sm py-1.5 px-3 flex items-center gap-2 bg-background">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItemFromCatalog('glassTypes', item)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* גוונים וצבעים */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>גוונים וצבעי פרופילים</span>
                <Badge variant="secondary">{catalog.colors.length} גוונים</Badge>
              </CardTitle>
              <CardDescription>גווני צבע ואילגון (RAL / אנודייז)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="גוון חדש (לדוגמה: RAL 9005 שחור מט)..."
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItemToCatalog('colors', newColor, () => setNewColor(''))}
                />
                <Button onClick={() => addItemToCatalog('colors', newColor, () => setNewColor(''))}>
                  <Plus className="h-4 w-4 ml-1" />
                  הוסף
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {catalog.colors.map((item) => (
                  <Badge key={item} variant="outline" className="text-sm py-1.5 px-3 flex items-center gap-2 bg-background">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItemFromCatalog('colors', item)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* פרזול וידיות */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>ידיות, פרזול ואביזרים</span>
                <Badge variant="secondary">{catalog.hardware.length} פריטים</Badge>
              </CardTitle>
              <CardDescription>מנגנוני נעילה, רשתות וידיות</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="פריט חדש (לדוגמה: מנעול רב בריחי / ידית מודרנית)..."
                  value={newHardware}
                  onChange={(e) => setNewHardware(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItemToCatalog('hardware', newHardware, () => setNewHardware(''))}
                />
                <Button onClick={() => addItemToCatalog('hardware', newHardware, () => setNewHardware(''))}>
                  <Plus className="h-4 w-4 ml-1" />
                  הוסף
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {catalog.hardware.map((item) => (
                  <Badge key={item} variant="outline" className="text-sm py-1.5 px-3 flex items-center gap-2 bg-background">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItemFromCatalog('hardware', item)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* טאב קודי הזמנה */}
        <TabsContent value="invites" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                יצירת קוד הזמנה חד-פעמי
              </CardTitle>
              <CardDescription>
                הקוד יאפשר למשתמש חדש להירשם למערכת. עבור לקוחות (צופים), הקוד יקשר אותם ישירות לפרויקט שלהם.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>תפקיד במערכת</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(val) => {
                      setSelectedRole(val as 'sub_admin' | 'viewer');
                      if (val !== 'viewer') setSelectedCustomerId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sub_admin">אדמין משנה (עריכת הצעות, לקוחות וקטלוג)</SelectItem>
                      <SelectItem value="viewer">צופה / לקוח (צפייה בפרויקט בלבד)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedRole === 'viewer' && (
                  <div className="space-y-2">
                    <Label>שיוך ללקוח / פרויקט *</Label>
                    <Select
                      value={selectedCustomerId}
                      onValueChange={setSelectedCustomerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחרו לקוח מהרשימה..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">אין לקוחות במערכת</div>
                        ) : (
                          customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>תוקף הקוד</Label>
                  <Select
                    value={String(hoursValid)}
                    onValueChange={(val) => setHoursValid(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 שעות</SelectItem>
                      <SelectItem value="48">48 שעות (יומיים)</SelectItem>
                      <SelectItem value="168">שבוע (7 ימים)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCreateInvite} 
                  disabled={loadingInvite} 
                  className={selectedRole === 'viewer' ? 'w-full md:col-span-3' : 'w-full'}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  {loadingInvite ? 'מנפיק...' : 'הנפק קוד הזמנה'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>קודי הזמנה פעילים והיסטוריה</CardTitle>
              <CardDescription>רשימת כל הקודים שהונפקו עם סטטוס ניצול, שיוך לקוח ותוקף</CardDescription>
            </CardHeader>
            <CardContent>
              {invites.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  לא נוצרו עדיין קודי הזמנה.
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {invites.map((item) => {
                    const isExpired = new Date(item.expiresAt) < new Date();
                    const isValid = !item.used && !isExpired;
                    const assignedName = getCustomerName(item.assignedCustomerId);

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="font-mono text-lg font-bold tracking-wider text-primary">
                              {item.code}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full border bg-muted">
                              {item.role === 'sub_admin' ? 'אדמין משנה' : 'צופה / לקוח'}
                            </span>
                            {assignedName && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                <UserCheck className="h-3 w-3" /> משויך ל: {assignedName}
                              </span>
                            )}
                            {item.used ? (
                              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" /> נוצל על ידי {item.usedBy || 'משתמש'}
                              </span>
                            ) : isExpired ? (
                              <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                                <XCircle className="h-3 w-3" /> פג תוקף
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <Clock className="h-3 w-3" /> פעיל
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            תוקף עד: {new Date(item.expiresAt).toLocaleString('he-IL')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isValid && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(item.code)}
                            >
                              <Copy className="h-4 w-4 ml-1" />
                              העתק קוד
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteInvite(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}