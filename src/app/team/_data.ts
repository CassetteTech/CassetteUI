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
  shortBio: string;
  fullBio: string;
  background: string;
  expertise: string[];
  social: {
    github: string;
    linkedin: string;
    twitter: string;
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
    role: "Lead Engineer",
    type: ["cofounder", "engineer"],
    image: "/images/team/matt-toppi.jpg",
    icon: Code,
    shortBio: "Co-Founder and Lead Engineer with experience building full-stack applications, leading engineering teams, and researching AI applications for enterprise software.",
    fullBio: "Matt is a Co-Founder and the Lead Engineer at Cassette Technologies, and a Software Engineer at Aras Corporation on their Advanced R&D team. He is a startup founder and software engineer who excels in leading teams and building full-stack applications from concept to deployment. He holds a Bachelor of Science in Computer Science from the University of New Hampshire. As a co-founder, Matt has been instrumental in spearheading all technology operations at Cassette.",
    background: "At Aras Corporation, Matt builds and researches AI-related projects for PLM (Product Lifecycle Management) software on the Advanced R&D team. At Cassette, he built and leads the engineering team, architected the company's full-stack platform, and has been a key driver in securing seed funding. His technical expertise is demonstrated in his hands-on development of the core REST API, which has been scaled to support over 65,000 users. His leadership experience extends to his role as Software Team Lead for the NASA Lunabotics program, where he led the development of an autonomous navigation stack for a rover, earning a first-place award at a university research conference. He is also a certified Google Project Management Professional.",
    expertise: ["Python", "C#/.NET", "SQL", "Distributed Systems", "Machine Learning", "Cloud Technologies"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:matt@cassette.tech" },
  },
  {
    name: "Brian Davies",
    role: "Head of Finance",
    type: ["cofounder", "marketer"],
    image: "/images/team/brian-davies.jpg",
    icon: Briefcase,
    shortBio: "Co-founder focused on corporate banking and company valuation, creating opportunities for entrepreneurs.",
    fullBio: "Brian is a co-founder of Cassette Technologies and a Corporate Banking Associate at Huntington National Bank. He holds a Bachelor of Science in Finance from the American University - Kogod School of Business. With a focus on corporate banking and company valuation, Brian aims to create opportunities for both new and established entrepreneurs.",
    background: "At Cassette Technologies, he successfully pitched the business concept into American University's accelerator program, led a team through a successful crowdfunding campaign, and established international business relationships. Currently works as a Corporate Banking Associate at Huntington National Bank.",
    expertise: ["Corporate Banking", "Financial Modeling", "Credit Analysis", "Company Valuation", "Entrepreneurship"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:brian@cassette.tech" },
  },
  {
    name: "Sage Duford",
    role: "Senior DevOps Engineer",
    type: "engineer",
    image: "/images/team/sage-duford.jpg",
    icon: Code,
    shortBio: "Senior DevOps Engineer passionate about coding with expertise in full-stack programming and back-end development.",
    fullBio: "Sage is a Senior DevOps Engineer at Cassette Technologies and also works as a Software Engineer at Liberty Mutual Insurance. He is a graduate of the Wentworth Institute of Technology with a bachelor's degree in Computer Science. Sage is passionate about coding and has a strong background in full-stack programming, with a particular expertise in back-end development.",
    background: "Graduate of the Wentworth Institute of Technology with a bachelor's degree in Computer Science. Currently works as a Software Engineer at Liberty Mutual Insurance while serving as Senior DevOps Engineer at Cassette Technologies.",
    expertise: ["DevOps", "Java", "Python", "Full-Stack Programming", "Back-End Development"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:sage@cassette.tech" },
  },
  {
    name: "Jenna O'Connell",
    role: "Social Media Manager",
    type: "marketer",
    image: "/images/team/jenna-oconnell.jpg",
    icon: TrendingUp,
    shortBio: "Social Media Manager specializing in creating engaging content for both B2C and B2B audiences.",
    fullBio: "Jenna is the Social Media Manager for Cassette Technologies and a Content Marketing Specialist at RoomReady. She earned her bachelor's degree in Advertising, Marketing, and Communications from the Fashion Institute of Technology. Jenna specializes in managing social media accounts and creating engaging content for both B2C and B2B audiences.",
    background: "She uses analytics to inform her strategy, focusing on boosting engagement and growing brand awareness. At Cassette Technologies, her responsibilities include designing graphics, overseeing social media activity, creating original content, and collaborating with the marketing team. Currently also works as a Content Marketing Specialist at RoomReady.",
    expertise: ["Social Media Marketing", "Content Creation", "Interpersonal Communication", "Organization", "Analytics"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:jenna@cassette.tech" },
  },
  {
    name: "Haniyah Ahsanullah",
    role: "Social Media Marketing Intern",
    type: "marketer",
    image: "/images/team/haniyah-ahsanullah.jpg",
    icon: TrendingUp,
    shortBio: "Marketing Intern supporting content creation, campaign planning, and social media management with a data-driven approach.",
    fullBio: "Haniyah is a Marketing Intern at Cassette Technologies, where she supports the marketing team through content creation, campaign planning, and social media management. She is currently pursuing a Marketing major with a Finance minor at The University of Texas at Dallas.",
    background: "Haniyah has experience in social media marketing, e-commerce, and digital content production, using analytics to guide strategy and strengthen engagement. Her background includes managing and optimizing social media channels, developing content for diverse audiences, and supporting marketing campaigns across multiple platforms.",
    expertise: ["Content Creation", "Community Engagement", "Canva & Design Tools", "Social Media Marketing", "Analytics"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:haniyah@cassette.tech" },
  },
  {
    name: "Vivian Carvalho",
    role: "Social Media Marketing Intern",
    type: "marketer",
    image: "/images/team/vivian-carvalho.jpg",
    icon: TrendingUp,
    shortBio: "Social Media Intern and content creator specializing in video editing and short-form content with expertise in community building.",
    fullBio: "Vivian is a Social Media Intern at Cassette Technologies, and also a content creator on Twitch. She works with the marketing team to create engaging social media posts and manages accounts on all platforms. She is an undergraduate senior studying Business Administration with a Marketing specialization and a Communication minor at American University.",
    background: "Vivian has been an individual content creator for several years, cultivating her own social media followings through expert video editing, short-form content creation, and community involvement. She has experience managing social media accounts with large followings, creating memorable logos and other key visuals, and collaborating with similar creators.",
    expertise: ["Video Editing", "Content Creation", "Social Media Marketing", "Graphic Design", "Adobe Premiere Pro", "Capcut", "Procreate"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:vivian@cassette.tech" },
  },
  {
    name: "Massimo Lotruglio",
    role: "Director of Marketing",
    type: "marketer",
    image: "/images/team/massimo-lotruglio.jpg",
    icon: TrendingUp,
    shortBio: "Globally-minded marketing professional with expertise in brand identity, storytelling, and team leadership.",
    fullBio: "Massimo is a globally-minded professional and a proud graduate of American University, where he studied International Studies, Journalism, and French. His academic background has fueled his passion for global engagement, problem-solving, and storytelling. As the Director of Marketing for Cassette Technologies, Massimo was instrumental in shaping the company\u2019s brand identity.",
    background: "He led the creation of marketing materials, developed and wrote biweekly newsletters, and managed a team of interns. His strategic efforts in overseeing company engagement contributed to building a combined audience of over 60,000 users. Currently, as the Assistant Director of Admissions at American University, he continues to use his strong communication and relationship-building skills to guide prospective students.",
    expertise: ["Journalism", "Marketing", "Public Speaking", "Project Management", "Brand Identity"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:massimo@cassette.tech" },
  },
  {
    name: "Tobey DiMambro",
    role: "Software Engineer",
    type: "engineer",
    image: "/images/team/tobey-dimambro.jpg",
    icon: Code,
    shortBio: "Talented engineer joining our team soon to help build the future of music sharing.",
    fullBio: "We\u2019re excited to welcome a new team member who will bring fresh perspectives and technical expertise to our engineering team. Stay tuned for more details about this amazing addition to the Cassette family.",
    background: "Details coming soon as we finalize our newest team member addition.",
    expertise: ["Software Development", "Music Technology", "Team Collaboration"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:team@cassette.tech" },
  },
  {
    name: "Mukund Kaushik",
    role: "Technical Advisor & Investor",
    type: "investor",
    image: "/images/team/mukund-kaushik.jpg",
    icon: DollarSign,
    shortBio: "Seasoned CTO and tech innovation expert with a \u2018Think Big, Act Small\u2019 philosophy, leading digital transformations at major corporations.",
    fullBio: "Mukund Kaushik is a seasoned Chief Technology Officer with a demonstrated history of achieving business success through his \u2018Think Big, Act Small\u2019 philosophy. He is an expert in technology infrastructure, strategy, innovation, and engineering. Throughout his career, Mukund has held prominent leadership positions at major corporations including Inspire, CommonSpirit Health, Southern California Edison, Kimberly-Clark, and Honda North America.",
    background: "He has a proven ability to lead digital transformations and scale technology organizations to foster growth. His industry accolades include being named a \u2018Visionary\u2019 by Consumer Goods Technology in 2017. He holds a Bachelor of Technology in Electrical Engineering from the National Institute of Technology, Kurukshetra, and has completed the Distinguished Leader Program at the University of Southern California.",
    expertise: ["Digital Transformation", "Technology Strategy", "AI & Machine Learning", "Cybersecurity", "Leadership Mentoring"],
    social: { github: "#", linkedin: "#", twitter: "#", email: "mailto:mukund@cassette.tech" },
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
