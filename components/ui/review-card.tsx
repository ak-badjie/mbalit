'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Reply } from 'lucide-react';
import { Review } from '@/types';

interface ReviewCardProps {
    review: Review;
    onReply?: (reviewId: string) => void;
    showReplyButton?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
    review,
    onReply,
    showReplyButton = false,
}) => {
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    };

    const StarRating = ({ rating }: { rating: number }) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <motion.div
                    key={star}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: star * 0.1 }}
                >
                    <Star
                        className={`w-4 h-4 ${star <= rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                    />
                </motion.div>
            ))}
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
                        {review.fromUserImage ? (
                            <img
                                src={review.fromUserImage}
                                alt={review.fromUserName}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            review.fromUserName.charAt(0).toUpperCase()
                        )}
                    </div>

                    {/* Name and Rating */}
                    <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                            {review.fromUserName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={review.rating} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(review.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Badge for collector review */}
                {review.isCollectorReview && (
                    <span className="px-2 py-1 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                        Collector Review
                    </span>
                )}
            </div>

            {/* Comment */}
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {review.comment}
            </p>

            {/* Response (if exists) */}
            {review.response && (
                <div className="mt-3 pl-4 border-l-2 border-emerald-200 dark:border-emerald-700">
                    <div className="flex items-center gap-2 mb-1">
                        <Reply className="w-3 h-3 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-600">
                            Response
                        </span>
                        {review.responseAt && (
                            <span className="text-[10px] text-gray-400">
                                {formatDate(review.responseAt)}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {review.response}
                    </p>
                </div>
            )}

            {/* Reply Button */}
            {showReplyButton && !review.response && onReply && (
                <button
                    onClick={() => onReply(review.id)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Reply to this review
                </button>
            )}
        </motion.div>
    );
};

// Average Rating Display Component
interface AverageRatingProps {
    rating: number;
    totalReviews: number;
}

export const AverageRating: React.FC<AverageRatingProps> = ({ rating, totalReviews }) => {
    return (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl">
            <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    {rating.toFixed(1)}
                </div>
                <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`w-4 h-4 ${star <= Math.round(rating)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-gray-300'
                                }`}
                        />
                    ))}
                </div>
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Based on <span className="font-semibold text-gray-900 dark:text-white">{totalReviews}</span> reviews
                </p>
                <div className="mt-2 space-y-1">
                    {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-3">{stars}</span>
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full"
                                    style={{ width: `${Math.random() * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReviewCard;
