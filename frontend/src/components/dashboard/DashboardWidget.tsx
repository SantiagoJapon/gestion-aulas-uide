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
    const hasHeader = !!(title || icon || action);

    return (
        <div className={`mac-card ${hover ? 'mac-card-hover' : ''} ${className} overflow-hidden flex flex-col`}>
            {hasHeader && (
                <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {icon && (
                            <div className={`p-1.5 sm:p-2 rounded-xl bg-muted shrink-0 ${iconColor}`}>
                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{icon}</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            {title && (
                                <h3 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-tight truncate">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 truncate hidden sm:block">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    {action && <div className="flex-shrink-0">{action}</div>}
                </div>
            )}
            {hasHeader && !noPadding && (
                <div className="h-px bg-border/40 mx-4 sm:mx-5 lg:mx-6" />
            )}
            <div className={`${noPadding ? 'p-0' : 'p-4 sm:p-5 lg:p-6'} flex-1`}>
                {children}
            </div>
        </div>
    );
};

export default DashboardWidget;
