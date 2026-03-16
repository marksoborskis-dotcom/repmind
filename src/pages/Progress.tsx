import { useState, useMemo } from 'react';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Search } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function Progress() {
  const { getExerciseHistory } = useWorkoutStore();
  const [searchTerm, setSearchTerm] = useState('bench press');

  // useMemo ensures we only recalculate the chart data when the search term changes
  const chartData = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const history = getExerciseHistory(searchTerm);
    // Format dates for the chart and sort chronologically
    return history.map(entry => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: entry.maxWeight,
      fullDate: entry.date
    })).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [searchTerm, getExerciseHistory]);

  return (
    <div className="pt-6 pb-24 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Progress</h1>
        <p className="text-gray-400 text-sm">Track your max weight over time.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search exercise (e.g. Squat)"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#3B82F6] outline-none transition-colors"
        />
      </div>

      {/* Chart Area */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-[#3B82F6]" size={20} />
          <h2 className="font-semibold text-white">
            Max Weight: <span className="capitalize">{searchTerm || '...'}</span>
          </h2>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#666" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#666" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}kg`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                  itemStyle={{ color: '#3B82F6', fontWeight: 'bold' }}
                  labelStyle={{ color: '#999', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  name="Max Weight"
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4, stroke: '#0f0f0f' }}
                  activeDot={{ r: 6, fill: '#60A5FA', stroke: '#0f0f0f' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <p>No data found for "{searchTerm}"</p>
            <p className="text-sm mt-1">Log this exercise to see your progress!</p>
          </div>
        )}
      </div>
    </div>
  );
}
