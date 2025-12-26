"use client"

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    ReactNode,
} from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"

// Size presets for the Dynamic Island
export type SizePresets =
    | "default"
    | "compact"
    | "small"
    | "medium"
    | "large"
    | "tall"
    | "long"
    | "minimalLeading"
    | "minimalTrailing"

interface DynamicIslandState {
    size: SizePresets
    previousSize: SizePresets
    isAnimating: boolean
}

interface DynamicIslandContextType {
    state: DynamicIslandState
    setSize: (size: SizePresets) => void
}

const DynamicIslandContext = createContext<DynamicIslandContextType | undefined>(
    undefined
)

// Size dimensions mapping
const SIZE_DIMENSIONS: Record<SizePresets, { width: number; height: number }> = {
    default: { width: 150, height: 40 },
    compact: { width: 250, height: 50 },
    small: { width: 200, height: 60 },
    medium: { width: 340, height: 180 },
    large: { width: 370, height: 84 },
    tall: { width: 370, height: 210 },
    long: { width: 350, height: 64 },
    minimalLeading: { width: 52.33, height: 36.67 },
    minimalTrailing: { width: 52.33, height: 36.67 },
}

// Animation variants
const containerVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.9,
    },
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        transition: {
            duration: 0.2,
        },
    },
}

// Dynamic Island Provider
interface DynamicIslandProviderProps {
    children: ReactNode
    initialSize?: SizePresets
}

export function DynamicIslandProvider({
    children,
    initialSize = "default",
}: DynamicIslandProviderProps) {
    const [state, setState] = useState<DynamicIslandState>({
        size: initialSize,
        previousSize: initialSize,
        isAnimating: false,
    })

    const setSize = useCallback((newSize: SizePresets) => {
        setState((prev) => ({
            ...prev,
            previousSize: prev.size,
            size: newSize,
            isAnimating: true,
        }))

        // Reset animating state after animation completes
        setTimeout(() => {
            setState((prev) => ({ ...prev, isAnimating: false }))
        }, 500)
    }, [])

    return (
        <DynamicIslandContext.Provider value={{ state, setSize }}>
            {children}
        </DynamicIslandContext.Provider>
    )
}

// Hook to access Dynamic Island context
export function useDynamicIslandSize() {
    const context = useContext(DynamicIslandContext)
    if (!context) {
        throw new Error(
            "useDynamicIslandSize must be used within a DynamicIslandProvider"
        )
    }
    return context
}

// Hook for scheduled animations
interface ScheduledAnimation {
    size: SizePresets
    delay: number
}

export function useScheduledAnimations(animations: ScheduledAnimation[]) {
    const { setSize } = useDynamicIslandSize()

    useEffect(() => {
        const timeouts: NodeJS.Timeout[] = []

        animations.forEach(({ size, delay }) => {
            const timeout = setTimeout(() => {
                setSize(size)
            }, delay)
            timeouts.push(timeout)
        })

        return () => {
            timeouts.forEach(clearTimeout)
        }
    }, [animations, setSize])
}

// Dynamic Island Component
interface DynamicIslandProps {
    children: ReactNode
    id?: string
    className?: string
}

export function DynamicIsland({
    children,
    id = "dynamic-island",
    className = "",
}: DynamicIslandProps) {
    const { state } = useDynamicIslandSize()
    const dimensions = SIZE_DIMENSIONS[state.size]

    return (
        <motion.div
            id={id}
            initial={false}
            animate={{
                width: dimensions.width,
                height: dimensions.height,
            }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
            }}
            className={`
        relative mx-auto overflow-hidden
        bg-black dark:bg-gray-900
        rounded-[28px] shadow-2xl
        ${className}
      `}
        >
            <AnimatePresence mode="wait">{children}</AnimatePresence>
        </motion.div>
    )
}

// Dynamic Container - wraps content with animations
interface DynamicContainerProps {
    children: ReactNode
    className?: string
}

export function DynamicContainer({
    children,
    className = "",
}: DynamicContainerProps) {
    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`h-full w-full ${className}`}
        >
            {children}
        </motion.div>
    )
}

// Dynamic Title
interface DynamicTitleProps {
    children: ReactNode
    className?: string
}

export function DynamicTitle({ children, className = "" }: DynamicTitleProps) {
    return (
        <motion.h3
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className={`font-bold ${className}`}
        >
            {children}
        </motion.h3>
    )
}

// Dynamic Description
interface DynamicDescriptionProps {
    children: ReactNode
    className?: string
}

export function DynamicDescription({
    children,
    className = "",
}: DynamicDescriptionProps) {
    return (
        <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className={className}
        >
            {children}
        </motion.p>
    )
}

// Dynamic Div - general animated container
interface DynamicDivProps {
    children: ReactNode
    className?: string
}

export function DynamicDiv({ children, className = "" }: DynamicDivProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

export { SIZE_DIMENSIONS }
