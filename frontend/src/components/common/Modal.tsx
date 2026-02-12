import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IoClose } from 'react-icons/io5';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    '2xl': 'sm:max-w-6xl',
    'full': 'sm:max-w-[95vw]',
  };

  return createPortal(
    <div
      className="relative z-[9999]"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 bg-opacity-75 transition-opacity backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4 text-center">
          {/* Modal Panel */}
          <div
            className={`
                    relative transform overflow-hidden rounded-t-2xl sm:rounded-3xl bg-card text-left shadow-2xl transition-all 
                    w-full ${maxWidthClasses[size] || 'sm:max-w-lg'}
                    border border-border flex flex-col
                    sm:my-8 animate-fade-in-up sm:animate-fade-in
                `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30 shrink-0">
                {title && (
                  <h3 className="text-xl font-black text-foreground leading-6 tracking-tight" id="modal-title">{title}</h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <IoClose className="text-xl" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-6 overflow-y-auto max-h-[85vh] sm:max-h-[calc(100vh-200px)] custom-scrollbar">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
