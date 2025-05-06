
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={toggleTheme}
      className="rounded-full w-9 h-9 relative"
      aria-label="Toggle theme"
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] absolute transition-all ${
        theme === 'dark' 
          ? 'rotate-0 scale-100 opacity-100' 
          : 'rotate-90 scale-0 opacity-0'
      }`} />
      <Moon className={`h-[1.2rem] w-[1.2rem] absolute transition-all ${
        theme === 'light' 
          ? 'rotate-0 scale-100 opacity-100' 
          : '-rotate-90 scale-0 opacity-0'
      }`} />
    </Button>
  );
};

export default ThemeToggle;
