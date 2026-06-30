import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
        <Construction className="w-10 h-10 text-[#2563EB]" />
      </div>
      <h1 className="text-2xl font-bold text-[#111111] mb-2">{title}</h1>
      <p className="text-sm text-[#666666] max-w-md">
        {description || `The ${title} page is coming soon. This feature will be available in the next update.`}
      </p>
    </div>
  );
}
