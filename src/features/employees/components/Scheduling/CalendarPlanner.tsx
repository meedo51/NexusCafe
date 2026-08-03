import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { Plus } from 'lucide-react';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

export default function CalendarPlanner() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/scheduling/shifts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setShifts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const events = shifts.map(s => ({
    id: s.id,
    title: `${s.employee?.name} - ${s.role}`,
    start: new Date(s.startTime),
    end: new Date(s.endTime),
    resource: s
  }));

  const handleSelectSlot = async ({ start, end }: any) => {
    // In a real app we'd open a modal to select the user and role.
    const role = prompt("Enter Role (e.g. Barista):", "Barista");
    if (!role) return;
    
    // Fallback user id if no employees in Redux - typically we'd have a dropdown
    const userId = 1; // Defaulting for demo purposes
    
    try {
      const res = await fetch('/api/scheduling/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          date: start,
          startTime: start,
          endTime: end,
          role
        })
      });
      
      if (res.ok) {
        fetchData();
      }
    } catch(e) {}
  };

  const handleSelectEvent = (event: any) => {
    alert(`Shift details: ${event.title}\nID: ${event.id}`);
  };

  const onEventDrop = async ({ event, start, end }: any) => {
    // We would need a PUT endpoint to update shift time.
    // For now we will just optimistically update the local state.
    const updatedShifts = shifts.map(s => {
      if (s.id === event.id) {
        return { ...s, startTime: start, endTime: end, date: start };
      }
      return s;
    });
    setShifts(updatedShifts);
  };

  const onEventResize = async ({ event, start, end }: any) => {
    const updatedShifts = shifts.map(s => {
      if (s.id === event.id) {
        return { ...s, startTime: start, endTime: end };
      }
      return s;
    });
    setShifts(updatedShifts);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading schedule...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xl p-4">
      <style>{`
        .rbc-calendar { font-family: inherit; color: white; min-height: 500px; }
        .rbc-header { padding: 10px; border-bottom: 1px solid var(--color-border); }
        .rbc-today { background-color: rgba(201,168,76, 0.05); }
        .rbc-event { background-color: var(--color-accent); color: black; font-weight: bold; font-size: 11px; padding: 2px 4px; border: none; border-radius: 4px; }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: var(--color-border); }
        .rbc-day-bg + .rbc-day-bg { border-left-color: var(--color-border); }
        .rbc-month-row + .rbc-month-row { border-top-color: var(--color-border); }
        .rbc-time-header.rbc-overflowing { border-right-color: var(--color-border); }
        .rbc-time-content { border-top-color: var(--color-border); }
        .rbc-timeslot-group { border-bottom-color: var(--color-border); }
        .rbc-day-slot .rbc-time-slot { border-top-color: rgba(255,255,255,0.05); }
        .rbc-time-view-border { border-color: var(--color-border); }
        .rbc-btn-group button { color: white; border-color: var(--color-border); }
        .rbc-btn-group button.rbc-active { background-color: var(--color-accent); color: black; }
        .rbc-btn-group button:hover:not(.rbc-active) { background-color: var(--color-surface); }
        .rbc-toolbar button { padding: 4px 12px; }
        .rbc-addons-dnd .rbc-addons-dnd-resizable-month-event { position: relative; }
        .rbc-addons-dnd .rbc-addons-dnd-resizable-month-event .rbc-addons-dnd-resize-month-event-anchor { position: absolute; width: 10px; height: 100%; top: 0; cursor: ew-resize; }
      `}</style>
      
      <div className="flex justify-between items-center mb-4">
         <h3 className="font-bold">Shift Calendar (Drag & Drop)</h3>
         <button className="px-3 py-1.5 text-xs font-bold bg-[var(--color-accent)] text-black rounded hover:bg-[var(--color-accent-hover)] transition-colors shadow-[0_4px_14px_rgba(201,168,76,0.2)]">Publish Schedule</button>
      </div>

      <div className="flex-1 min-h-[500px]">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor={(event: any) => event.start}
          endAccessor={(event: any) => event.end}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={onEventDrop}
          onEventResize={onEventResize}
          resizable
          style={{ height: '100%' }}
          views={['month', 'week', 'day']}
          defaultView="week"
        />
      </div>
    </div>
  );
}
