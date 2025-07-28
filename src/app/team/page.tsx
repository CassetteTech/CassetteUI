"use client";

import { motion } from "framer-motion";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CassetteTape, Github, Linkedin, Mail, Twitter } from "lucide-react";

const teamMembers = [
  {
    name: "Team Member 1",
    role: "Lead Developer",
    bio: "Passionate about creating seamless music experiences and breaking down streaming barriers.",
    image: "/images/team-placeholder.jpg", // You can replace with actual team photos
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#",
      email: "mailto:team@cassette.com"
    }
  },
  {
    name: "Team Member 2", 
    role: "Product Designer",
    bio: "Focused on crafting beautiful, intuitive interfaces that make music sharing effortless.",
    image: "/images/team-placeholder.jpg",
    social: {
      github: "#",
      linkedin: "#", 
      twitter: "#",
      email: "mailto:team@cassette.com"
    }
  },
  {
    name: "Team Member 3",
    role: "Marketing Lead", 
    bio: "Building community around music discovery and helping artists connect with their audience.",
    image: "/images/team-placeholder.jpg",
    social: {
      github: "#",
      linkedin: "#",
      twitter: "#", 
      email: "mailto:team@cassette.com"
    }
  }
];

export default function TeamPage() {
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 * index }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden h-full shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <CardHeader className="text-center pb-4">
                    <div className="relative mx-auto mb-4">
                      <div className="absolute -inset-2 bg-gradient-to-r from-primary to-accent rounded-full blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
                        <CassetteTape className="text-foreground drop-shadow-sm" size={32} />
                      </div>
                    </div>
                    <CardTitle className="font-teko text-2xl text-foreground">{member.name}</CardTitle>
                    <p className="font-roboto text-primary font-medium">{member.role}</p>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="font-roboto text-muted-foreground mb-6 leading-relaxed">
                      {member.bio}
                    </p>
                    
                    {/* Social Links with platform-specific styling */}
                    <div className="flex justify-center gap-3">
                      <motion.a 
                        href={member.social.github}
                        className="text-muted-foreground hover:text-foreground transition-all duration-300 p-3 rounded-full hover:bg-card hover:shadow-lg hover:scale-110 border border-border/50"
                        aria-label="GitHub"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Github size={18} />
                      </motion.a>
                      <motion.a 
                        href={member.social.linkedin}
                        className="text-muted-foreground hover:text-blue-600 transition-all duration-300 p-3 rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:shadow-lg hover:scale-110 border border-border/50"
                        aria-label="LinkedIn"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Linkedin size={18} />
                      </motion.a>
                      <motion.a 
                        href={member.social.twitter}
                        className="text-muted-foreground hover:text-sky-500 transition-all duration-300 p-3 rounded-full hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:shadow-lg hover:scale-110 border border-border/50"
                        aria-label="Twitter"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Twitter size={18} />
                      </motion.a>
                      <motion.a 
                        href={member.social.email}
                        className="text-muted-foreground hover:text-primary transition-all duration-300 p-3 rounded-full hover:bg-primary/10 hover:shadow-lg hover:scale-110 border border-border/50"
                        aria-label="Email"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Mail size={18} />
                      </motion.a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

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