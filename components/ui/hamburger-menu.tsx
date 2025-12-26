"use client";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

export interface MenuItem {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
}

export interface HamburgerMenuOverlayProps {
    /** Array of menu items */
    items: MenuItem[];
    /** Button position from top */
    buttonTop?: string;
    /** Button position from left */
    buttonLeft?: string;
    /** Button size */
    buttonSize?: "sm" | "md" | "lg";
    /** Button background color */
    buttonColor?: string;
    /** Overlay background color/gradient */
    overlayBackground?: string;
    /** Menu text color */
    textColor?: string;
    /** Menu font size */
    fontSize?: "sm" | "md" | "lg" | "xl" | "2xl";
    /** Font family */
    fontFamily?: string;
    /** Font weight */
    fontWeight?: "normal" | "medium" | "semibold" | "bold";
    /** Animation duration in seconds */
    animationDuration?: number;
    /** Stagger delay between menu items */
    staggerDelay?: number;
    /** Menu items alignment */
    menuAlignment?: "left" | "center" | "right";
    /** Custom class for container */
    className?: string;
    /** Custom class for button */
    buttonClassName?: string;
    /** Custom class for menu items */
    menuItemClassName?: string;
    /** Disable overlay close on item click */
    keepOpenOnItemClick?: boolean;
    /** Custom button content */
    customButton?: React.ReactNode;
    /** ARIA label for accessibility */
    ariaLabel?: string;
    /** Callback when menu opens */
    onOpen?: () => void;
    /** Callback when menu closes */
    onClose?: () => void;
    /** Menu items layout direction */
    menuDirection?: "vertical" | "horizontal";
    /** Enable blur backdrop */
    enableBlur?: boolean;
    /** Z-index for overlay */
    zIndex?: number;
}

export const HamburgerMenuOverlay: React.FC<HamburgerMenuOverlayProps> = ({
    items = [],
    buttonTop = "32px",
    buttonLeft = "calc(100% - 48px)",
    buttonSize = "md",
    buttonColor = "#10b981", // Emerald-500
    overlayBackground = "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)", // Emerald gradient
    textColor = "#ffffff",
    fontSize = "lg",
    fontFamily = '"Inter", system-ui, sans-serif',
    fontWeight = "bold",
    animationDuration = 0.8,
    staggerDelay = 0.08,
    menuAlignment = "center",
    className,
    buttonClassName,
    menuItemClassName,
    keepOpenOnItemClick = false,
    customButton,
    ariaLabel = "Navigation menu",
    onOpen,
    onClose,
    menuDirection = "vertical",
    enableBlur = true,
    zIndex = 1000,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const buttonSizes = {
        sm: "w-10 h-10",
        md: "w-12 h-12",
        lg: "w-14 h-14",
    };

    const fontSizes = {
        sm: "text-xl",
        md: "text-2xl",
        lg: "text-3xl",
        xl: "text-4xl",
        "2xl": "text-5xl",
    };

    const toggleMenu = () => {
        const newState = !isOpen;
        setIsOpen(newState);

        if (newState) {
            document.body.style.overflow = 'hidden';
            onOpen?.();
        } else {
            document.body.style.overflow = '';
            onClose?.();
        }
    };

    const handleItemClick = (item: MenuItem) => {
        if (item.onClick) {
            item.onClick();
        }

        if (item.href && !item.onClick) {
            window.location.href = item.href;
        }

        if (!keepOpenOnItemClick) {
            setIsOpen(false);
            document.body.style.overflow = '';
            onClose?.();
        }
    };

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
                document.body.style.overflow = '';
                onClose?.();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    return (
        <div ref={containerRef} className={cn("md:hidden", className)}>
            <style>
                {`
          .hamburger-overlay-${zIndex} {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: ${overlayBackground};
            z-index: ${zIndex};
            clip-path: circle(0px at calc(100% - 32px) 32px);
            transition: clip-path ${animationDuration}s cubic-bezier(0.22, 0.61, 0.36, 1);
            ${enableBlur ? "backdrop-filter: blur(20px);" : ""}
          }
          
          .hamburger-overlay-${zIndex}.open {
            clip-path: circle(150% at calc(100% - 32px) 32px);
          }
          
          .hamburger-button-${zIndex} {
            position: fixed;
            right: 16px;
            top: 16px;
            border-radius: 16px;
            z-index: ${zIndex + 1};
            background: ${buttonColor};
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          }
          
          .hamburger-button-${zIndex}:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
          }
          
          .hamburger-button-${zIndex}:active {
            transform: scale(0.95);
          }
          
          .menu-items-${zIndex} {
            list-style: none;
            padding: 0;
            margin: 0;
            text-align: ${menuAlignment};
          }
          
          .menu-item-${zIndex} {
            position: relative;
            padding: 1rem 2rem;
            cursor: pointer;
            transform: translateY(30px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.22, 0.61, 0.36, 1);
            font-family: ${fontFamily};
            font-weight: ${fontWeight};
            color: ${textColor};
          }
          
          .menu-item-${zIndex}.visible {
            transform: translateY(0);
            opacity: 1;
          }
          
          .menu-item-${zIndex}::after {
            content: "";
            position: absolute;
            bottom: 0.5rem;
            left: 50%;
            transform: translateX(-50%) scaleX(0);
            width: 40%;
            height: 3px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.6);
            transition: transform 0.3s ease;
          }
          
          .menu-item-${zIndex}:hover::after,
          .menu-item-${zIndex}:focus::after {
            transform: translateX(-50%) scaleX(1);
          }
          
          .menu-item-${zIndex} span {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            opacity: 0.9;
            transition: opacity 0.25s ease, transform 0.25s ease;
          }
          
          .menu-item-${zIndex}:hover span {
            opacity: 1;
            transform: scale(1.05);
          }
          
          .menu-item-${zIndex} .menu-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
          }
        `}
            </style>

            {/* Navigation Overlay */}
            <div
                ref={navRef}
                className={cn(`hamburger-overlay-${zIndex}`, isOpen && "open")}
                aria-hidden={!isOpen}
            >
                {/* Logo/Brand at top */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2">
                    <span className="text-2xl font-bold text-white/90">Mbalit</span>
                </div>

                <ul className={cn(`menu-items-${zIndex}`)}>
                    {items.map((item, index) => (
                        <li
                            key={index}
                            className={cn(
                                `menu-item-${zIndex}`,
                                fontSizes[fontSize],
                                isOpen && "visible",
                                menuItemClassName
                            )}
                            style={{
                                transitionDelay: isOpen ? `${index * staggerDelay + 0.2}s` : "0s",
                            }}
                            onClick={() => handleItemClick(item)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleItemClick(item);
                                }
                            }}
                            tabIndex={isOpen ? 0 : -1}
                            role="button"
                            aria-label={`Navigate to ${item.label}`}
                        >
                            <span>
                                {item.icon && <span className="menu-icon">{item.icon}</span>}
                                {item.label}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* Footer text */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-white/60 text-sm">Making The Gambia cleaner</p>
                </div>
            </div>

            {/* Hamburger Button */}
            <button
                className={cn(
                    `hamburger-button-${zIndex}`,
                    buttonSizes[buttonSize],
                    buttonClassName
                )}
                onClick={toggleMenu}
                aria-label={ariaLabel}
                aria-expanded={isOpen}
                aria-controls="navigation-menu"
            >
                {customButton || (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <Menu
                            className={cn(
                                "absolute transition-all duration-300",
                                isOpen
                                    ? "opacity-0 rotate-90 scale-0"
                                    : "opacity-100 rotate-0 scale-100"
                            )}
                            size={buttonSize === "sm" ? 18 : buttonSize === "md" ? 22 : 26}
                            color={textColor}
                        />
                        <X
                            className={cn(
                                "absolute transition-all duration-300",
                                isOpen
                                    ? "opacity-100 rotate-0 scale-100"
                                    : "opacity-0 -rotate-90 scale-0"
                            )}
                            size={buttonSize === "sm" ? 18 : buttonSize === "md" ? 22 : 26}
                            color={textColor}
                        />
                    </div>
                )}
            </button>
        </div>
    );
};

export default HamburgerMenuOverlay;
