import {
  Code,
  TrendingUp,
  DollarSign,
  Briefcase,
  Users,
  Rocket,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TeamCategory = "all" | "cofounder" | "engineer" | "marketer" | "investor";

export interface TeamMember {
  name: string;
  role: string;
  type: string | string[];
  image: string;
  icon: LucideIcon;
  fullBio: string;
  background: string;
  experience?: string;
  expertise: string[];
  social: {
    github: string;
    linkedin: string;
    twitter: string;
    website?: string;
    websiteLabel?: string;
    email: string;
  };
}

export interface TypeConfig {
  color: string;        // Tailwind color token (e.g. "primary", "info", "accentRoyal")
  iconBg: string;
  iconColor: string;
  borderColor: string;
  accentBar: string;    // bg class for accent bars
  borderLeft: string;   // border-l class for editorial card borders
  numberColor: string;  // text class for editorial numbers
  label: string;
  icon: LucideIcon;
}

export const teamMembers: TeamMember[] = [
  {
    name: "Matt Toppi",
    role: "Co-Founder & Lead Engineer",
    type: ["cofounder", "engineer"],
    image: "/images/team/matt-toppi.jpg",
    icon: Code,
    fullBio: "Matt is a Co-Founder at Cassette Technologies and a Software Engineer at Aras Labs, the Advanced R&D division of Aras Corporation, a Product Lifecycle Management (PLM) software company. He is a software engineer specializing in AI, backend, and full-stack systems, with experience shipping production software across enterprise R&D and founder-led environments. He holds a Bachelor of Science in Computer Science from the University of New Hampshire. At Cassette, he serves as the technical lead, architecting and shipping the platform end to end.",
    background: "At his day job, Matt leads R&D for AI companion applications supporting ECAD and MCAD engineering workflows within the company's PLM platform, with emphasis on version-aware collaboration and multi-agent workflow support. His work was presented by the company CTO at ACE 2026 to representatives from 200+ companies, and he has also contributed to published AI research. This experience positions him well to bridge deep technical execution with early-stage product building. At Cassette Technologies, Matt architected and shipped a multi-service music platform across Next.js, .NET, PostgreSQL, and AWS Lambda, enabling cross-platform conversion of tracks, albums, artists, and playlists across major streaming services. He designed the core conversion pipeline and data model, owns the main .NET API and Next.js frontend, and has a proven track record of launching multi-tenant SaaS platforms serving paying customers.",
    experience: undefined,
    expertise: ["Technical Leadership", "AI Product Development", "Platform Architecture", "Full-Stack Product Delivery", "SaaS Engineering"],
    social: { github: "#", linkedin: "https://www.linkedin.com/in/matttoppi/", twitter: "#", email: "mailto:matt@cassette.tech" },
  },
  {
    name: "Brian Davies",
    role: "Co-Founder & Head of Finance",
    type: ["cofounder", "marketer"],
    image: "/images/team/brian-davies.jpg",
    icon: Briefcase,
    fullBio: "Brian is a Co-Founder at Cassette Technologies and a Leveraged Finance Associate at Huntington National Bank. He is a startup founder and finance professional specializing in structuring and scaling early-stage ventures, with a focus on operational strategy and business development. He holds a Bachelor's degree in Finance from American University's Kogod School of Business with a specialization in entrepreneurship. At Cassette, he plays a central role in shaping and pitching the company's value proposition.",
    background: "At his day job, Brian works on the Leveraged Finance Execution Team, where he focuses on leveraged buyouts and other debt placements for private equity clients. In this role, he originates and executes new business, gaining exposure to private market deals and investment proposals for complex financial transactions. This experience positions him well for early-stage venture funding and operational scaling, bridging his finance expertise with his entrepreneurial ambitions. At Cassette Technologies, Brian has successfully pitched the business concept into American University's Veloric Center for Entrepreneurship, led a team through a successful crowdfunding campaign, and onboarded angel investors. He has established strategic relationships with professionals both domestically and internationally, while building an online brand with a community of nearly 100,000 members.",
    expertise: ["Business Development", "Company Valuation", "Venture Fundraising", "Office Suites"],
    social: { github: "#", linkedin: "https://www.linkedin.com/in/brian-davies-01787618b/", twitter: "#", email: "mailto:brian@cassette.tech" },
  },
  {
    name: "Sage Duford",
    role: "Senior DevOps Engineer",
    type: "engineer",
    image: "/images/team/sage-duford.jpg",
    icon: Code,
    fullBio: "Sage is a Senior DevOps Engineer at Cassette Technologies and also works as a Software Engineer at Liberty Mutual Insurance. He is a graduate of the Wentworth Institute of Technology with a bachelor's degree in Computer Science. Sage is passionate about coding and has a strong background in full-stack programming, with a particular expertise in back-end development.",
    background: "Graduate of the Wentworth Institute of Technology with a bachelor's degree in Computer Science. Currently works as a Software Engineer at Liberty Mutual Insurance while serving as Senior DevOps Engineer at Cassette Technologies.",
    expertise: ["DevOps", "Java", "Python", "Full-Stack Programming", "Back-End Development"],
    social: { github: "#", linkedin: "https://www.linkedin.com/in/sageduford/?skipRedirect=true", twitter: "#", email: "mailto:sage@cassette.tech" },
  },
  {
    name: "Jenna O'Connell",
    role: "Social Media Advisor",
    type: "investor",
    image: "/images/team/jenna-oconnell.jpg",
    icon: TrendingUp,
    fullBio: "Jenna is a Social Media Advisor to Cassette Technologies and a Content Marketing Specialist at RoomReady. She earned her bachelor's degree in Advertising, Marketing, and Communications from the Fashion Institute of Technology. Jenna specializes in managing social media accounts and creating engaging content for both B2C and B2B audiences.",
    background: "She uses analytics to inform her strategy, focusing on boosting engagement and growing brand awareness. At Cassette Technologies, she has supported social media strategy, designed graphics, created original content, and collaborated with the broader marketing effort. She currently works as a Content Marketing Specialist at RoomReady.",
    expertise: ["Social Media Marketing", "Content Creation", "Interpersonal Communication", "Organization", "Analytics"],
    social: { github: "#", linkedin: "https://www.linkedin.com/in/jenna-o-connell/", twitter: "#", email: "mailto:jenna@cassette.tech" },
  },
  {
    name: "Vivian Carvalho",
    role: "Social Media Manager",
    type: "marketer",
    image: "/images/team/vivyin.jpeg",
    icon: TrendingUp,
    fullBio: "Vivian is the Social Media Manager at Cassette Technologies and also a content creator on Twitch. She works across Cassette's social channels to create engaging content and manage accounts across platforms. She is an undergraduate senior studying Business Administration with a Marketing specialization and a Communication minor at American University.",
    background: "Vivian has been an individual content creator for several years, cultivating her own social media followings through expert video editing, short-form content creation, and community involvement. She has experience managing social media accounts with large followings, creating memorable logos and other key visuals, and collaborating with similar creators.",
    expertise: ["Video Editing", "Content Creation", "Social Media Marketing", "Graphic Design", "Adobe Premiere Pro", "Capcut", "Procreate"],
    social: {
      github: "#",
      linkedin: "https://www.linkedin.com/in/vivian-carvalho-ba872a2b2/",
      twitter: "#",
      website: "https://linktr.ee/vivyin",
      websiteLabel: "Linktree",
      email: "mailto:vivian@cassette.tech",
    },
  },
  {
    name: "Massimo Lotruglio",
    role: "Marketing Advisor",
    type: "investor",
    image: "/images/team/massimo-lotruglio.jpg",
    icon: TrendingUp,
    fullBio: "Massimo is a Marketing Advisor to Cassette Technologies and a globally-minded professional who studied International Studies, Journalism, and French at American University. His academic background has fueled his passion for global engagement, problem-solving, and storytelling. At Cassette, he helped shape the company\u2019s brand identity and marketing voice.",
    background: "He led the creation of marketing materials, developed and wrote biweekly newsletters, and managed a team of interns. His strategic efforts in overseeing company engagement contributed to building a combined audience of over 60,000 users. Currently, as the Assistant Director of Admissions at American University, he continues to use his communication and relationship-building skills to guide prospective students.",
    expertise: ["Journalism", "Marketing", "Public Speaking", "Project Management", "Brand Identity"],
    social: { github: "#", linkedin: "https://www.linkedin.com/in/massimo-lotruglio/", twitter: "#", email: "mailto:massimo@cassette.tech" },
  },
  {
    name: "Tobey DiMambro",
    role: "Software Engineer",
    type: "engineer",
    image: "/images/team/tobey-dimambro.jpg",
    icon: Code,
    fullBio: "Tobey is a Software Engineer at Cassette Technologies with a background in computer science and applied data work. He brings experience across software development, analytics, and backend-oriented problem solving, with a focus on building reliable systems and practical product functionality.",
    background: "He studied Computer Science at the University of New Hampshire, where he contributed to applied research projects including NextStep HealthTech Data Analysis. At Cassette, Tobey supports engineering efforts across the product platform and helps build the technical foundation behind the company\u2019s music-sharing tools.",
    expertise: ["Software Development", "Music Technology", "Team Collaboration"],
    social: { github: "#", linkedin: "https://www.linkedin.com/in/tobey-dimambro/", twitter: "#", email: "mailto:team@cassette.tech" },
  },
  {
    name: "Mukund Kaushik",
    role: "Technical Advisor & Investor",
    type: "investor",
    image: "/images/team/mukund-kaushik.jpg",
    icon: DollarSign,
    fullBio: "Mukund Kaushik is a seasoned Chief Technology Officer with a demonstrated history of achieving business success through his \u2018Think Big, Act Small\u2019 philosophy. He is an expert in technology infrastructure, strategy, innovation, and engineering. Throughout his career, Mukund has held prominent leadership positions at major corporations including Inspire, CommonSpirit Health, Southern California Edison, Kimberly-Clark, and Honda North America.",
    background: "He has a proven ability to lead digital transformations and scale technology organizations to foster growth. His industry accolades include being named a \u2018Visionary\u2019 by Consumer Goods Technology in 2017. He holds a Bachelor of Technology in Electrical Engineering from the National Institute of Technology, Kurukshetra, and has completed the Distinguished Leader Program at the University of Southern California.",
    expertise: ["Digital Transformation", "Technology Strategy", "AI & Machine Learning", "Cybersecurity", "Leadership Mentoring"],
    social: { github: "#", linkedin: "https://www.linkedin.com/in/mukundkaushik/", twitter: "#", email: "mailto:mukund@cassette.tech" },
  },
];

export function getTypeConfig(type: string | string[]): TypeConfig {
  const primaryType = Array.isArray(type) ? type[0] : type;
  switch (primaryType) {
    case "cofounder":
      return { color: "primary", iconBg: "bg-primary/10", iconColor: "text-primary", borderColor: "border-primary/20", accentBar: "bg-primary", borderLeft: "border-l-primary", numberColor: "text-primary/25", label: "Co-Founder", icon: Rocket };
    case "engineer":
      return { color: "info", iconBg: "bg-info/10", iconColor: "text-info-text", borderColor: "border-info/20", accentBar: "bg-info", borderLeft: "border-l-info", numberColor: "text-info-text/25", label: "Engineer", icon: Code };
    case "marketer":
      return { color: "accentRoyal", iconBg: "bg-accentRoyal/10", iconColor: "text-accentRoyal", borderColor: "border-accentRoyal/20", accentBar: "bg-accentRoyal", borderLeft: "border-l-accentRoyal", numberColor: "text-accentRoyal/25", label: "Marketing", icon: TrendingUp };
    case "investor":
      return { color: "warning", iconBg: "bg-warning/10", iconColor: "text-warning", borderColor: "border-warning/20", accentBar: "bg-warning", borderLeft: "border-l-warning", numberColor: "text-warning/25", label: "Advisor", icon: Target };
    default:
      return { color: "muted", iconBg: "bg-muted/10", iconColor: "text-muted-foreground", borderColor: "border-border", accentBar: "bg-muted", borderLeft: "border-l-muted", numberColor: "text-muted-foreground/25", label: "Team", icon: Users };
  }
}

// Color classes for category filter tabs
export const categoryColors: Record<TeamCategory, { activeBg: string; activeBorder: string; countBg: string }> = {
  all:       { activeBg: "bg-foreground text-background", activeBorder: "border-foreground", countBg: "bg-background/20 text-background" },
  cofounder: { activeBg: "bg-primary text-primary-foreground", activeBorder: "border-primary", countBg: "bg-primary-foreground/20 text-primary-foreground" },
  engineer:  { activeBg: "bg-info text-info-foreground", activeBorder: "border-info", countBg: "bg-info-foreground/20 text-info-foreground" },
  marketer:  { activeBg: "bg-accentRoyal text-accentRoyal-foreground", activeBorder: "border-accentRoyal", countBg: "bg-accentRoyal-foreground/20 text-accentRoyal-foreground" },
  investor:  { activeBg: "bg-warning text-foreground", activeBorder: "border-warning", countBg: "bg-foreground/15 text-foreground" },
};

export const categoryDefs: { id: TeamCategory; label: string; count: number }[] = [
  { id: "all", label: "All Team", count: teamMembers.length },
  { id: "cofounder", label: "Co-Founders", count: teamMembers.filter(m => (Array.isArray(m.type) ? m.type.includes("cofounder") : m.type === "cofounder")).length },
  { id: "engineer", label: "Engineers", count: teamMembers.filter(m => (Array.isArray(m.type) ? m.type.includes("engineer") : m.type === "engineer")).length },
  { id: "marketer", label: "Marketing", count: teamMembers.filter(m => (Array.isArray(m.type) ? m.type.includes("marketer") : m.type === "marketer")).length },
  { id: "investor", label: "Advisors", count: teamMembers.filter(m => (Array.isArray(m.type) ? m.type.includes("investor") : m.type === "investor")).length },
];

export function getFilteredMembers(category: TeamCategory): TeamMember[] {
  if (category === "all") return teamMembers;
  return teamMembers.filter(m =>
    Array.isArray(m.type) ? m.type.includes(category) : m.type === category
  );
}
