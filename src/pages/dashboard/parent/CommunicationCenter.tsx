import { Bell, MessageSquare, Megaphone } from 'lucide-react';

const items = [
  { title: 'Mid-term parent meeting', from: 'Class Teacher', type: 'Message', icon: MessageSquare },
  { title: 'School sports day next Friday', from: 'School Admin', type: 'Announcement', icon: Megaphone },
  { title: 'Fee reminder for Term 2', from: 'Accounts', type: 'Notification', icon: Bell },
];

export default function CommunicationCenter() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communication Center</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Messages, announcements and notifications</p>
      </div>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.title} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
              <it.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{it.title}</h3>
              <p className="text-sm text-gray-500">{it.type} · {it.from}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
