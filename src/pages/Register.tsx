import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, Lock, Shield, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register, getCurrentUser } from '@/lib/storage';
import type { AppUser } from '@/lib/types';

export default function Register({
  onRegister,
  onBack,
}: {
  onRegister: (user: AppUser) => void;
  onBack: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim() || !inviteCode.trim()) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    setLoading(true);
    try {
      const result = await register(email, fullName, password, inviteCode);
      if (result.success) {
        toast.success('ההרשמה הושלמה בהצלחה!');
        const loggedUser = getCurrentUser();
        if (loggedUser) {
          onRegister(loggedUser as unknown as AppUser);
        }
      } else {
        toast.error(result.error || 'שגיאה בהרשמה');
      }
    } catch (err) {
      toast.error('שגיאה בתהליך ההרשמה');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold">הרשמה לצוות FrameDesk</CardTitle>
          <CardDescription>
            הזינו את פרטיכם יחד עם קוד ההזמנה החד-פעמי שהונפק עבורכם
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">שם מלא</Label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="ps-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">כתובת אימייל</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  dir="ltr"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="ps-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">קביעת סיסמה</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="לפחות 4 תווים"
                  className="ps-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">קוד הזמנה חד-פעמי</Label>
              <div className="relative">
                <Shield className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  dir="ltr"
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="FD-XXXXXX"
                  className="ps-9 font-mono uppercase tracking-wider"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'מאמת ונרשם...' : 'השלם הרשמה וכניסה למערכת'}
            </Button>

            <div className="text-center pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={onBack} className="text-muted-foreground">
                <ArrowRight className="me-1 h-4 w-4" />
                חזרה למסך התחברות
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}