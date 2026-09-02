import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, LogIn, LogOut, Settings2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser, login, logout } from '@/lib/storage';
import type { AppUser } from '@/lib/types';
import ThemeToggle from '@/components/ThemeToggle';
import Register from '@/pages/Register';

function LoginScreen({
  onLogin,
  onGoRegister,
}: {
  onLogin: (user: AppUser) => void;
  onGoRegister: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await login(email, password);
      if (res.success) {
        const loggedUser = getCurrentUser();
        if (loggedUser) {
          onLogin(loggedUser as unknown as AppUser);
        }
      } else {
        setError(res.error || 'אימייל או סיסמה שגויים. נסו שוב.');
      }
    } catch (err) {
      setError('אירעה שגיאה בהתחברות. נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="fixed left-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FrameDesk</h1>
          <p className="mt-1 text-muted-foreground">ניהול הצעות מחיר לאלומיניום</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">אימייל או שם משתמש</Label>
            <Input
              id="email"
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com (או admin)"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            <LogIn className="me-2 h-4 w-4" />
            {submitting ? 'מתחבר...' : 'התחברות'}
          </Button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onGoRegister}>
            <UserPlus className="me-1.5 h-4 w-4" />
            רישום משתמש חדש (נדרש קוד הזמנה)
          </Button>
          <p className="text-xs text-muted-foreground" dir="ltr">
            מנהל ברירת מחדל: admin / admin
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const location = useLocation();

  useEffect(() => {
    try {
      // אם אין משתמש שמור ב-localStorage, נגדיר כ-null כדי שיציג את מסך ההתחברות
      const raw = localStorage.getItem('framedesk_current_user');
      if (raw) {
        setUser(JSON.parse(raw));
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Error loading user:', e);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        טוען מערכת...
      </div>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return (
        <Register
          onRegister={(newUser) => setUser(newUser as unknown as AppUser)}
          onBack={() => setAuthView('login')}
        />
      );
    }
    return <LoginScreen onLogin={setUser} onGoRegister={() => setAuthView('register')} />;
  }

  const handleLogout = () => {
    logout();
    setUser(null);
    setAuthView('login');
  };

  const userRole = (user?.role as string) || '';
  const canAccessAdmin =
    userRole === 'admin' ||
    userRole === 'sub_admin' ||
    userRole === 'מנהל';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="no-print sticky top-0 z-40 border-b bg-card/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">FrameDesk</span>
            <span className="hidden text-sm text-muted-foreground md:inline">
              ניהול הצעות מחיר לאלומיניום
            </span>
          </Link>

          <div className="ms-auto flex items-center gap-3">
            <ThemeToggle />
            {canAccessAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <Settings2 className="me-1.5 h-4 w-4" />
                  ניהול מערכת
                </Link>
              </Button>
            )}
            <div className="hidden text-end sm:block">
              <p className="text-sm font-medium leading-tight">{user.fullName || (user as any).name || user.username}</p>
              <p className="text-xs text-muted-foreground leading-tight">
                {userRole === 'admin' || userRole === 'מנהל'
                  ? 'מנהל ראשי'
                  : userRole === 'sub_admin'
                  ? 'אדמין משנה'
                  : userRole === 'viewer'
                  ? 'צופה / לקוח'
                  : userRole}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} title="התנתקות">
              <LogOut className="me-1.5 h-4 w-4" />
              התנתקות
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="no-print border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          FrameDesk · ניהול הצעות מחיר לאלומיניום · הנתונים נשמרים בדפדפן שלכם
        </div>
      </footer>
    </div>
  );
}