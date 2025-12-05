import React from 'react';

// Simplified SVG wrapper to keep code clean
const FlagIcon = ({ children }: { children: React.ReactNode }) => (
    <div className="w-5 h-5 overflow-hidden rounded-full flex-shrink-0">
        {children}
    </div>
);

export const LANGUAGE_OPTIONS = [
    {
        value: "en-US",
        label: "English",
        region: "(US)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="#B22234" />
                    <path d="M0 10H20" stroke="white" strokeWidth="2" />
                    <path d="M0 6H20" stroke="white" strokeWidth="2" />
                    <path d="M0 14H20" stroke="white" strokeWidth="2" />
                    <path d="M0 2H20" stroke="white" strokeWidth="2" />
                    <path d="M0 18H20" stroke="white" strokeWidth="2" />
                    <rect width="9" height="10" fill="#3C3B6E" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "en-GB",
        label: "English",
        region: "(UK)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0H20V20H0V0Z" fill="#012169" />
                    <path d="M0 0L20 20M20 0L0 20" stroke="white" strokeWidth="4" />
                    <path d="M0 0L20 20M20 0L0 20" stroke="#C8102E" strokeWidth="2" />
                    <path d="M10 0V20M0 10H20" stroke="white" strokeWidth="6" />
                    <path d="M10 0V20M0 10H20" stroke="#C8102E" strokeWidth="3" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "es-ES",
        label: "Spanish",
        region: "(Spain)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="#AA151B" />
                    <rect y="5" width="20" height="10" fill="#F1BF00" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "es-MX",
        label: "Spanish",
        region: "(Latin America)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="#006847" />
                    <rect x="6.6" width="6.6" height="20" fill="white" />
                    <rect x="13.2" width="6.8" height="20" fill="#CE1126" />
                    <circle cx="10" cy="10" r="2" fill="#5F3918" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "fr-FR",
        label: "French",
        region: "(France)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="white" />
                    <path d="M0 0H6.6V20H0V0Z" fill="#0055A4" />
                    <path d="M13.3 0H20V20H13.3V0Z" fill="#EF4135" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "de-DE",
        label: "German",
        region: "(Germany)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="#FFCE00" />
                    <path d="M0 0H20V6.6H0V0Z" fill="black" />
                    <path d="M0 6.6H20V13.3H0V6.6Z" fill="#DD0000" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "pt-BR",
        label: "Portuguese",
        region: "(Brazil)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="#009C3B" />
                    <path d="M10 3L18 10L10 17L2 10L10 3Z" fill="#FFDF00" />
                    <circle cx="10" cy="10" r="3.5" fill="#002776" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "hi-IN",
        label: "Hindi",
        region: "(India)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="white" />
                    <path d="M0 0H20V6.6H0V0Z" fill="#FF9933" />
                    <path d="M0 13.3H20V20H0V13.3Z" fill="#138808" />
                    <circle cx="10" cy="10" r="2" stroke="#000080" strokeWidth="0.5" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "it-IT",
        label: "Italian",
        region: "(Italy)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="white" />
                    <path d="M0 0H6.6V20H0V0Z" fill="#009246" />
                    <path d="M13.3 0H20V20H13.3V0Z" fill="#CE2B37" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "ja-JP",
        label: "Japanese",
        region: "(Japan)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="white" />
                    <circle cx="10" cy="10" r="6" fill="#BC002D" />
                </svg>
            </FlagIcon>
        )
    },
    {
        value: "zh-CN",
        label: "Chinese",
        region: "(China)",
        flag: (
            <FlagIcon>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" fill="#DE2910" />
                    <path d="M5 4L6 7L3 5H7L4 7L5 4Z" fill="#FFDE00" />
                </svg>
            </FlagIcon>
        )
    }
];