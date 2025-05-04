
import React from 'react';
import AnimatedCard from '../AnimatedCard';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  iconBgColor: string;
  iconTextColor: string;
  delay?: number;
  currencySymbol?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  title, 
  value, 
  description, 
  iconBgColor, 
  iconTextColor,
  delay = 0,
  currencySymbol = '₦'
}) => {
  return (
    <AnimatedCard delay={delay}>
      <div className="glass-card p-6">
        <div className="flex items-center mb-4">
          <div className={`w-10 h-10 rounded-full ${iconBgColor} flex items-center justify-center mr-3`}>
            <div className={`h-5 w-5 ${iconTextColor}`}>{icon}</div>
          </div>
          <div>
            <h2 className="text-sm font-medium text-slate-500">{title}</h2>
            <p className="text-2xl font-semibold">
              {typeof value === 'number' ? `${currencySymbol}${value.toLocaleString()}` : value}
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </AnimatedCard>
  );
};

export default StatCard;
