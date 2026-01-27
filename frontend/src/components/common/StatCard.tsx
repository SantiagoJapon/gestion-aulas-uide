import React from 'react';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: IconType;
  iconColor?: string;
  iconBgColor?: string;
  bgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  bgColor = 'bg-card',
  trend,
}) => {
  return (
    <div className={`${bgColor} rounded-xl shadow-card transition-all duration-300 p-6 border border-border`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={`text-xs font-semibold ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">vs mes anterior</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${iconBgColor} ${iconColor} p-3 rounded-lg`}>
            <Icon className="text-2xl" />
          </div>
        )}
      </div>
    </div>
  );
};
