import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  variant?: 'floating' | 'inline' | 'small';
  className?: string;
}

export default function WhatsAppButton({
  phoneNumber = '254114645757',
  message = 'Hello! I would like to learn more about Kimatu Analytics.',
  variant = 'floating',
  className = '',
}: WhatsAppButtonProps) {
  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={handleClick}
        className={`fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-green-500/30 group ${className}`}
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
        {/* Tooltip */}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[#1A365D] text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          Chat with us
        </span>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />
      </button>
    );
  }

  if (variant === 'small') {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 text-xs font-medium transition-colors ${className}`}
      >
        <MessageCircle className="w-3 h-3" /> WhatsApp
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-green-600/20 hover:shadow-green-600/30 ${className}`}
    >
      <MessageCircle className="w-4 h-4" />
      Chat on WhatsApp
    </button>
  );
}

// Section WhatsApp banner for use on landing page sections
export function WhatsAppBanner({ 
  title = "Need Help Choosing?",
  subtitle = "Our team is ready to assist you on WhatsApp"
}: { 
  title?: string; 
  subtitle?: string;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
      <div className="bg-gradient-to-r from-[#1A365D] to-[#2D4A7C] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative z-10 text-center md:text-left">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <p className="text-gray-300 text-sm">{subtitle}</p>
          <div className="flex items-center gap-2 mt-2 text-[#D4AF37] text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>0114 645 757</span>
          </div>
        </div>
        <WhatsAppButton variant="inline" />
      </div>
    </div>
  );
}
