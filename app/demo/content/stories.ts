/**
 * Story-act content registry.
 *
 * Single source of truth for the new Act I — every photo path, every
 * named testimony, every line of copy used by the opening scenes lives
 * here. Scene components must NOT hardcode any of this — they import
 * from this module so the whole act can be rewritten in minutes during
 * the live pitch.
 *
 * Note on the Neneh "after" image:
 *   The user uploaded a screenshot of a smiling girl beside a Child Aid
 *   Gambia volunteer with the file name
 *   `Screenshot 2026-04-19 025330.png`. There is no `neneh.png` in
 *   public/story/. We treat the screenshot as the post-sponsorship
 *   image. To rename it, swap the path on `STORY_IMAGES.nenehAfter`
 *   below and rename the file in public/story/.
 */

export type StoryImage = {
    src: string;
    alt: string;
    credit: string;
};

export const STORY_IMAGES: Record<string, StoryImage> = {
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
};

/* ----- Scene 1 — The fields ----- */
export const S1 = {
    eyebrow: 'The Gambia · Today',
    line: "There are children working in The Gambia's rubbish today.",
    image: STORY_IMAGES.fieldWide,
};

/* ----- Scene 2 — The smoke ----- */
export const S2 = {
    eyebrow: 'Bakoteh · Greater Banjul',
    line: 'And the smoke never really clears.',
    images: [STORY_IMAGES.smokeRoad, STORY_IMAGES.fireActive],
    stats: [
        { label: 'Tonnes of waste arriving every day at Bakoteh', value: 460, suffix: '' },
        { label: 'Hectares of open, mostly burning dumpsite', value: 18, suffix: ' ha' },
        { label: 'Of national municipal waste left untreated', value: 90, suffix: '%' },
    ] as { label: string; value: number; suffix: string }[],
};

/* ----- Scene 3 — 15 pence a bag ----- */
export const S3 = {
    eyebrow: "What an entire day's work pays",
    line: 'A full bag of recyclable metal sells for fifteen pence.',
    quote: '"She skipped meals so her younger brothers and sisters did not go hungry."',
    image: STORY_IMAGES.boyWithSack,
};

/* ----- Scene 4 — Neneh ----- */
export const S4 = {
    eyebrow: "Neneh's Story",
    title: 'One sponsorship. One school. One whole life rewritten.',
    before: STORY_IMAGES.nenehScavenging,
    after: STORY_IMAGES.nenehAfter,
    beats: [
        'Neneh was twelve. The third of nine children.',
        'She had not been to school in four years.',
        'She worked the Bakoteh dump alongside her siblings — fifteen pence a bag.',
        'In 2015, Child Aid Gambia sponsored her into Lower Basic School.',
        'By 2017, she was scoring A grades. English became her favourite subject.',
        'Today she lives away from the dump. She never has to scavenge again.',
    ],
};

/* ----- Scene 5 — The voices ----- */
export type Testimony = {
    name: string;
    role: string;
    quote: string;
    source: string;
};

export const S5_TESTIMONIES: Testimony[] = [
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

/* ----- Scene 6 — The bridge ----- */
export const S6 = {
    eyebrow: 'But what if…',
    line: 'What if collecting it became their job — and their kids went to school?',
    sub: 'That is what mbalit is for.',
    images: [STORY_IMAGES.marketBins, STORY_IMAGES.waterTesting, STORY_IMAGES.truckOnDump],
};
