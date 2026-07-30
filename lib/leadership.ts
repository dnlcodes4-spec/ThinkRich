import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * The ThinkRich Community's executive officers, and the President's full profile.
 * Source: client roster + the written profile document, captured in CR-0010.
 *
 * Deliberately static content, not a database table: these four are not platform
 * users in these roles, the list changes roughly never, and a table would drag in
 * RLS, an admin CRUD surface, and a migration for no gain (CR-0010 §3).
 *
 * NOTE on the roster reading: the client's list places each office label on the
 * line AFTER its name. Salami (President, per his own profile) and Oluwaseun
 * (last line, "VICE PRESIDENT" trailing) both confirm that reading, so Secretary
 * and Treasurer resolve as below. Pending a one-line client confirmation.
 */

export type Officer = {
  key: string;
  /** Title carried before the name, where the client uses one. */
  honorific?: string;
  name: string;
  office: string;
  /** Two-letter monogram, shown until the portrait file exists. */
  initials: string;
  /** Primary portrait. */
  portrait: string;
  /** Second supplied image (President and Vice President only). */
  portraitAlt?: string;
  /** Short line of who they are, where we have the material to write one. */
  note?: string;
};

/*
  Portraits are normalised 4:5 head-and-shoulders crops at 1000x1250, derived from
  the client's originals (T-053; the originals stay alongside them, see the folder's
  CREDITS.md). Cropping was the substantive work: the supplied photos ranged from
  studio headshots to a full-length shot across a hall, and one carried a
  photographer's watermark, which the crop removes.

  The Vice President has only ONE usable image. The second file supplied
  (`oluwaseun.jpeg`) is a full-length event photo; a head-and-shoulders crop of it
  lands around 350px wide, too soft for any tile the section uses. Recorded in
  CR-0010 §8 for the client to replace rather than silently padded out.
*/
export const officers: Officer[] = [
  {
    key: "president",
    honorific: "Chief Amb. Dr",
    name: "Salami Saidi Oladimeji",
    office: "President",
    initials: "SO",
    portrait: "/leaders/president-1.jpg",
    portraitAlt: "/leaders/president-2.jpg",
    note: "Founder of the ThinkRich idea, and the signature on every membership card.",
  },
  {
    key: "vice-president",
    name: "Oluwaseun Omoniyi Akinbiyi",
    office: "Vice President",
    initials: "OA",
    portrait: "/leaders/vice-president.jpg",
  },
  {
    key: "secretary",
    name: "Idowu Olaitan Bolatito",
    office: "Secretary",
    initials: "IB",
    portrait: "/leaders/secretary.jpg",
  },
  {
    key: "treasurer",
    name: "Onayale Iyanuoluwa",
    office: "Treasurer",
    initials: "OI",
    portrait: "/leaders/treasurer.jpg",
  },
];

export const president = officers[0];

/** Full display name, honorific included. */
export function fullName(o: Officer) {
  return o.honorific ? `${o.honorific} ${o.name}` : o.name;
}

/**
 * The client's portraits are not in the repo yet (CR-0010, T-053). Rather than ship
 * broken <img>s, we check once on the server and fall back to a monogram. Delete this
 * and the fallback branch when `public/leaders/` is populated.
 */
export function portraitExists(src: string) {
  return existsSync(join(process.cwd(), "public", src));
}

/* ─────────────────── The President's profile (CR-0010) ─────────────────── */

/** The three credentials that carry the most weight at a glance. */
export const presidentCredentials = [
  "Eminent Peace Ambassador, IAWPA (United Nations)",
  "CEO, ThinkRich Concept International",
  'Author, "THINKRICH"',
];

export const presidentStandfirst =
  "A philosopher and solution provider who built a community around one conviction: that a person is the product of their own thoughts and actions. He leads six organizations, feeds families on live radio every week, and signs every membership card this movement issues.";

/** Short version, for the tighter candidate-facing cut on the Think-Winners landing. */
export const presidentStandfirstShort =
  "He leads six organizations across empowerment, cooperative finance, and humanitarian service, and holds the United Nations IAWPA Eminent Peace Ambassador title.";

/** The hard facts, set as a small record block on the profile page. */
export const presidentFacts = [
  { label: "Born", value: "1 December 1985" },
  { label: "From", value: "Abeokuta South, Ogun State" },
  { label: "Raised", value: "Mafoluku, Oshodi, Lagos" },
  { label: "Read", value: "B.Sc. Political Science, Olabisi Onabanjo University" },
];

/** The line his whole philosophy reduces to, quoted on the profile page. */
export const presidentCreed = "Man is a product of his thoughts and actions.";

export type ProfileSection = {
  id: string;
  heading: string;
  /** Paragraphs, in order. */
  body: string[];
};

/** The organizations he founded or leads, as a scannable register. */
export const presidentOrganizations = [
  {
    role: "Founder",
    org: "ThinkHelp International Foundation",
    body: "An NGO affiliated to the International Association of World Peace Advocates, a United Nations volunteer body. It provides food support, healthcare aid, and material assistance every month, working toward sustainable community welfare rather than one-off relief.",
  },
  {
    role: "CEO",
    org: "ThinkRich Academy",
    body: "Mentorship in positive living, mindset development, and self-empowerment, helping people grow mentally and emotionally toward personal and professional success.",
  },
  {
    role: "President",
    org: "ThinkRich Cooperative and Multi-Purpose Society",
    body: "A non-interest cooperative that teaches members the habit of saving, backs their businesses, and encourages entrepreneurship, building financial independence instead of dependency.",
  },
  {
    role: "General Overseer",
    org: "House of Thanks",
    body: "The fellowship he leads spiritually, built on gratitude and thanksgiving as the foundation of growth, and on appreciating both God and the people around you.",
  },
  {
    role: "CEO",
    org: "Food Contribution Garden",
    body: "Connects farmers directly to consumers so food stays available, affordable, and within reach, strengthening food security and healthier living in the communities it serves.",
  },
  {
    role: "National Coordinator",
    org: "Trisonet Metaverse Community, Nigeria",
    body: "A metaverse project giving children access to free schooling and offering financial support to adult members of the community.",
  },
];

export const presidentProfile: ProfileSection[] = [
  {
    id: "early-life",
    heading: "Early life",
    body: [
      "Chief (Amb.) Salami Saidi Oladimeji, known widely as Thinkrich, was born on 1 December 1985. A native of Abeokuta South Local Government Area of Ogun State, he was born and raised in Mafoluku, Oshodi, in Lagos.",
      "The sense of purpose, creativity, and leadership that would later define his work showed early.",
    ],
  },
  {
    id: "education",
    heading: "Education",
    body: [
      "He holds a B.Sc. in Political Science from Olabisi Onabanjo University. His years there sharpened his intellectual depth and set the direction of his interest in social impact and community development.",
    ],
  },
  {
    id: "philosophy",
    heading: "Philosophy",
    body: [
      'He is a philosopher and solution provider who holds firmly that "man is a product of his thoughts and actions".',
      "He is known for a positive mindset, adaptability, and leadership judgement, with a standing commitment to excellence. Patient, thoughtful, and highly structured, he works by creating stability, then progress, then drawing others toward purposeful living.",
    ],
  },
  {
    id: "career",
    heading: "Career and leadership",
    body: [
      "His career spans more than a decade in sales, marketing, and human relations, where his professionalism, diligence, and integrity earned him respect across several sectors.",
      "He is Chief Executive Officer of ThinkRich Concept International and President of ThinkRich World. His work to empower others runs through every initiative he leads, built on three pillars: mindset transformation, economic empowerment, and humanitarian service.",
    ],
  },
  {
    id: "media",
    heading: "On the radio",
    body: [
      'He presents "Food Support" on Wise FM 87.9. The programme stands between food donors and the people who need them, cutting hunger while giving sponsors visible recognition for what they contribute. It is a practical step toward a kinder and more inclusive society, broadcast every week.',
    ],
  },
  {
    id: "publications",
    heading: "Writing",
    body: [
      'He is the author of "THINKRICH: A Call to Think Only Good Things for Yourself and Others", a book that carries his philosophy in full: that people can harness their own thoughts toward success and toward harmony with others.',
    ],
  },
  {
    id: "recognition",
    heading: "Recognition",
    body: [
      "His diligence, humanitarian record, and leadership have drawn awards and honours over the years from reputable organizations, achievers' clubs, and humanitarian groups.",
      "He holds the title of Eminent Peace Ambassador for the United Nations, under the International Association of World Peace Advocates.",
    ],
  },
  {
    id: "legacy",
    heading: "Impact",
    body: [
      "His humanitarian work has brought real development to Ogun State and beyond, particularly through youth empowerment, entrepreneurial mentorship, and community projects. The service, the dedication, and the appetite for helping people continue to change lives, keep the peace, and push social progress across Nigeria.",
      "Through his programmes and his commitment to people, he continues to empower minds, lift communities, and promote peace: proof that thinking rich begins with thinking right.",
    ],
  },
];
