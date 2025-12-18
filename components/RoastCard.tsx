import React, { useRef } from 'react';
import { ResumeAnalysis } from '../types';

interface RoastCardProps {
    result: ResumeAnalysis;
    aspectRatio: '1:1' | '9:16';
    mode: 'clean' | 'roast';
}

export const RoastCard: React.FC<RoastCardProps> = ({ result, aspectRatio, mode }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    // Determine verdict based on score
    const getVerdict = (score: number) => {
        if (score >= 75) return { text: 'HIRED', color: 'text-green-600', rotation: 'rotate-12' };
        if (score >= 50) return { text: 'MAYBE', color: 'text-yellow-600', rotation: '-rotate-12' };
        return { text: 'REJECTED', color: 'text-red-600', rotation: 'rotate-15' };
    };

    const verdict = getVerdict(result.score);

    // Get current timestamp
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toUpperCase().replace(',', ' //');

    // Dimensions based on aspect ratio
    const dimensions = aspectRatio === '1:1'
        ? { width: 800, height: 800 }
        : { width: 600, height: 1067 }; // 9:16

    // Pick the best roast
    const savageQuote = mode === 'roast' && result.roasts.length > 0
        ? result.roasts[0]
        : result.recruiterSnapshot;

    return (
        <div
            ref={cardRef}
            className="relative bg-[#FDFBF7] border-4 border-black font-mono"
            style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                boxShadow: '12px 12px 0px 0px #000000'
            }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 bg-grid-pattern pointer-events-none"></div>

            {/* Content Container */}
            <div className="relative h-full flex flex-col justify-between p-12">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-2 border-black">
                            <span className="font-bold text-2xl">R/</span>
                        </div>
                        <span className="font-black text-2xl tracking-tight">RESUVIBE</span>
                    </div>
                    <div className="text-sm opacity-60">{timestamp}</div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">

                    {/* Massive Score */}
                    <div className="relative mb-8">
                        <div className="text-[180px] font-black leading-none tracking-tighter">
                            {result.score}
                        </div>
                        <div className="relative z-10 text-4xl font-bold mt-2 opacity-60">/ 100</div>

                        {/* Verdict Stamp */}
                        <div
                            className={`absolute -top-8 -right-16 ${verdict.rotation} opacity-90`}
                            style={{ transform: `rotate(${verdict.rotation})` }}
                        >
                            <div className={`border-8 border-current ${verdict.color} px-8 py-4`}>
                                <span className="text-5xl font-black tracking-wider">{verdict.text}</span>
                            </div>
                        </div>
                    </div>

                    {/* Vibe Label */}
                    <div className="bg-black text-white px-8 py-3 mb-8 transform -rotate-2">
                        <span className="text-2xl font-bold uppercase">{result.label}</span>
                    </div>

                    {/* Savage Quote */}
                    <div className="max-w-xl">
                        <div className="text-xl font-bold leading-tight mb-4">
                            {mode === 'roast' ? ' THE ROAST ' : 'RECRUITER TAKE'}
                        </div>
                        <blockquote className="text-lg leading-snug italic border-l-4 border-black pl-6">
                            "{savageQuote}"
                        </blockquote>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t-4 border-black pt-6 mt-8">
                    <div className="text-sm opacity-60">
                        {result.name && result.name !== 'Unknown' ? result.name : 'Anonymous'}
                    </div>
                    <div className="text-xl font-bold tracking-wider">
                        RESUVIBE.APP
                    </div>
                </div>

                {/* Jagged Edge Effect (Optional) */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-black"
                    style={{
                        clipPath: 'polygon(0 0, 5% 100%, 10% 0, 15% 100%, 20% 0, 25% 100%, 30% 0, 35% 100%, 40% 0, 45% 100%, 50% 0, 55% 100%, 60% 0, 65% 100%, 70% 0, 75% 100%, 80% 0, 85% 100%, 90% 0, 95% 100%, 100% 0, 100% 100%, 0 100%)'
                    }}
                />
            </div>
        </div>
    );
};

export default RoastCard;
