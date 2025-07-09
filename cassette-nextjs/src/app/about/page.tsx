"use client";

import { motion } from "framer-motion";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, CassetteTape, Link as LinkIcon, Music2, Radio, UserSquare, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1F2327] to-[#0c0d0f] relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Floating Cassettes */}
      <div className="absolute top-20 left-10 opacity-30">
        <CassetteTape className="text-primary rotate-12" size={48} />
      </div>
      <div className="absolute bottom-40 right-16 opacity-20">
        <CassetteTape className="text-secondary -rotate-6" size={64} />
      </div>
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
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
              <CassetteTape className="text-white" size={48} />
            </div>
          </motion.div>
          
          <h1 className="font-teko text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-wide">
            Your Music <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Belongs Everywhere</span>.
          </h1>
          <p className="font-roboto text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto">
            Cassette is the universal translator for your taste, connecting you and your friends, no matter how you listen.
          </p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-1">
              <div className="bg-gray-900/80 rounded-xl p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-left">
                    <h3 className="font-teko text-xl text-white mb-2">Universal Music Link</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <p className="font-roboto text-gray-300">Spotify → Apple Music → YouTube Music</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-primary to-secondary p-0.5 rounded-lg">
                    <Button asChild className="font-teko text-lg bg-gray-900 hover:bg-gray-800">
                      <Link href="#">
                        Create Your Link
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Story Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-24"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-secondary/10 rounded-full blur-xl"></div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm">
                <h2 className="font-teko text-3xl sm:text-4xl font-bold text-white mb-6">
                  The Story Behind Cassette
                </h2>
                <div className="space-y-4 font-roboto text-lg text-gray-300">
                  <p className="border-l-2 border-primary pl-4 py-1">
                    You craft the perfect playlist—immaculate flow, hidden gems. You share it excitedly... only to hear: <span className="text-secondary">&quot;Sorry, I use Apple Music.&quot;</span>
                  </p>
                  <p>
                    Music should be universal, but streaming services create digital walls. Sharing discoveries shouldn&apos;t be a chore—it should spark joy.
                  </p>
                  <p>
                    <span className="font-semibold text-white">Cassette was born from this frustration.</span> We&apos;re developers, marketers, and music obsessives who believe your taste deserves to be shared.
                  </p>
                </div>
              </div>
            </div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-lg opacity-30"></div>
                <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl p-8 h-full flex flex-col items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-700/30 rounded-lg w-16 h-16 flex items-center justify-center">
                        <UserSquare className="text-primary" size={24} />
                      </div>
                    ))}
                  </div>
                  <h3 className="font-teko text-2xl text-white mb-2">The Cassette Crew</h3>
                  <p className="font-roboto text-gray-400 text-center">Music-obsessed team breaking down streaming barriers</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-24"
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full mb-4">
              <Zap className="text-primary" size={20} />
              <span className="font-teko text-primary text-lg">WHAT WE DO TODAY</span>
            </div>
            <h2 className="font-teko text-3xl sm:text-4xl font-bold text-white mb-4">
              Unify Your Music Experience
            </h2>
            <p className="font-roboto text-gray-300">
              Break down walls between streaming platforms with Cassette&apos;s powerful tools
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gradient-to-b from-gray-800/50 to-gray-900/80 border border-gray-700/50 rounded-2xl overflow-hidden">
                <CardHeader>
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <LinkIcon className="text-primary" size={24} />
                  </div>
                  <CardTitle className="font-teko text-2xl text-white">Universal Music Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-roboto text-gray-300 mb-6">
                    Paste any track, album, or playlist link. We transform it into one beautiful Cassette link that works everywhere.
                  </p>
                  <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-700">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="h-3 bg-gray-600 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-600 rounded w-24"></div>
                      </div>
                      <div className="bg-gradient-to-r from-primary to-secondary px-3 py-1 rounded-lg">
                        <span className="font-teko text-white">Play</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gradient-to-b from-gray-800/50 to-gray-900/80 border border-gray-700/50 rounded-2xl overflow-hidden">
                <CardHeader>
                  <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <UserSquare className="text-secondary" size={24} />
                  </div>
                  <CardTitle className="font-teko text-2xl text-white">Your Music Identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-roboto text-gray-300 mb-6">
                  Your free Cassette profile is your music home - shareable in bios, showcasing your expertise like a musical resume.
                  </p>
                  <div className="bg-gradient-to-r from-gray-700/50 to-secondary/10 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-600 rounded-full w-10 h-10"></div>
                      <div>
                        <div className="h-3 bg-gray-600 rounded w-24 mb-2"></div>
                        <div className="flex gap-2">
                          <div className="w-8 h-8 bg-gray-600 rounded"></div>
                          <div className="w-8 h-8 bg-gray-600 rounded"></div>
                          <div className="w-8 h-8 bg-gray-600 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Vision Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-20"
        >
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-gray-700/30 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
            <div className="grid md:grid-cols-[1fr_2fr] gap-10 items-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-20"></div>
                  <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl p-8 w-64 h-64 flex flex-col items-center justify-center">
                    <Radio className="text-secondary mb-4" size={48} />
                    <h3 className="font-teko text-xl text-white text-center">The Future of Curation</h3>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full mb-6">
                  <Music2 className="text-secondary" size={20} />
                  <span className="font-teko text-secondary text-lg">OUR VISION</span>
                </div>
                <h2 className="font-teko text-3xl sm:text-4xl font-bold text-white mb-6">
                  A Home for Music Curators
                </h2>
                <div className="space-y-4 font-roboto text-lg text-gray-300">
                  <p>
                    We&apos;re building a platform where music curators—the modern-day radio DJs—can thrive. Where your taste builds community and your passion gets recognized.
                  </p>
                  <p className="border-l-2 border-secondary pl-4 py-1 text-white font-medium">
                    We&apos;re creating a future where curators are rewarded for their influence.
                  </p>
                  <p>
                    This is just the beginning. Join us to shape what comes next.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <h2 className="font-teko text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Unify Your Music?
          </h2>
          <p className="font-roboto text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of music lovers breaking down streaming barriers every day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                asChild 
                size="lg" 
                className="font-teko text-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 py-6 rounded-xl"
              >
                <Link href="/auth/signup">
                  Start Sharing Free
                  <ArrowRight className="ml-2" size={20} />
                </Link>
              </Button>
            </motion.div>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="font-teko text-lg bg-transparent text-white border-gray-600 hover:bg-gray-800/50 px-8 py-6 rounded-xl"
            >
              <Link href="/profile">
                See Examples
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}