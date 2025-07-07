import React, { useEffect, ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
          onClick={onClose}
          aria-label="Fechar modal"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal; 