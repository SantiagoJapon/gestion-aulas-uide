import React from 'react';

interface DashboardWidgetProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    icon?: string;
    iconColor?: string;
    action?: React.ReactNode;
    className?: string;
    hover?: boolean;
    noPadding?: boolean;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
    children,
    title,
    subtitle,
    icon,
    iconColor = 'text-primary',
    action,
    className = '',
    hover = true,
    noPadding = false
}) => {
    return (
        <div className={`mac-card ${hover ? 'mac-card-hover' : ''} ${className} overflow-hidden flex flex-col`}>
            {(title || icon || action) && (
                <div className="p-6 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className={`p-2 rounded-xl bg-muted ${iconColor}`}>
                                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                            </div>
                        )}
                        <div>
                            {title && <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{title}</h3>}
                            {subtitle && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
                        </div>
                    </div>
                    {action && <div className="flex-shrink-0">{action}</div>}
                </div>
            )}
            <div className={`${noPadding ? 'p-0' : 'p-6'} flex-1`}>
                {children}
            </div>
        </div>
    );
};

export default DashboardWidget;
