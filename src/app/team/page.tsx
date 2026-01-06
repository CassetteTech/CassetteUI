"use client";

import React, { useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CassetteTape, Github, Linkedin, Mail, Twitter, ChevronDown, Code, TrendingUp, DollarSign, Briefcase, Palette, Users, Zap, X, HeartHandshake, Sparkles, Rocket, Target } from "lucide-react";
import Tilt from "react-vanilla-tilt";
import Image from "next/image";
import { openKoFiSupport, KOFI_ICON_SRC } from "@/lib/ko-fi";

const teamMembers = [
  {
    name: "Matt Toppi",
    role: "Lead Engineer",
    type: ["cofounder", "engineer"],
    icon: Code,
    shortBio: "Co-Founder and Lead Engineer with experience building full-stack applications, leading engineering teams, and researching AI applications for enterprise software.",
    fullBio: "Matt is a Co-Founder and the Lead Engineer at Cassette Technologies, and a Software Engineer at Aras Corporation on their Advanced R&D team. He is a startup founder and software engineer who excels in leading teams and building full-stack applications from concept to deployment. He holds a Bachelor of Science in Computer Science from the University of New Hampshire. As a co-founder, Matt has been instrumental in spearheading all technology operations at Cassette.",
    background: "At Aras Corporation, Matt builds and researches AI-related projects for PLM (Product Lifecycle Management) software on the Advanced R&D team. At Cassette, he built and leads the engineering team, architected the company's full-stack platform, and has been a key driver in securing seed funding. His technical expertise is demonstrated in his hands-on development of the core REST API, which has been scaled to support over 65,000 users. His leadership experience extends to his role as Software Team Lead for the NASA Lunabotics program, where he led the development of an autonomous navigation stack for a rover, earning a first-place award at a university research conference. He is also a certified Google Project Management Professional.",
    expertise: ["Python", "C#/.NET", "SQL", "Distributed Systems", "Machine Learning", "Cloud Technologies"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:matt@cassette.tech"
    }
  },
  {
    name: "Brian Davies",
    role: "Head of Finance",
    type: ["cofounder", "marketer"],
    icon: Briefcase,
    shortBio: "Co-founder focused on corporate banking and company valuation, creating opportunities for entrepreneurs.",
    fullBio: "Brian is a co-founder of Cassette Technologies and a Corporate Banking Associate at Huntington National Bank. He holds a Bachelor of Science in Finance from the American University - Kogod School of Business. With a focus on corporate banking and company valuation, Brian aims to create opportunities for both new and established entrepreneurs.",
    background: "At Cassette Technologies, he successfully pitched the business concept into American University's accelerator program, led a team through a successful crowdfunding campaign, and established international business relationships. Currently works as a Corporate Banking Associate at Huntington National Bank.",
    expertise: ["Corporate Banking", "Financial Modeling", "Credit Analysis", "Company Valuation", "Entrepreneurship"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:brian@cassette.tech"
    }
  },
  {
    name: "Sage Duford",
    role: "Senior DevOps Engineer",
    type: "engineer",
    icon: Code,
    shortBio: "Senior DevOps Engineer passionate about coding with expertise in full-stack programming and back-end development.",
    fullBio: "Sage is a Senior DevOps Engineer at Cassette Technologies and also works as a Software Engineer at Liberty Mutual Insurance. He is a graduate of the Wentworth Institute of Technology with a bachelor's degree in Computer Science. Sage is passionate about coding and has a strong background in full-stack programming, with a particular expertise in back-end development.",
    background: "Graduate of the Wentworth Institute of Technology with a bachelor's degree in Computer Science. Currently works as a Software Engineer at Liberty Mutual Insurance while serving as Senior DevOps Engineer at Cassette Technologies.",
    expertise: ["DevOps", "Java", "Python", "Full-Stack Programming", "Back-End Development"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:sage@cassette.tech"
    }
  },
  {
    name: "Jenna O'Connell",
    role: "Social Media Manager",
    type: "marketer",
    icon: TrendingUp,
    shortBio: "Social Media Manager specializing in creating engaging content for both B2C and B2B audiences.",
    fullBio: "Jenna is the Social Media Manager for Cassette Technologies and a Content Marketing Specialist at RoomReady. She earned her bachelor's degree in Advertising, Marketing, and Communications from the Fashion Institute of Technology. Jenna specializes in managing social media accounts and creating engaging content for both B2C and B2B audiences.",
    background: "She uses analytics to inform her strategy, focusing on boosting engagement and growing brand awareness. At Cassette Technologies, her responsibilities include designing graphics, overseeing social media activity, creating original content, and collaborating with the marketing team. Currently also works as a Content Marketing Specialist at RoomReady.",
    expertise: ["Social Media Marketing", "Content Creation", "Interpersonal Communication", "Organization", "Analytics"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:jenna@cassette.tech"
    }
  },
  {
    name: "Haniyah Ahsanullah",
    role: "Social Media Marketing Intern",
    type: "marketer",
    icon: TrendingUp,
    shortBio: "Marketing Intern supporting content creation, campaign planning, and social media management with a data-driven approach.",
    fullBio: "Haniyah is a Marketing Intern at Cassette Technologies, where she supports the marketing team through content creation, campaign planning, and social media management. She is currently pursuing a Marketing major with a Finance minor at The University of Texas at Dallas.",
    background: "Haniyah has experience in social media marketing, e-commerce, and digital content production, using analytics to guide strategy and strengthen engagement. Her background includes managing and optimizing social media channels, developing content for diverse audiences, and supporting marketing campaigns across multiple platforms.",
    expertise: ["Content Creation", "Community Engagement", "Canva & Design Tools", "Social Media Marketing", "Analytics"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:haniyah@cassette.tech"
    }
  },
  {
    name: "Vivian Carvalho",
    role: "Social Media Marketing Intern",
    type: "marketer",
    icon: TrendingUp,
    shortBio: "Social Media Intern and content creator specializing in video editing and short-form content with expertise in community building.",
    fullBio: "Vivian is a Social Media Intern at Cassette Technologies, and also a content creator on Twitch. She works with the marketing team to create engaging social media posts and manages accounts on all platforms. She is an undergraduate senior studying Business Administration with a Marketing specialization and a Communication minor at American University.",
    background: "Vivian has been an individual content creator for several years, cultivating her own social media followings through expert video editing, short-form content creation, and community involvement. She has experience managing social media accounts with large followings, creating memorable logos and other key visuals, and collaborating with similar creators.",
    expertise: ["Video Editing", "Content Creation", "Social Media Marketing", "Graphic Design", "Adobe Premiere Pro", "Capcut", "Procreate"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:vivian@cassette.tech"
    }
  },
  {
    name: "Massimo Lotruglio",
    role: "Director of Marketing",
    type: "marketer",
    icon: TrendingUp,
    shortBio: "Globally-minded marketing professional with expertise in brand identity, storytelling, and team leadership.",
    fullBio: "Massimo is a globally-minded professional and a proud graduate of American University, where he studied International Studies, Journalism, and French. His academic background has fueled his passion for global engagement, problem-solving, and storytelling. As the Director of Marketing for Cassette Technologies, Massimo was instrumental in shaping the company's brand identity.",
    background: "He led the creation of marketing materials, developed and wrote biweekly newsletters, and managed a team of interns. His strategic efforts in overseeing company engagement contributed to building a combined audience of over 60,000 users. Currently, as the Assistant Director of Admissions at American University, he continues to use his strong communication and relationship-building skills to guide prospective students.",
    expertise: ["Journalism", "Marketing", "Public Speaking", "Project Management", "Brand Identity"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:massimo@cassette.tech"
    }
  },
  {
    name: "Tobey DiMambro",
    role: "Software Engineer",
    type: "engineer",
    icon: Code,
    shortBio: "Talented engineer joining our team soon to help build the future of music sharing.",
    fullBio: "We're excited to welcome a new team member who will bring fresh perspectives and technical expertise to our engineering team. Stay tuned for more details about this amazing addition to the Cassette family.",
    background: "Details coming soon as we finalize our newest team member addition.",
    expertise: ["Software Development", "Music Technology", "Team Collaboration"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:team@cassette.tech"
    }
  },
  {
    name: "Mukund Kaushik",
    role: "Technical Advisor & Investor",
    type: "investor",
    icon: DollarSign,
    shortBio: "Seasoned CTO and tech innovation expert with a 'Think Big, Act Small' philosophy, leading digital transformations at major corporations.",
    fullBio: "Mukund Kaushik is a seasoned Chief Technology Officer with a demonstrated history of achieving business success through his 'Think Big, Act Small' philosophy. He is an expert in technology infrastructure, strategy, innovation, and engineering. Throughout his career, Mukund has held prominent leadership positions at major corporations including Inspire, CommonSpirit Health, Southern California Edison, Kimberly-Clark, and Honda North America.",
    background: "He has a proven ability to lead digital transformations and scale technology organizations to foster growth. His industry accolades include being named a 'Visionary' by Consumer Goods Technology in 2017. He holds a Bachelor of Technology in Electrical Engineering from the National Institute of Technology, Kurukshetra, and has completed the Distinguished Leader Program at the University of Southern California.",
    expertise: ["Digital Transformation", "Technology Strategy", "AI & Machine Learning", "Cybersecurity", "Leadership Mentoring"],
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:mukund@cassette.tech"
    }
  }
];

export default function TeamPage() {
  const [expandedMember, setExpandedMember] = React.useState<string | null>(null);
  const [cardPosition, setCardPosition] = React.useState({ x: 0, y: 0, width: 0, height: 0 });

  const toggleExpanded = (memberName: string, event?: React.MouseEvent<HTMLDivElement>) => {
    if (memberName === expandedMember) {
      setExpandedMember(null);
    } else {
      // Capture the card position for animation origin
      if (event) {
        const card = (event.currentTarget as HTMLElement).closest('.team-card');
        if (card) {
          const rect = card.getBoundingClientRect();
          setCardPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height
          });
        }
      }
      setExpandedMember(memberName);
    }
  };

  const closeExpanded = () => {
    setExpandedMember(null);
  };

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && expandedMember) {
        closeExpanded();
      }
    };

    if (expandedMember) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [expandedMember]);

  type TeamCategory = 'all' | 'cofounder' | 'engineer' | 'marketer' | 'investor';
  const [activeCategory, setActiveCategory] = useState<TeamCategory>('all');

  const getTypeConfig = (type: string | string[]) => {
    // Use the first type for styling purposes
    const primaryType = Array.isArray(type) ? type[0] : type;
    switch (primaryType) {
      case 'cofounder':
        return {
          bgClass: 'from-primary to-accent',
          iconBg: 'bg-primary/10',
          iconColor: 'text-primary',
          borderColor: 'border-primary/20',
          hoverBg: 'hover:bg-primary/5',
          label: 'Co-Founders',
          icon: Rocket
        };
      case 'engineer':
        return {
          bgClass: 'from-accent to-secondary',
          iconBg: 'bg-accent/10',
          iconColor: 'text-accent',
          borderColor: 'border-accent/20',
          hoverBg: 'hover:bg-accent/5',
          label: 'Engineers',
          icon: Code
        };
      case 'marketer':
        return {
          bgClass: 'from-secondary to-primary',
          iconBg: 'bg-secondary/10',
          iconColor: 'text-secondary',
          borderColor: 'border-secondary/20',
          hoverBg: 'hover:bg-secondary/5',
          label: 'Marketing',
          icon: TrendingUp
        };
      case 'investor':
        return {
          bgClass: 'from-primary/80 to-accent/80',
          iconBg: 'bg-primary/10',
          iconColor: 'text-primary',
          borderColor: 'border-primary/20',
          hoverBg: 'hover:bg-primary/5',
          label: 'Advisors',
          icon: Target
        };
      default:
        return {
          bgClass: 'from-muted to-muted-foreground',
          iconBg: 'bg-muted/10',
          iconColor: 'text-muted-foreground',
          borderColor: 'border-border',
          hoverBg: 'hover:bg-muted/5',
          label: 'Team',
          icon: Users
        };
    }
  };

  const filteredMembers = activeCategory === 'all'
    ? teamMembers
    : teamMembers.filter(member =>
        Array.isArray(member.type)
          ? member.type.includes(activeCategory)
          : member.type === activeCategory
      );

  const countByType = (type: TeamCategory) =>
    teamMembers.filter(m =>
      Array.isArray(m.type) ? m.type.includes(type) : m.type === type
    ).length;

  const categories = [
    { id: 'all' as TeamCategory, label: 'All Team', icon: Users, count: teamMembers.length },
    { id: 'cofounder' as TeamCategory, label: 'Co-Founders', icon: Rocket, count: countByType('cofounder') },
    { id: 'engineer' as TeamCategory, label: 'Engineers', icon: Code, count: countByType('engineer') },
    { id: 'marketer' as TeamCategory, label: 'Marketing', icon: TrendingUp, count: countByType('marketer') },
    { id: 'investor' as TeamCategory, label: 'Advisors', icon: Target, count: countByType('investor') },
  ];

  return (
    <div className="min-h-screen surface-bottom relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-32"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-block mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-2xl opacity-30"></div>
              <div className="relative bg-gradient-to-r from-primary to-secondary p-5 rounded-full elev-2 bordered-glow">
                <CassetteTape className="text-foreground" size={52} />
              </div>
            </div>
          </motion.div>

          <h1 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight leading-none">
            Meet the Team Behind{" "}
            <span className="text-gradient inline-block">Cassette</span>
          </h1>
          <p className="font-roboto text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12">
            We&apos;re music obsessives, developers, and creators united by a shared mission:{" "}
            <span className="text-foreground font-medium">making music universal again</span>.
          </p>

          {/* Team Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="font-teko text-4xl sm:text-5xl font-bold text-gradient mb-1">9</div>
              <div className="font-roboto text-sm text-muted-foreground uppercase tracking-wider">Team Members</div>
            </motion.div>
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="font-teko text-4xl sm:text-5xl font-bold text-gradient mb-1">65K+</div>
              <div className="font-roboto text-sm text-muted-foreground uppercase tracking-wider">Users Served</div>
            </motion.div>
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <div className="font-teko text-4xl sm:text-5xl font-bold text-gradient mb-1">∞</div>
              <div className="font-roboto text-sm text-muted-foreground uppercase tracking-wider">Music Connections</div>
            </motion.div>
          </div>
        </motion.div>

        {/* Team Members Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-24"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full surface-middle elev-1">
              <Sparkles size={16} className="text-accent" />
              <span className="font-teko text-sm tracking-wider text-accent uppercase">The Team</span>
            </div>

            <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
              The People Making It Happen
            </h2>
            <p className="font-roboto text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Meet the passionate individuals working to make music sharing{" "}
              <span className="text-foreground font-medium">effortless for everyone</span>
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
            {categories.map((category) => {
              const CategoryIcon = category.icon;
              const isActive = activeCategory === category.id;

              return (
                <motion.button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`
                    relative px-6 py-3 rounded-full font-teko text-lg font-medium
                    transition-all duration-300 backdrop-blur-sm border
                    ${isActive
                      ? 'bg-gradient-to-r from-primary to-accent text-foreground border-transparent elev-2 scale-105'
                      : 'surface-middle text-muted-foreground border-border/40 hover:border-primary/40 hover:text-foreground hover:elev-1'
                    }
                  `}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="relative flex items-center gap-2">
                    <CategoryIcon size={18} />
                    {category.label}
                    <span className={`
                      px-2 py-0.5 rounded-full text-xs font-bold
                      ${isActive
                        ? 'bg-foreground/20 text-foreground'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {category.count}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Team Grid with AnimatePresence */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="grid md:grid-cols-2 xl:grid-cols-3 gap-8"
            >
              {filteredMembers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full text-center py-20"
                >
                  <Users className="mx-auto text-muted-foreground mb-4" size={64} />
                  <p className="font-teko text-2xl text-muted-foreground">No team members in this category</p>
                </motion.div>
              ) : (
                filteredMembers.map((member, index) => {
                  const IconComponent = member.icon;
                  const typeConfig = getTypeConfig(member.type);

                  return (
                    <motion.div
                      key={member.name}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.05 * index,
                        ease: [0.23, 1, 0.32, 1]
                      }}
                      className="team-card"
                    >
                  <Tilt
                    options={{
                      max: 15,
                      speed: 300,
                      scale: 1.02,
                      transition: true,
                      axis: null,
                      reset: true,
                      easing: "cubic-bezier(.03,.98,.52,.99)",
                      glare: true,
                      "max-glare": 0.1,
                      "glare-prerender": false,
                    }}
                    style={{ height: '100%' }}
                    className={`rounded-2xl overflow-hidden ${expandedMember ? 'pointer-events-none' : ''}`}
                  >
                    <motion.div
                      className={`gradient-border-hover surface-top backdrop-blur-sm rounded-[16px] elev-2 hover:elev-3 transition-all duration-300 group cursor-pointer h-full spotlight overflow-hidden relative`}
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      onClick={(e) => toggleExpanded(member.name, e)}
                    >
                      {/* Corner Accent */}
                      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${typeConfig.bgClass} opacity-5 group-hover:opacity-10 transition-opacity duration-500 rounded-bl-full`}></div>

                      {/* Animated gradient border on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${typeConfig.bgClass} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10`}></div>

                    <div className="p-7 h-full flex flex-col relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="relative">
                            <div className={`absolute -inset-1 bg-gradient-to-r ${typeConfig.bgClass} rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity duration-500`}></div>
                            <motion.div
                              className={`relative w-16 h-16 rounded-full flex items-center justify-center elev-1 bg-gradient-to-br ${typeConfig.bgClass} ring-2 ring-offset-2 ring-offset-card ring-transparent transition-all duration-300`}
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ duration: 0.3 }}
                            >
                              <IconComponent className="text-white" size={26} />
                            </motion.div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-teko text-2xl text-foreground font-bold leading-tight">{member.name}</h3>
                            <p className={`font-roboto font-semibold text-sm ${typeConfig.iconColor} mt-0.5`}>{member.role}</p>
                            {(Array.isArray(member.type) ? member.type.includes('cofounder') : member.type === 'cofounder') && (
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full mt-2 ${typeConfig.iconBg}`}>
                                <Briefcase size={12} className={typeConfig.iconColor} />
                                <span className={`text-xs font-medium ${typeConfig.iconColor}`}>Co-Founder</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <motion.div
                          className={`p-3 rounded-full transition-all duration-200 ${typeConfig.iconBg}`}
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                        >
                          <ChevronDown className={typeConfig.iconColor} size={20} />
                        </motion.div>
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <p className="font-roboto text-muted-foreground leading-relaxed text-base line-clamp-3 mb-5">
                          {member.shortBio}
                        </p>

                        <div className="mt-auto pt-5 border-t border-border/40">
                          <div className="text-xs text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors duration-300">
                            <ChevronDown size={14} className={typeConfig.iconColor} />
                            <span className="font-medium">Click to learn more</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    </motion.div>
                  </Tilt>
                </motion.div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Modal Overlay */}
        <AnimatePresence mode="wait">
          {expandedMember && (
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
              onClick={closeExpanded}
            >
              <motion.div
                key={`modal-${expandedMember}`}
                initial={{
                  opacity: 0,
                  scale: 0.8,
                  x: cardPosition.x - (typeof window !== 'undefined' ? window.innerWidth / 2 : 0),
                  y: cardPosition.y - (typeof window !== 'undefined' ? window.innerHeight / 2 : 0)
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  y: 0
                }}
                exit={{
                  opacity: 0,
                  scale: 0.7,
                  x: cardPosition.x - (typeof window !== 'undefined' ? window.innerWidth / 2 : 0),
                  y: cardPosition.y - (typeof window !== 'undefined' ? window.innerHeight / 2 : 0)
                }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                  duration: 0.4
                }}
                className="surface-top backdrop-blur-md border border-border/60 rounded-[18px] elev-4 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
              {(() => {
                const member = teamMembers.find(m => m.name === expandedMember);
                if (!member) return null;
                
                const IconComponent = member.icon;
                const typeConfig = getTypeConfig(member.type);
                
                return (
                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className={`absolute -inset-2 bg-gradient-to-r ${typeConfig.bgClass} rounded-full blur opacity-15`}></div>
                          <div className={`relative w-20 h-20 rounded-full flex items-center justify-center elev-2 bg-gradient-to-br ${typeConfig.bgClass}`}>
                            <IconComponent className="text-white" size={32} />
                          </div>
                        </div>
                        <div>
                          <h2 className="font-teko text-3xl text-foreground font-bold mb-2">{member.name}</h2>
                          <p className={`font-roboto font-medium text-lg ${typeConfig.iconColor}`}>{member.role}</p>
                          {(Array.isArray(member.type) ? member.type.includes('cofounder') : member.type === 'cofounder') && (
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mt-3 ${typeConfig.iconBg}`}>
                              <Briefcase size={14} className={typeConfig.iconColor} />
                              <span className={`text-sm font-medium ${typeConfig.iconColor}`}>Co-Founder</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <motion.button
                        onClick={closeExpanded}
                        className="p-3 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <X className="text-muted-foreground" size={20} />
                      </motion.button>
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-8">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <h3 className="font-teko text-xl text-foreground mb-4 flex items-center gap-2">
                          <Users size={18} className={typeConfig.iconColor} />
                          Background
                        </h3>
                        <p className="font-roboto text-muted-foreground leading-relaxed">
                          {member.fullBio}
                        </p>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                      >
                        <h3 className="font-teko text-xl text-foreground mb-4 flex items-center gap-2">
                          <Zap size={18} className={typeConfig.iconColor} />
                          Experience
                        </h3>
                        <p className="font-roboto text-muted-foreground leading-relaxed">
                          {member.background}
                        </p>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <h3 className="font-teko text-xl text-foreground mb-4 flex items-center gap-2">
                          <Palette size={18} className={typeConfig.iconColor} />
                          Expertise
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {member.expertise.map((skill, idx) => (
                            <motion.span 
                              key={skill}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2, delay: 0.25 + (idx * 0.03) }}
                              className={`px-4 py-2 text-sm rounded-full border font-medium ${typeConfig.iconBg} ${typeConfig.iconColor} ${typeConfig.borderColor}`}
                            >
                              {skill}
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                      
                      {/* Social Links */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                        className={`pt-6 border-t ${typeConfig.borderColor}`}
                      >
                        <h3 className="font-teko text-xl text-foreground mb-4">Connect</h3>
                        <div className="flex gap-4">
                          <motion.a 
                            href={member.social.github}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all duration-300 p-3 rounded-xl hover:bg-muted/50"
                            aria-label="GitHub"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2, delay: 0.35 }}
                            whileHover={{ y: -2, scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Github size={20} />
                            <span className="font-medium">GitHub</span>
                          </motion.a>
                          <motion.a
                            href={member.social.linkedin}
                            className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-all duration-300 p-3 rounded-xl hover:bg-accent/10"
                            aria-label="LinkedIn"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2, delay: 0.4 }}
                            whileHover={{ y: -2, scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Linkedin size={20} />
                            <span className="font-medium">LinkedIn</span>
                          </motion.a>
                          <motion.a
                            href={member.social.twitter}
                            className="flex items-center gap-2 text-muted-foreground hover:text-secondary transition-all duration-300 p-3 rounded-xl hover:bg-secondary/10"
                            aria-label="Twitter"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2, delay: 0.45 }}
                            whileHover={{ y: -2, scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Twitter size={20} />
                            <span className="font-medium">Twitter</span>
                          </motion.a>
                          <motion.a 
                            href={member.social.email}
                            className={`flex items-center gap-2 transition-all duration-300 p-3 rounded-xl text-muted-foreground hover:${typeConfig.iconColor.replace('text-', 'text-').replace('-500', '-600')} ${typeConfig.hoverBg}`}
                            aria-label="Email"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2, delay: 0.5 }}
                            whileHover={{ y: -2, scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Mail size={20} />
                            <span className="font-medium">Email</span>
                          </motion.a>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                );
              })()
              }
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Values Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-24"
        >
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full surface-middle elev-1">
              <Zap size={16} className="text-accent" />
              <span className="font-teko text-sm tracking-wider text-accent uppercase">Our Values</span>
            </div>

            <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
              What We Believe
            </h2>
            <p className="font-roboto text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The values that guide everything we build at{" "}
              <span className="text-gradient font-semibold">Cassette</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <Card className="gradient-border-hover surface-top backdrop-blur-sm rounded-[18px] overflow-hidden text-center h-full elev-2 hover:elev-3 transition-all duration-300 group spotlight relative">
                <CardHeader className="pb-4">
                  <div className="relative mx-auto mb-5">
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                    <div className="relative bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center elev-1 group-hover:elev-2 transition-all duration-300 bordered-glow">
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <CassetteTape className="text-primary" size={36} />
                      </motion.div>
                    </div>
                  </div>
                  <CardTitle className="font-teko text-3xl text-foreground mb-2">Music is Universal</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8">
                  <p className="font-roboto text-muted-foreground text-base leading-relaxed">
                    Great music transcends platforms. We believe everyone should be able to share their discoveries,
                    regardless of which streaming service they use.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <Card className="gradient-border-hover surface-top backdrop-blur-sm rounded-[18px] overflow-hidden text-center h-full elev-2 hover:elev-3 transition-all duration-300 group spotlight relative">
                <CardHeader className="pb-4">
                  <div className="relative mx-auto mb-5">
                    <div className="absolute -inset-2 bg-gradient-to-r from-secondary to-primary rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                    <div className="relative bg-secondary/10 w-20 h-20 rounded-full flex items-center justify-center elev-1 group-hover:elev-2 transition-all duration-300 bordered-glow">
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <CassetteTape className="text-secondary" size={36} />
                      </motion.div>
                    </div>
                  </div>
                  <CardTitle className="font-teko text-3xl text-foreground mb-2">Simplicity First</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8">
                  <p className="font-roboto text-muted-foreground text-base leading-relaxed">
                    Sharing music should be effortless. We obsess over making complex technology feel simple and intuitive
                    for everyone.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <Card className="gradient-border-hover surface-top backdrop-blur-sm rounded-[18px] overflow-hidden text-center h-full elev-2 hover:elev-3 transition-all duration-300 group spotlight relative">
                <CardHeader className="pb-4">
                  <div className="relative mx-auto mb-5">
                    <div className="absolute -inset-2 bg-gradient-to-r from-accent to-secondary rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                    <div className="relative bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center elev-1 group-hover:elev-2 transition-all duration-300 bordered-glow">
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <CassetteTape className="text-accent" size={36} />
                      </motion.div>
                    </div>
                  </div>
                  <CardTitle className="font-teko text-3xl text-foreground mb-2">Community Driven</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8">
                  <p className="font-roboto text-muted-foreground text-base leading-relaxed">
                    The best music discoveries come from passionate curators. We&apos;re building a platform where taste-makers
                    are celebrated and rewarded.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Support CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mb-24"
        >
          <div className="relative gradient-border surface-top rounded-[20px] p-8 sm:p-10 md:p-12 backdrop-blur-sm elev-2 overflow-hidden">
            {/* Decorative gradient orb */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="flex items-start gap-5">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-foreground elev-1 flex-shrink-0">
                  <HeartHandshake className="h-7 w-7" />
                </span>
                <div className="text-left">
                  <h3 className="font-teko text-3xl sm:text-4xl text-foreground mb-2 leading-tight">Support the Cassette Team</h3>
                  <p className="font-roboto text-muted-foreground text-lg max-w-xl leading-relaxed">
                    Love what we&apos;re building? Chip in on Ko-fi so we can keep bringing new sharing tools to life for our community.
                  </p>
                </div>
              </div>
              <button
                onClick={openKoFiSupport}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary to-accent text-foreground font-teko text-xl px-8 py-4 elev-2 hover:elev-3 shadow-primary/20 transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap"
                aria-label="Support Cassette on Ko-fi"
              >
                <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={24} height={24} className="rounded-full" />
                <span>Support Us</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <div className="relative gradient-border surface-top rounded-[20px] p-10 md:p-14 backdrop-blur-sm elev-2 overflow-hidden">
            {/* Mesh gradient */}
            <div className="absolute inset-0 mesh-gradient opacity-40"></div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full surface-middle elev-1">
                <Mail size={16} className="text-accent" />
                <span className="font-teko text-sm tracking-wider text-accent uppercase">Join Us</span>
              </div>

              <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
                Want to Join Us?
              </h2>
              <p className="font-roboto text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                We&apos;re always looking for passionate people who share our vision. Whether you&apos;re a developer, designer,
                or music enthusiast, we&apos;d love to hear from you.
              </p>

              <a
                href="mailto:team@cassette.com"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-accent text-foreground font-teko text-xl px-10 py-5 rounded-xl elev-2 hover:elev-3 transition-all duration-300 hover:scale-105 bordered-glow group"
              >
                <Mail size={22} className="group-hover:rotate-12 transition-transform duration-300" />
                <span>Get in Touch</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
