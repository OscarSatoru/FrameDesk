import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applyTheme, getActiveTheme, toggleTheme, type ThemeMode } from '@/lib/theme';

/** Sun/moon button that switches between light and dark color modes. */
export default function ThemeToggle() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getActiveTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggle = () => {
    setThemeState(toggleTheme());
  };

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      title={isDark ? 'מצב בהיר' : 'מצב כהה'}
      aria-label={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}