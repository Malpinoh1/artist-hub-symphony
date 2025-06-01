
import React from 'react';
import { Sun } from 'lucide-react';
import { Button } from "@/components/ui/button";

const ThemeToggle: React.FC = () => {
  return (
    <Button 
      variant="ghost" 
      size="icon"
      className="rounded-full w-9 h-9 relative opacity-50 cursor-not-allowed"
      aria-label="Light mode only"
      disabled
    >
      <Sun className="h-[1.2rem] w-[1.2rem]" />
    </Button>
  );
};

export default ThemeToggle;
