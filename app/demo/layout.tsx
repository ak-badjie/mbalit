import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Mbalit — Live Demo',
    description: 'Mbalit pitch presentation',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden font-sans">
            {children}
        </div>
    );
}
