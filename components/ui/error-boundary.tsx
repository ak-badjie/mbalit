'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
    fallback?: (reset: () => void, error: Error) => React.ReactNode;
    /**
     * Identifier the consumer can change to force a reset (e.g. switch a key
     * when the user navigates to a new step). When this changes the boundary
     * clears its error.
     */
    resetKey?: string | number;
}

interface State {
    error: Error | null;
}

/**
 * Generic error boundary used to catch Google Maps / geocoding / payment
 * crashes so a single bad API call can't blank the whole app — which is
 * especially nasty on iOS Safari where uncaught render errors can crash the
 * tab outright.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    componentDidUpdate(prevProps: Props) {
        if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ error: null });
        }
    }

    reset = () => this.setState({ error: null });

    render() {
        if (this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.reset, this.state.error);
            }
            return <DefaultFallback reset={this.reset} error={this.state.error} />;
        }
        return this.props.children;
    }
}

function DefaultFallback({ reset, error }: { reset: () => void; error: Error }) {
    const message = friendlyMessage(error);
    return (
        <div className="px-5 py-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
                <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-[#0F1A14] text-base">Something went wrong</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-[20rem]">{message}</p>
            <button
                type="button"
                onClick={reset}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E7A3B] hover:bg-[#0a6230] text-white font-semibold text-sm"
            >
                <RotateCcw className="w-4 h-4" />
                Try again
            </button>
        </div>
    );
}

function friendlyMessage(error: Error): string {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('billing') || msg.includes('rejected_request_denied') || msg.includes('apinotactivatedmaperror')) {
        return 'Maps is temporarily unavailable. Please try again in a moment, or contact support if it keeps happening.';
    }
    if (msg.includes('quota') || msg.includes('over_query_limit')) {
        return 'We hit a temporary rate limit. Please try again in a minute.';
    }
    if (msg.includes('network') || msg.includes('failed to fetch')) {
        return 'Network problem — check your connection and try again.';
    }
    return 'An unexpected error happened. Tap “Try again” to retry.';
}

export default ErrorBoundary;
