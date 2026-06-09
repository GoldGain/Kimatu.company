import { useState } from 'react';
import { MessageSquare, Calendar, Clock, CheckCircle, Users } from 'lucide-react';

interface TimeSlot {
  id: string;
  teacher: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  available: boolean;
}

const mockSlots: TimeSlot[] = [
  { id: '1', teacher: 'Mr. John Kamau', subject: 'Mathematics', date: '2025-05-28', time: '09:00 AM', duration: '10 min', available: true },
  { id: '2', teacher: 'Mrs. Grace Wanjiku', subject: 'English', date: '2025-05-28', time: '09:30 AM', duration: '10 min', available: true },
  { id: '3', teacher: 'Mr. Peter Ochieng', subject: 'Science', date: '2025-05-28', time: '10:00 AM', duration: '10 min', available: false },
  { id: '4', teacher: 'Ms. Jane Muthoni', subject: 'Kiswahili', date: '2025-05-29', time: '11:00 AM', duration: '10 min', available: true },
  { id: '5', teacher: 'Mr. David Kimani', subject: 'Social Studies', date: '2025-05-29', time: '02:00 PM', duration: '10 min', available: true },
  { id: '6', teacher: 'Mrs. Mary Njeri', subject: 'CRE', date: '2025-05-30', time: '10:30 AM', duration: '10 min', available: true },
];

export default function ParentConferences() {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const handleBook = (slotId: string) => {
    setBookedSlots(prev => [...prev, slotId]);
    setConfirmed(slotId);
    setTimeout(() => setConfirmed(null), 3000);
  };

  const isBooked = (slotId: string) => bookedSlots.includes(slotId);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#111111]">Parent-Teacher Conferences</h1><p className="text-sm text-[#666666]">Book a meeting with your child&apos;s teachers</p></div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">Conference Information</p>
          <p className="text-xs text-blue-600 mt-1">Each conference slot is 10 minutes. Please arrive 5 minutes early. You can book multiple slots with different teachers.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-[#111111] mb-4">Available Slots</h3>
        <div className="space-y-3">
          {mockSlots.map(slot => (
            <div key={slot.id} className={`flex items-center justify-between p-4 rounded-xl ${isBooked(slot.id) ? 'bg-green-50 border border-green-200' : slot.available ? 'bg-gray-50' : 'bg-gray-100 opacity-50'}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm font-medium text-[#111111]">{slot.teacher}</p>
                  <p className="text-xs text-[#666666]">{slot.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#666666]">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {slot.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {slot.time}</span>
                    <span>{slot.duration}</span>
                  </div>
                </div>
              </div>
              {isBooked(slot.id) ? (
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Booked
                </div>
              ) : slot.available ? (
                <button onClick={() => handleBook(slot.id)} className="bg-[#2563EB] text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-[#1d4ed8]">Book Slot</button>
              ) : (
                <span className="text-xs text-gray-400 font-medium">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {confirmed && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Conference booked successfully!</span>
        </div>
      )}
    </div>
  );
}
