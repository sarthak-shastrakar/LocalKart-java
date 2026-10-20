import { useState, useEffect } from 'react';

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];

const parseTime = (timeStr, defaultHour = '09', defaultPeriod = 'AM') => {
  if (!timeStr) return { hour: defaultHour, minute: '00', period: defaultPeriod };
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] ? parts[1].slice(0, 2) : '00';
  if (isNaN(h)) return { hour: defaultHour, minute: '00', period: defaultPeriod };

  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return {
    hour: String(h).padStart(2, '0'),
    minute: m,
    period,
  };
};

const formatTo24 = (hour, minute, period) => {
  let h = parseInt(hour, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
};

export default function TimePicker({
  id,
  label,
  value,
  onChange,
  error,
  presets = [],
  defaultHour = '09',
  defaultPeriod = 'AM',
}) {
  const [timeState, setTimeState] = useState(() => parseTime(value, defaultHour, defaultPeriod));

  useEffect(() => {
    if (value) {
      setTimeState(parseTime(value, defaultHour, defaultPeriod));
    }
  }, [value, defaultHour, defaultPeriod]);

  const update = (newHour, newMinute, newPeriod) => {
    const updated = { hour: newHour, minute: newMinute, period: newPeriod };
    setTimeState(updated);
    const time24 = formatTo24(newHour, newMinute, newPeriod);
    onChange(time24);
  };

  const handleHourChange = (e) => update(e.target.value, timeState.minute, timeState.period);
  const handleMinuteChange = (e) => update(timeState.hour, e.target.value, timeState.period);
  const handlePeriodToggle = (period) => update(timeState.hour, timeState.minute, period);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Main Container - Matches input styling */}
      <div
        className={`w-full rounded-xl border p-2.5 bg-white transition-colors ${
          error ? 'border-red-400 bg-red-50/40' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Controls row */}
        <div className="flex items-center justify-between gap-2">
          {/* Hour & Minute selects */}
          <div className="flex items-center gap-1.5 flex-1">
            <select
              id={`${id}-hour`}
              aria-label="Hour"
              value={timeState.hour}
              onChange={handleHourChange}
              className="w-full text-center py-2 px-1 rounded-lg border border-gray-200 bg-gray-50/70 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white cursor-pointer"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <span className="font-bold text-gray-400 text-base select-none px-0.5">:</span>

            <select
              id={`${id}-minute`}
              aria-label="Minute"
              value={timeState.minute}
              onChange={handleMinuteChange}
              className="w-full text-center py-2 px-1 rounded-lg border border-gray-200 bg-gray-50/70 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white cursor-pointer"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* AM / PM Segmented Control */}
          <div className="flex items-center rounded-lg bg-gray-100 p-0.5 border border-gray-200 shrink-0">
            <button
              type="button"
              onClick={() => handlePeriodToggle('AM')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                timeState.period === 'AM'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handlePeriodToggle('PM')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                timeState.period === 'PM'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* 4-column quick presets grid (fits in 1 clean line) */}
        {presets.length > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <div className="grid grid-cols-4 gap-1.5">
              {presets.map((preset) => {
                const parsed = parseTime(preset);
                const isSelected =
                  timeState.hour === parsed.hour &&
                  timeState.minute === parsed.minute &&
                  timeState.period === parsed.period;

                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => update(parsed.hour, parsed.minute, parsed.period)}
                    className={`w-full py-1 text-[11px] font-semibold rounded-md transition text-center ${
                      isSelected
                        ? 'bg-green-100 text-green-700 font-bold border border-green-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                    }`}
                  >
                    {parseInt(parsed.hour, 10)}:{parsed.minute} {parsed.period}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
