"use client";

import React from "react";

import { motion, AnimatePresence } from "framer-motion";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CassetteTape, Github, Linkedin, Mail, Twitter, ChevronDown, Code, TrendingUp, DollarSign, Briefcase, Palette, Users, Zap, X } from "lucide-react";
import Tilt from "react-vanilla-tilt";

const teamMembers = [
  {
    name: "Matt Toppi",
    role: "Lead Engineer",
    type: "cofounder",
    icon: Code,
    shortBio: "Co-Founder and Lead Engineer with over three years of experience building full-stack applications and leading engineering teams from concept to deployment.",
    fullBio: "Matt is a Co-Founder and the Lead Engineer at Cassette Technologies. With over three years of experience, he is a startup founder and software engineer who excels in leading teams and building full-stack applications from concept to deployment. He holds a Bachelor of Science in Computer Science from the University of New Hampshire. As a co-founder, Matt has been instrumental in spearheading all technology operations.",
    background: "He built and leads the engineering team, architected the company's full-stack platform, and has been a key driver in securing seed funding. His technical expertise is demonstrated in his hands-on development of the core REST API, which has been scaled to support over 65,000 users. His leadership experience extends to his role as Software Team Lead for the NASA Lunabotics program, where he led the development of an autonomous navigation stack for a rover, earning a first-place award at a university research conference. He is also a certified Google Project Management Professional.",
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
    type: "cofounder",
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

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'cofounder':
        return {
          bgClass: 'from-red-500 to-pink-500',
          iconBg: 'bg-red-500/10',
          iconColor: 'text-red-500',
          borderColor: 'border-red-500/20',
          hoverBg: 'hover:bg-red-500/5'
        };
      case 'engineer':
        return {
          bgClass: 'from-blue-500 to-cyan-500',
          iconBg: 'bg-blue-500/10',
          iconColor: 'text-blue-500',
          borderColor: 'border-blue-500/20',
          hoverBg: 'hover:bg-blue-500/5'
        };
      case 'marketer':
        return {
          bgClass: 'from-green-500 to-emerald-500',
          iconBg: 'bg-green-500/10',
          iconColor: 'text-green-500',
          borderColor: 'border-green-500/20',
          hoverBg: 'hover:bg-green-500/5'
        };
      case 'investor':
        return {
          bgClass: 'from-yellow-500 to-orange-500',
          iconBg: 'bg-yellow-500/10',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-500/20',
          hoverBg: 'hover:bg-yellow-500/5'
        };
      default:
        return {
          bgClass: 'from-gray-500 to-gray-600',
          iconBg: 'bg-gray-500/10',
          iconColor: 'text-gray-500',
          borderColor: 'border-gray-500/20',
          hoverBg: 'hover:bg-gray-500/5'
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Floating Cassettes with enhanced styling */}
      <div className="absolute top-20 left-10 opacity-30">
        <motion.div
          initial={{ rotate: 0, scale: 0.8 }}
          animate={{ rotate: 12, scale: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        >
          <CassetteTape className="text-primary drop-shadow-lg" size={48} />
        </motion.div>
      </div>
      <div className="absolute bottom-40 right-16 opacity-20">
        <motion.div
          initial={{ rotate: 0, scale: 0.9 }}
          animate={{ rotate: -6, scale: 1.1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
        >
          <CassetteTape className="text-accent drop-shadow-lg" size={64} />
        </motion.div>
      </div>
      
      {/* Additional floating elements */}
      <div className="absolute top-1/3 right-1/4 opacity-10">
        <div className="w-32 h-32 bg-gradient-to-r from-primary to-accent rounded-full blur-xl"></div>
      </div>
      <div className="absolute bottom-1/3 left-1/4 opacity-10">
        <div className="w-24 h-24 bg-gradient-to-r from-accent to-primary rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-block mb-6"
          >
            <div className="bg-gradient-to-r from-primary to-secondary p-4 rounded-full shadow-lg">
              <CassetteTape className="text-foreground" size={48} />
            </div>
          </motion.div>
          
          <h1 className="font-teko text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-wide">
            Meet the Team Behind <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Cassette</span>
          </h1>
          <p className="font-roboto text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto">
            We&apos;re music obsessives, developers, and creators united by a shared mission: making music universal again.
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-20"
        >
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-border/30 rounded-3xl p-8 md:p-12 backdrop-blur-sm shadow-xl">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Our Mission
              </h2>
              <p className="font-roboto text-lg text-muted-foreground leading-relaxed">
                Every day, millions of music lovers face the same frustration: sharing their passion across different streaming platforms. 
                We believe music should connect people, not divide them. That&apos;s why we built Cassette—to tear down the walls between 
                streaming services and create a world where your taste can be shared anywhere, anytime.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Team Members Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-20"
        >
          <div className="text-center mb-16">
            <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-4">
              The People Making It Happen
            </h2>
            <p className="font-roboto text-muted-foreground max-w-2xl mx-auto">
              Meet the passionate individuals working to make music sharing effortless for everyone
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teamMembers.map((member, index) => {
              const IconComponent = member.icon;
              const typeConfig = getTypeConfig(member.type);
              
              return (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.05 * index, ease: "easeOut" }}
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
                      className={`bg-card/80 backdrop-blur-sm border rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer h-full ${typeConfig.borderColor}`}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      onClick={(e) => toggleExpanded(member.name, e)}
                    >
                    <div className="p-6 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="relative">
                            <div className={`absolute -inset-1 bg-gradient-to-r ${typeConfig.bgClass} rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity duration-500`}></div>
                            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${typeConfig.bgClass}`}>
                              <IconComponent className="text-white" size={24} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-teko text-xl text-foreground font-bold">{member.name}</h3>
                            <p className={`font-roboto font-medium text-sm ${typeConfig.iconColor}`}>{member.role}</p>
                            {member.type === 'cofounder' && (
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
                        <p className="font-roboto text-muted-foreground leading-relaxed text-sm line-clamp-3">
                          {member.shortBio}
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-border/30">
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Click to learn more</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    </motion.div>
                  </Tilt>
                </motion.div>
              );
            })}
          </div>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                className="bg-card/95 backdrop-blur-md border border-border/50 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
                          <div className={`absolute -inset-2 bg-gradient-to-r ${typeConfig.bgClass} rounded-full blur opacity-20`}></div>
                          <div className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${typeConfig.bgClass}`}>
                            <IconComponent className="text-white" size={32} />
                          </div>
                        </div>
                        <div>
                          <h2 className="font-teko text-3xl text-foreground font-bold mb-2">{member.name}</h2>
                          <p className={`font-roboto font-medium text-lg ${typeConfig.iconColor}`}>{member.role}</p>
                          {member.type === 'cofounder' && (
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
                            className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 transition-all duration-300 p-3 rounded-xl hover:bg-blue-50/10"
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
                            className="flex items-center gap-2 text-muted-foreground hover:text-sky-500 transition-all duration-300 p-3 rounded-xl hover:bg-sky-50/10"
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
          className="mb-20"
        >
          <div className="text-center mb-16">
            <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-4">
              What We Believe
            </h2>
            <p className="font-roboto text-muted-foreground max-w-2xl mx-auto">
              The values that guide everything we build at Cassette
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden text-center h-full shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardHeader>
                  <div className="relative mx-auto mb-4">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <CassetteTape className="text-primary" size={32} />
                      </motion.div>
                    </div>
                  </div>
                  <CardTitle className="font-teko text-2xl text-foreground">Music is Universal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-roboto text-muted-foreground">
                    Great music transcends platforms. We believe everyone should be able to share their discoveries, 
                    regardless of which streaming service they use.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden text-center h-full shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardHeader>
                  <div className="relative mx-auto mb-4">
                    <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-primary rounded-full blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <CassetteTape className="text-secondary" size={32} />
                      </motion.div>
                    </div>
                  </div>
                  <CardTitle className="font-teko text-2xl text-foreground">Simplicity First</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-roboto text-muted-foreground">
                    Sharing music should be effortless. We obsess over making complex technology feel simple and intuitive 
                    for everyone.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden text-center h-full shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardHeader>
                  <div className="relative mx-auto mb-4">
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent to-secondary rounded-full blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <CassetteTape className="text-accent" size={32} />
                      </motion.div>
                    </div>
                  </div>
                  <CardTitle className="font-teko text-2xl text-foreground">Community Driven</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-roboto text-muted-foreground">
                    The best music discoveries come from passionate curators. We&apos;re building a platform where taste-makers 
                    are celebrated and rewarded.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-border/30 rounded-3xl p-8 md:p-12 backdrop-blur-sm shadow-xl">
            <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Want to Join Us?
            </h2>
            <p className="font-roboto text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              We&apos;re always looking for passionate people who share our vision. Whether you&apos;re a developer, designer, 
              or music enthusiast, we&apos;d love to hear from you.
            </p>
            <a 
              href="mailto:team@cassette.com"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-foreground font-teko text-lg px-8 py-4 rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all duration-300"
            >
              <Mail size={20} />
              Get in Touch
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}