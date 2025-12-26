
import React, { useState } from 'react';
import { TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

interface EarningsChartProps {
    role: 'restaurant' | 'delivery' | 'admin';
    todayEarnings: number;
    totalEarnings: number;
}

export const EarningsChart: React.FC<EarningsChartProps> = ({ role, todayEarnings, totalEarnings }) => {
    const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M'>('1W');

    // Mock data generator based on range
    const getData = () => {
        if (timeRange === '1D') {
            return [
                { label: '10 AM', value: 120 }, { label: '12 PM', value: 450 }, 
                { label: '2 PM', value: 300 }, { label: '4 PM', value: 150 }, 
                { label: '6 PM', value: 600 }, { label: '8 PM', value: 800 }
            ];
        } else if (timeRange === '1W') {
            return [
                { label: 'Mon', value: 2500 }, { label: 'Tue', value: 1800 }, 
                { label: 'Wed', value: 3200 }, { label: 'Thu', value: 2100 }, 
                { label: 'Fri', value: 4500 }, { label: 'Sat', value: 5800 }, { label: 'Sun', value: 5100 }
            ];
        } else {
            return [
                { label: 'Week 1', value: 15000 }, { label: 'Week 2', value: 18200 }, 
                { label: 'Week 3', value: 14500 }, { label: 'Week 4', value: 22000 }
            ];
        }
    };

    const data = getData();
    const maxValue = Math.max(...data.map(d => d.value));

    const getBarColor = () => {
        if (role === 'admin') return 'bg-purple-500';
        if (role === 'delivery') return 'bg-blue-500';
        return 'bg-brand-500';
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wide mb-1">
                        {role === 'admin' ? 'Platform Revenue' : role === 'delivery' ? 'Delivery Earnings' : 'Sales Revenue'}
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-gray-900">₹{totalEarnings.toLocaleString()}</span>
                        <span className="text-green-500 text-sm font-bold flex items-center bg-green-50 px-2 py-0.5 rounded-full">
                            <TrendingUp size={14} className="mr-1"/> +12%
                        </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">Today: <span className="font-bold text-gray-700">₹{todayEarnings}</span></p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['1D', '1W', '1M'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as any)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                timeRange === range 
                                ? 'bg-white text-gray-800 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Simple CSS Chart */}
            <div className="h-40 flex items-end justify-between gap-2 mt-4">
                {data.map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center group">
                        <div className="relative w-full flex justify-center">
                            <div 
                                className={`w-full max-w-[20px] sm:max-w-[40px] rounded-t-lg transition-all duration-500 hover:opacity-80 ${getBarColor()}`}
                                style={{ height: `${(item.value / maxValue) * 100}%` }}
                            ></div>
                            {/* Tooltip */}
                            <div className="absolute -top-10 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                ₹{item.value}
                            </div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium mt-2">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
