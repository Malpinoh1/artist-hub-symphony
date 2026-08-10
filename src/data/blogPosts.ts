/**
 * Published blog posts. Shared by the /blog listing, /blog/:slug article pages
 * and the sitemap generator, so new posts appear everywhere automatically.
 */

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string; // ISO date, publication date
  updated?: string;
  readTime: string;
  category: string;
  /** Article body — array of paragraphs and section headings. */
  body: { heading?: string; paragraphs: string[] }[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-music-distribution-works',
    title: 'How music distribution actually works for independent artists',
    excerpt:
      'From upload to store delivery and royalty reporting — a plain-English walkthrough of the release journey and where MALPINOHDISTRO fits in.',
    author: 'MALPINOHDISTRO Team',
    date: '2026-05-12',
    readTime: '6 min read',
    category: 'Distribution',
    body: [
      {
        paragraphs: [
          'Getting a song onto streaming services is a supply-chain problem. Your audio, artwork and metadata have to be packaged to strict technical standards, validated, delivered to each store, then matched back to the reports those stores send out weeks later. Independent artists rarely see that machinery — they only see the release go live, or fail.',
          'MALPINOHDISTRO is an independent distribution company that runs that pipeline on your behalf. We work with established third-party music aggregators and distribution partners to place your release with digital streaming platforms, and we handle everything around it: validation, scheduling, store selection, reporting and payouts.',
        ],
      },
      {
        heading: '1. Preparing the release',
        paragraphs: [
          'Every release starts with the essentials: final masters, cover art that meets store specifications, correct track titles and credits, featured artists, language, explicit flags and songwriter information. Metadata mistakes are the single most common reason a release is rejected or shows up wrong on a store profile.',
          'Our release wizard walks through album info, artwork, tracks and distribution preferences step by step, and asks for a release date far enough ahead that stores have time to process and consider the release for editorial placement.',
        ],
      },
      {
        heading: '2. Review and delivery',
        paragraphs: [
          'Once submitted, a release is reviewed by our distribution team before it goes out. We check audio quality, artwork compliance, spelling, rights declarations and territory choices. Anything that would trip a store rejection gets flagged back to you with a note instead of silently failing.',
          'After approval the release is delivered through our distribution partners to the stores and territories you selected. You can follow its status from your dashboard at every stage.',
        ],
      },
      {
        heading: '3. Reporting and royalties',
        paragraphs: [
          'Streaming reports arrive on a delay — typically one to three months behind the month being reported. When they arrive, we ingest them, match every line to the correct release and track, and publish the results to your dashboard as reported streams and reported earnings, alongside downloadable monthly royalty statements.',
          'Earnings accumulate in your account balance in USD. When you are ready, you request a withdrawal from the dashboard and our finance team processes it.',
        ],
      },
      {
        heading: 'What this means for you',
        paragraphs: [
          'You focus on the music and the audience. Getting the release accepted, delivered and accounted for is our job — and every number we show you comes from what the stores actually reported, not an estimate.',
        ],
      },
    ],
  },
  {
    slug: 'understanding-royalties-and-splits',
    title: 'Understanding streaming royalties, splits and statements',
    excerpt:
      'What the numbers on your earnings page mean, why reporting lags, and how royalty splits keep collaborations clean.',
    author: 'MALPINOHDISTRO Team',
    date: '2026-04-28',
    readTime: '7 min read',
    category: 'Royalties',
    body: [
      {
        paragraphs: [
          'Streaming income confuses almost every artist at first, because a "stream" is not a fixed price. What you earn per play depends on the store, the listener\'s country, whether they pay for a subscription, and how the store divides its revenue pool that month. Two tracks with identical play counts can earn very different amounts.',
        ],
      },
      {
        heading: 'Why your earnings appear late',
        paragraphs: [
          'Stores close their books monthly and send reports afterwards. That means the streams you generated this month usually surface in your statements a month or more later. A quiet earnings page in week one of a release is normal, not a bug.',
          'On MALPINOHDISTRO, reported streams and reported earnings on your dashboard are only ever populated from statements we have actually received and processed — so you can trust them for planning.',
        ],
      },
      {
        heading: 'Splits for collaborations',
        paragraphs: [
          'If a track involves a co-writer, producer or featured artist, agree the percentages before release. Our royalty splits feature lets you set a split on a release, invite the collaborator by email, and have them confirm their share. Once accepted, their portion is tracked separately as reports come in — no spreadsheets, no awkward reconciliations later.',
        ],
      },
      {
        heading: 'Reading your statement',
        paragraphs: [
          'Monthly royalty statements are downloadable as branded PDFs from your earnings page. Each one breaks earnings down so you can see which releases and periods contributed to your balance, which is exactly the documentation you want when a manager, label or accountant asks questions.',
        ],
      },
    ],
  },
  {
    slug: 'release-checklist-before-you-submit',
    title: 'The release checklist to run before you hit submit',
    excerpt:
      'A practical pre-flight list — artwork, metadata, timing, stores and rights — that prevents most store rejections and delays.',
    author: 'MALPINOHDISTRO Team',
    date: '2026-04-09',
    readTime: '5 min read',
    category: 'Guides',
    body: [
      {
        paragraphs: [
          'Most delayed releases are not delayed by stores. They are delayed by small, fixable problems in the submission. Run this list before you submit and you will avoid nearly all of them.',
        ],
      },
      {
        heading: 'Audio and artwork',
        paragraphs: [
          'Upload the final master, not a rough mix or a version with a producer tag you intend to remove. Cover art must be square, high resolution, free of URLs, social handles, prices or logos you do not own, and must not contain imagery you have no licence for.',
        ],
      },
      {
        heading: 'Metadata',
        paragraphs: [
          'Write the artist name exactly as it appears on your existing store profiles so the release lands on the right profile. Put features in the featured-artist field rather than baking them into the title. Mark explicit tracks honestly. Double-check spelling — corrections after delivery take time to propagate.',
        ],
      },
      {
        heading: 'Timing and stores',
        paragraphs: [
          'Choose a release date with a comfortable lead time. Early submission gives stores room to process the delivery and gives you a window to plan pre-save and pitch activity. Then confirm your store and territory selections match your promotion plan.',
        ],
      },
      {
        heading: 'Rights',
        paragraphs: [
          'Confirm you control everything in the recording: composition, samples, interpolations and any guest performance. Uncleared samples are the fastest route to a takedown. If a collaborator is owed a share, set the royalty split before release rather than after.',
        ],
      },
    ],
  },
  {
    slug: 'growing-an-audience-after-release-day',
    title: 'Growing an audience after release day',
    excerpt:
      'Release day is the start, not the finish. How to use your analytics, catalogue and platform profiles to keep momentum.',
    author: 'MALPINOHDISTRO Team',
    date: '2026-03-22',
    readTime: '6 min read',
    category: 'Growth',
    body: [
      {
        paragraphs: [
          'The first 48 hours matter, but careers are built in the months after. The artists who compound growth treat every release as an entry point into a catalogue rather than a one-off event.',
        ],
      },
      {
        heading: 'Read your own data',
        paragraphs: [
          'Your dashboard shows reported streams by month, your top tracks and your best-performing releases. Use it to answer concrete questions: which song actually pulls listeners in, which release keeps earning long after launch, and which month a push made a measurable difference. Then repeat what worked.',
        ],
      },
      {
        heading: 'Claim your platform profiles',
        paragraphs: [
          'Verified artist profiles change how listeners and platforms treat you. Our Artist Hub walks you through requesting a YouTube Official Artist Channel and getting certified on TikTok, so your catalogue is grouped correctly and you control how your artist page looks.',
        ],
      },
      {
        heading: 'Release consistently',
        paragraphs: [
          'A steady release cadence gives you repeated opportunities to be discovered and gives recommendation systems fresh signals to work with. Plan several releases ahead instead of improvising each one, and let each drop point listeners back to the last.',
        ],
      },
      {
        heading: 'Celebrate the milestones',
        paragraphs: [
          'Streaming milestones are proof of momentum and great social content. As your reported streams cross each threshold, MALPINOHDISTRO unlocks a milestone achievement and generates a shareable promo card you can post to stories and feeds.',
        ],
      },
    ],
  },
];

export const getPostBySlug = (slug: string) => blogPosts.find((p) => p.slug === slug);
