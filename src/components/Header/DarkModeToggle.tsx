import { Moon, Sun } from 'lucide-react';

import { useTheme } from '../../lib/theme-context';
import { Button } from '../ui/Button';

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();

  const icon =
    theme === 'light' ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Sun className="h-5 w-5" />
    );

  return (
    <Button
      variant="secondary"
      size="md"
      icon={icon}
      iconOnly
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    />
  );
}
