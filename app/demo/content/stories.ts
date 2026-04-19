/**
 * Story-act content registry.
 *
 * Single source of truth for Act I — every photo path, every named
 * testimony, every line of copy and every statistic used by the opening
 * scenes lives here. Scene components must NOT hardcode any of this — they
 * import from this module so the whole act can be rewritten in minutes
 * during the live pitch.
 *
 * Note on filenames:
 *   Several files in `public/story/` still carry their long Google-cache
 *   names. They render fine; renaming is tracked as a separate housekeeping
 *   task. Likewise the post-sponsorship Neneh photo is the original
 *   "Screenshot 2026-04-19 025330.png" until renamed.
 */

export type StoryImage = {
    src: string;
    alt: string;
    credit: string;
};

export type Stat = {
    label: string;
    value: number;
    decimals: number;
    prefix: string;
    suffix: string;
};

/** A four-problem story scene. */
export type ProblemBlock = {
    /** "1 of 4", "2 of 4", … */
    number: 1 | 2 | 3 | 4;
    /** Short label after "Problem N of 4 · " */
    eyebrow: string;
    /** Big typewriter headline */
    headline: string;
    /** Optional sub-line under the headline */
    body?: string;
    /** Primary backdrop photo */
    primary: StoryImage;
    /** Optional photo crossfaded in after a few seconds */
    secondary?: StoryImage;
    /** Two-to-three counter cards on the right */
    stats: Stat[];
    /** Source attributions, joined with " · " in a tiny footer */
    citations: string[];
};

export const STORY_IMAGES: Record<string, StoryImage> = {
    /* --- existing photos --------------------------------------------- */
    fieldWide: {
        src: '/story/16579918350_05e14c4a19_b.jpg',
        alt: 'A small child stands alone on a vast field of mixed plastic waste at Bakoteh dumpsite.',
        credit: 'Photo · Child Aid Gambia',
    },
    fieldChildren: {
        src: '/story/tuijIrXotTcdj9_G4U8fBAjUMsBqrAoM6Ncdj5W5ExYAVrIIoG9-Jy72aPl2IpCEw3HMUhyI2IhGCZcu2WHnUobjDnBvnOCpd9ANzxtYwI-Fy6twpyJuupo_eaQh9UjrfFiWhpkrAZEPJ19_8gOkFkJgml-pxv-uP8VEf_1pOgMl3pL7tkO2mo9MI_TYXCmw.jpg',
        alt: 'Three children stand in the middle of a sea of household plastic waste, with smoke rising in the distance.',
        credit: 'Photo · Bakoteh dumpsite reporting',
    },
    nenehScavenging: {
        src: '/story/16579409248_8bbeda40ed_b.jpg',
        alt: 'A volunteer kneels to share a drink of water with a small girl standing on the dumpsite.',
        credit: 'Photo · Child Aid Gambia',
    },
    nenehAfter: {
        src: '/story/Screenshot 2026-04-19 025330.png',
        alt: 'A smiling young girl in a blue school uniform holds a stuffed elephant beside a Child Aid Gambia volunteer in a classroom.',
        credit: 'Photo · Child Aid Gambia · post-sponsorship',
    },
    boyWithSack: {
        src: '/story/16581057509_4c472e9f6d_b.jpg',
        alt: 'A young boy carries a large sack of recyclables on his shoulder across a field of waste; other children scavenge in the background.',
        credit: 'Photo · Child Aid Gambia',
    },
    smokeRoad: {
        src: '/story/0201.jpg',
        alt: 'A road at dusk with thick smoke from a nearby dumpsite drifting low across the sky.',
        credit: 'Photo · resident submission',
    },
    fireActive: {
        src: '/story/NZnMcH3EV2yMEOODRS2bDJRjUPJonZOqUhuFwSpsDp9R1jfw1D0F1Lroyz0zNd-GaTCIzx3LAsp6pjpON2kHZs2i8j6kyqZhdDygwjhAkIJLOburH0A3iBa_QbfINQ-iFbK6nMzG42RlgBHqXQyVHRkudCQikgvhqmklWmPBpOoZ58RaWbGPwPyPJZo2t2GT.jpg',
        alt: 'Black smoke and flames rising from a wall-bounded burning dumpsite as figures move along the perimeter.',
        credit: 'Photo · resident submission',
    },
    truckOnDump: {
        src: '/story/IMrLfxFWj_nTGOuzVVFgPFnmUmli3rTCBuVqg-LHawzc2Ct2R-snNcRg1hCJIMn5oxpPsZABg2s1wUnsRWecEZkIW-jL2HmJNZVQHEtcGfjtHvR8jiG6eDEjaFxmhQnTZHdy4y7e5XeIMzspoOjVx53cyUB_PCcYmijy5AnjVTWMGK_AWeHCVt9jwRrL9kBc.jpg',
        alt: 'A teenage boy in an orange shirt stands in front of a fully loaded waste truck unloading on the dump; younger children sift through the new pile beside him.',
        credit: 'Photo · Bakoteh dumpsite reporting',
    },
    marketBins: {
        src: '/story/vXuj5lRLgdvIyslVGzOHQNIbeEiDedhkHvMHzgPTVFj17SOMc3_NKaLYB9Ft_A5Z_zfaYwNwDzVbJqBfkwuOxinxB-mjuFapaSO0mJXN94_gBeWc_z7upf9kAZITn09KZ39kM1j4GbvYOkhew4dDU2iym-St7xKCYDq4SYPPz_CZVg3Qy0dneaxQvd6bL2T0.jpg',
        alt: 'Overflowing waste bins inside a covered Gambian market, with rotting produce on the ground and traders trying to work around them.',
        credit: 'Photo · market report, July 2021',
    },
    waterTesting: {
        src: '/story/vg_gTefNvb3OOR_3ctNURGvpUT_OpsNfG8R2uV-TbDJXt2g60F9ngD2pgvjDxoH-dim9u1BP5hDETgwCDky4qpqBFCk17LQDn-yyNaSAODC_hOEWS3TW7zorotlT77E1BbofXIClHurqBUZYhz0UMUOpNbGmndQukpGiJghJC-p_uxhTbSXvldPXyPeyPG60.jpg',
        alt: 'NGO worker in protective gloves taking a water/oil sample from a barrel at a dumpsite while a local resident assists.',
        credit: 'Photo · field testing',
    },

    /* --- newly uploaded for Act I problem scenes --------------------- */
    gunjurAerial: {
        src: '/story/4d705062-538a-4278-8200-601044ce396f.png',
        alt: 'Aerial view of the Golden Lead fishmeal plant in Gunjur with brown industrial discharge staining the Bolong Fenyo lagoon as it meets the Atlantic.',
        credit: 'Photo · Golden Lead / Bolong Fenyo, Gunjur',
    },
    boyInGreenWater: {
        src: '/story/image.webp',
        alt: 'A boy wades through a raft of plastic waste floating on bright-green stagnant water, surrounded by debris on the bank.',
        credit: 'Photo · river dumping reportage',
    },
    floodStreet: {
        src: '/story/hqdefault.jpg',
        alt: 'A flooded residential street with a large pile of dumped garbage, captioned "Garbage dumping cause flood".',
        credit: 'Photo · NICE Gambia field video',
    },
    cowsBrufut: {
        src: '/story/cows-searching-for-food-amongst-waste-at-rubbish-dump-brufut-the-gambia-PAFX77.jpg',
        alt: 'Cattle graze on a sea of plastic waste at the Brufut dumpsite, with a herder walking among them and a baobab in the background.',
        credit: 'Photo · Alamy · Brufut, The Gambia',
    },
    forestDump: {
        src: '/story/373213348.jpg',
        alt: 'Plastic, metal cans and household waste dumped in the understorey of a green forest.',
        credit: 'Photo · stock illustration · forest fly-tipping',
    },
    sickChildIV: {
        src: '/story/gettyimages-2211920593-612x612.jpg',
        alt: 'A small child sleeps on a hospital bed with an intravenous drip taped to one hand; an adult sits beside the bed.',
        credit: 'Photo · Carlos Duarte / Getty Images',
    },
    sickBabyMom: {
        src: '/story/IMG_0968_1.jpg',
        alt: 'A young mother sits on a bare hospital bed with her sick infant, a blood transfusion bag hanging on the IV stand beside them.',
        credit: 'Photo · clinic, Greater Banjul',
    },
};

/* ============================================================== */
/*  SCENE 01 — The fields  (opening tableau)                       */
/* ============================================================== */
export const SCENE_FIELDS = {
    eyebrow: 'The Gambia · Today',
    line: "There are children working in The Gambia's rubbish today.",
    image: STORY_IMAGES.fieldWide,
};

/* ============================================================== */
/*  SCENE 02 — Problem 1 of 4 · Water bodies                       */
/* ============================================================== */
export const PROBLEM_WATER: ProblemBlock = {
    number: 1,
    eyebrow: 'Problem 1 of 4 · Water bodies',
    headline: 'They dump it in our rivers.',
    body: 'In May 2017, the Bolong Fenyo lagoon at Gunjur turned blood-red overnight — fish kill, bird die-off, an ecosystem suffocated by industrial effluent.',
    primary: STORY_IMAGES.gunjurAerial,
    secondary: STORY_IMAGES.boyInGreenWater,
    stats: [
        { label: '× safe nitrate level — Bolong Fenyo lagoon, 2017', value: 40, decimals: 0, prefix: '~', suffix: '×' },
        { label: '× WHO arsenic limit, same lagoon', value: 2, decimals: 0, prefix: '', suffix: '×' },
        { label: 'Of nearby Bakoteh wells with fecal coliform > 100 CFU/100 mL', value: 50, decimals: 0, prefix: '', suffix: '%' },
    ],
    citations: ['Sanneh et al. 2011', 'Bolong Fenyo lab analysis 2017', 'Foroyaa Sept 2025 · Kotu stream'],
};

/* ============================================================== */
/*  SCENE 03 — Problem 2 of 4 · Streets & neighbourhoods           */
/* ============================================================== */
export const PROBLEM_STREETS: ProblemBlock = {
    number: 2,
    eyebrow: 'Problem 2 of 4 · Streets & neighbourhoods',
    headline: 'They dump it in our streets.',
    body: 'Markets overflow. Drains clog. The first hard rain turns the road into a sewer — and the next dry week turns it into a mosquito nursery.',
    primary: STORY_IMAGES.floodStreet,
    secondary: STORY_IMAGES.marketBins,
    stats: [
        { label: 'Of national municipal waste left untreated', value: 90, decimals: 0, prefix: '~', suffix: '%' },
        { label: 'Only ever collected', value: 10, decimals: 0, prefix: '~', suffix: '%' },
        { label: 'Greater-Banjul stream documented as polluted by sewage + solid waste', value: 1, decimals: 0, prefix: '', suffix: '' },
    ],
    citations: ['Sanneh review · 2011', 'Foroyaa · July 2025', 'Foroyaa · Kotu stream, Sept 2025'],
};

/* ============================================================== */
/*  SCENE 04 — Problem 3 of 4 · Open burning                       */
/* ============================================================== */
export const PROBLEM_BURNING: ProblemBlock = {
    number: 3,
    eyebrow: 'Problem 3 of 4 · Open burning',
    headline: 'And then they set it on fire.',
    body: 'Bakoteh burns almost every year. The smoke reaches schools, clinics and an SOS Children\u2019s Village downwind.',
    primary: STORY_IMAGES.smokeRoad,
    secondary: STORY_IMAGES.fireActive,
    stats: [
        { label: 'Tonnes of waste arriving every day at Bakoteh', value: 460, decimals: 0, prefix: '', suffix: '' },
        { label: 'Hectares of open, mostly burning dumpsite', value: 17.8, decimals: 1, prefix: '', suffix: ' ha' },
        { label: 'SOS Children\u2019s Village in the smoke path', value: 1, decimals: 0, prefix: '', suffix: '' },
    ],
    citations: ['KMC operational data', 'Green-Up Gambia · 2024', 'Voice Gambia interviews'],
};

/* ============================================================== */
/*  SCENE 05 — Problem 4 of 4 · Forests & wildlife                 */
/* ============================================================== */
export const PROBLEM_FORESTS: ProblemBlock = {
    number: 4,
    eyebrow: 'Problem 4 of 4 · Forests & wildlife',
    headline: 'They dump it in our forests.',
    body: 'Dec 2025 saw multi-agency clean-ups of massive illegal dumps in the Nyambai and Kabafita forests — water catchments where ten community boreholes were already at risk. Cattle now graze on plastic at Brufut.',
    primary: STORY_IMAGES.cowsBrufut,
    secondary: STORY_IMAGES.forestDump,
    stats: [
        { label: 'Community boreholes endangered (Nyambai / Kabafita)', value: 10, decimals: 0, prefix: '~', suffix: '' },
        { label: 'Protected forests under active dumping pressure', value: 2, decimals: 0, prefix: '', suffix: '' },
        { label: 'Of national waste left to leach into soil + groundwater', value: 90, decimals: 0, prefix: '~', suffix: '%' },
    ],
    citations: ['Nagoya Protocol / ABS · Dec 2025', 'The Standard · Dec 2025', 'WHO context'],
};

/* ============================================================== */
/*  SCENE 06 — The human cost                                       */
/* ============================================================== */
export const HUMAN_COST = {
    eyebrow: 'The human cost',
    headline: 'And it lands on the same families twice.',
    body: 'Once when their children scavenge instead of going to school. Again when the contaminated water and the smoke send those children to a clinic.',
    /** Two photos shown side-by-side under the copy. */
    photos: [STORY_IMAGES.sickBabyMom, STORY_IMAGES.sickChildIV] as [StoryImage, StoryImage],
    /** The wage-crash beat (£15 dramatised → £0.15 actual). */
    wage: {
        big: 15,
        small: 0.15,
        caption: 'A full bag of recyclable metal — an entire day\u2019s scavenging.',
    },
    /** Three crossing stats. */
    stats: [
        { label: 'Of water samples adjacent to Bakoteh exceed safe coliform limit', value: 93, decimals: 0, prefix: '', suffix: '%' },
        { label: 'Pence — what a full bag of recyclables actually pays', value: 15, decimals: 0, prefix: '', suffix: 'p' },
        { label: 'Years she had not been to school when sponsorship found her', value: 4, decimals: 0, prefix: '', suffix: '' },
    ] as Stat[],
    citations: ['Sanneh et al. 2011 (93% sample-level)', 'Child Aid Gambia · Neneh case file'],
};

/* ============================================================== */
/*  SCENE 07 — Neneh's story                                       */
/* ============================================================== */
export const NENEH = {
    eyebrow: "Neneh's Story",
    title: 'One sponsorship. One school. One whole life rewritten.',
    before: STORY_IMAGES.nenehScavenging,
    beforeLabel: 'Before',
    after: STORY_IMAGES.nenehAfter,
    afterLabel: 'After',
    beats: [
        'Neneh was twelve. The third of nine children.',
        'She had not been to school in four years.',
        'She worked the Bakoteh dump alongside her siblings — fifteen pence a bag.',
        'In 2015, Child Aid Gambia sponsored her into Lower Basic School.',
        'By 2017, she was scoring A grades. English became her favourite subject.',
        'Today she lives away from the dump. She never has to scavenge again.',
    ],
};

/* ============================================================== */
/*  SCENE 08 — The voices                                          */
/* ============================================================== */
export type Testimony = {
    name: string;
    role: string;
    quote: string;
    source: string;
};

export const VOICES = {
    eyebrow: 'And these are the voices',
    title: 'People living next to it have names.',
    backdrop: STORY_IMAGES.fieldChildren,
};

export const TESTIMONIES: Testimony[] = [
    {
        name: 'Tida Sillah',
        role: 'Mother, Bakoteh',
        quote: 'When the dump burns I have to move my children out. If not the sickness will disturb them. They all have asthma now.',
        source: 'Voice Gambia',
    },
    {
        name: 'Saffiatou Sambou',
        role: 'Homeowner near the dumpsite',
        quote: 'Even inside our own house, they can hardly breathe. The smell gets into the food.',
        source: 'The Point',
    },
    {
        name: 'Adama Ida Ceesay',
        role: 'Landlord, Bakoteh',
        quote: 'At night the flies and the pollution from the dump make it impossible to sleep.',
        source: 'The Point',
    },
    {
        name: 'Mariama Nyassi',
        role: 'Waste picker, mother',
        quote: 'I earn my income from the dump to feed my family. Sometimes my children come with me. They have stopped going to school.',
        source: 'NGO field interview',
    },
    {
        name: 'Ndey Ngum',
        role: 'Resident, Bakoteh',
        quote: "When the smoke is thick we just have to leave the house. We give the children milk to drink — that's all we know to do.",
        source: 'Voice Gambia',
    },
];

/* ============================================================== */
/*  SCENE 09 — The vision (recycling industry)                     */
/* ============================================================== */
export const VISION = {
    eyebrow: 'But what if…',
    headline: 'We turn this into an industry.',
    /** Background photo cycle behind the flow diagram. */
    background: [STORY_IMAGES.truckOnDump, STORY_IMAGES.waterTesting, STORY_IMAGES.marketBins] as const,
    stages: [
        {
            key: 'collect',
            title: 'COLLECT',
            sub: 'mbalit · phone-booked pickup',
            line: 'Every household, every market, every street.',
            color: '#10b981', // emerald
        },
        {
            key: 'sort',
            title: 'SORT',
            sub: 'Regulated transfer stations',
            line: 'Plastic, metal, organic, e-waste — separated, weighed, traceable.',
            color: '#14b8a6', // teal
        },
        {
            key: 'recycle',
            title: 'RECYCLE',
            sub: 'Local processing & buy-back',
            line: 'Material streams sold by weight, not by exploitation.',
            color: '#06b6d4', // cyan
        },
        {
            key: 'goods',
            title: 'GOODS',
            sub: 'Re-manufactured product',
            line: 'Civilization is built on what we recover from what we throw away.',
            color: '#fbbf24', // amber
        },
    ],
    closer: "Families like Neneh's earn a real living.",
    sub: 'That is what mbalit is for.',
};
