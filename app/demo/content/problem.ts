export type ProblemScene1 = {
    eyebrow: string;
    title: string;
    subtitle: string;
};

export type ProblemScene2 = {
    headline: string;
    stats: { value: number; suffix?: string; label: string }[];
};

export type ProblemScene3 = {
    headline: string;
    body: string;
    bullets: string[];
};

export type ProblemScene4 = {
    headline: string;
    bars: { label: string; value: number; max: number; unit: string }[];
};

export type ProblemScene5 = {
    headline: string;
    cities: string[];
    note: string;
};

export type ProblemScene6 = {
    headline: string;
    callout: string;
    authority: string;
    authorityLogo: string;
};

export const problem = {
    scene1: {
        eyebrow: 'The Gambia · 2026',
        title: 'Waste is piling up faster than we can move it.',
        subtitle: 'A story in six scenes.',
    } as ProblemScene1,

    scene2: {
        headline: 'Every single day in Greater Banjul',
        stats: [
            { value: 850, suffix: ' tons', label: 'of waste generated' },
            { value: 42, suffix: '%', label: 'never reaches a dump site' },
            { value: 1, suffix: ' in 3', label: 'households burn their waste' },
        ],
    } as ProblemScene2,

    scene3: {
        headline: 'Drains clog. Rains flood. People get sick.',
        body: 'Without a reliable pickup, plastics and organic waste end up in storm drains and open lots — turning every wet season into a public-health emergency.',
        bullets: [
            'Cholera & typhoid outbreaks tied to standing water',
            'Mosquito-borne illness spikes in flooded neighborhoods',
            'Children playing meters from open dumping sites',
        ],
    } as ProblemScene3,

    scene4: {
        headline: 'The collection gap, by the numbers',
        bars: [
            { label: 'Waste generated weekly', value: 5950, max: 6000, unit: 't' },
            { label: 'Officially collected', value: 3450, max: 6000, unit: 't' },
            { label: 'Reaches a sanitary landfill', value: 1680, max: 6000, unit: 't' },
        ],
    } as ProblemScene4,

    scene5: {
        headline: 'Communities feeling it most',
        cities: ['Bakau', 'Serrekunda', 'Tallinding', 'Brikama', 'Bundung', 'Latrikunda', 'Bakoteh', 'Kanifing'],
        note: '8 KMC wards, 600,000+ residents, one overworked fleet.',
    } as ProblemScene5,

    scene6: {
        headline: 'And then there\'s corporate dumping.',
        callout: 'Trucks unload at night where no one\'s watching. Citizens see it. Authorities don\'t — until it\'s too late.',
        authority: 'Kanifing Municipal Council',
        authorityLogo: '/kmc-logo.png',
    } as ProblemScene6,
};
