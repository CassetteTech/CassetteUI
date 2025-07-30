"use client";

import { motion } from "framer-motion";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, CassetteTape, Link as LinkIcon, Music2, Radio, UserSquare, Zap } from "lucide-react";
import { InvertedProfileDemo } from "@/components/demo/inverted-profile-demo";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Floating Cassettes */}
      <div className="absolute top-20 left-10 opacity-30">
        <CassetteTape className="text-primary rotate-12" size={48} />
      </div>
      <div className="absolute bottom-40 right-16 opacity-20">
        <CassetteTape className="text-accent -rotate-6" size={64} />
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
              <CassetteTape className="text-foreground" size={48} />
            </div>
          </motion.div>
          
          <h1 className="font-teko text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-wide">
            Your Music <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Belongs Everywhere</span>.
          </h1>
          <p className="font-roboto text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Cassette is the universal translator for your taste, connecting you and your friends, no matter how you listen.
          </p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm border border-border/50 rounded-2xl p-1">
              <div className="bg-bgElevated/80 rounded-xl p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-left">
                    <h3 className="font-teko text-xl text-foreground mb-2">Universal Music Link</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-danger"></div>
                      <p className="font-roboto text-muted-foreground">Spotify → Apple Music → YouTube Music</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-primary to-secondary p-0.5 rounded-lg">
                    <Button asChild className="font-teko text-lg bg-bgElevated hover:bg-bgSubtle">
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
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-accent/10 rounded-full blur-xl"></div>
              <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 backdrop-blur-sm">
                <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-6">
                  The Story Behind Cassette
                </h2>
                <div className="space-y-4 font-roboto text-lg text-muted-foreground">
                  <p className="border-l-2 border-primary pl-4 py-1">
                    You craft the perfect playlist—immaculate flow, hidden gems. You share it excitedly... only to hear: <span className="text-accent">&quot;Sorry, I use Apple Music.&quot;</span>
                  </p>
                  <p>
                    Music should be universal, but streaming services create digital walls. Sharing discoveries shouldn&apos;t be a chore—it should spark joy.
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Cassette was born from this frustration.</span> We&apos;re developers, marketers, and music obsessives who believe your taste deserves to be shared.
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
                <Link href="/team" className="block group">
                  <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 h-full flex flex-col items-center justify-center group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-borderDark/30 rounded-lg w-16 h-16 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <UserSquare className="text-primary group-hover:text-primary" size={24} />
                        </div>
                      ))}
                    </div>
                    <h3 className="font-teko text-2xl text-foreground mb-2 group-hover:text-primary transition-colors">The Cassette Crew</h3>
                    <p className="font-roboto text-textHint text-center group-hover:text-muted-foreground transition-colors">Music-obsessed team breaking down streaming barriers</p>
                    <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="text-primary" size={20} />
                    </div>
                  </div>
                </Link>
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
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 bg-bgSubtle/50 px-4 py-2 rounded-full mb-4">
              <Zap className="text-primary" size={20} />
              <span className="font-teko text-primary text-lg">WHAT WE DO TODAY</span>
            </div>
            <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Unify Your Music Experience
            </h2>
            <p className="font-roboto text-muted-foreground">
              Break down walls between streaming platforms with Cassette&apos;s powerful tools
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
            {/* Left Column - Profile Demo with extra spacing */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative z-10" style={{ paddingTop: '6rem', paddingBottom: '12rem' }}>
                <InvertedProfileDemo />
              </div>
            </div>

            {/* Right Column - Features Cards */}
            <div className="space-y-8 lg:flex lg:flex-col lg:justify-center">
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-lg">
                  <CardHeader>
                    <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <LinkIcon className="text-primary" size={24} />
                    </div>
                    <CardTitle className="font-teko text-2xl text-foreground">Universal Music Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-roboto text-muted-foreground mb-6">
                      Paste any track, album, or playlist link. We transform it into one beautiful Cassette link that works everywhere.
                    </p>
                    <div className="space-y-3">
                      <p className="font-roboto text-sm text-muted-foreground">Try these examples from our demo profile:</p>
                      <div className="space-y-2">
                        <Link href="/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3" className="block">
                          <div className="bg-borderDark/30 rounded-xl p-3 border border-border hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center">
                                <Music2 size={16} className="text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm text-foreground">Stronger - Kanye West</p>
                                <p className="text-xs text-muted-foreground">Smart link opens in your preferred app</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                        <Link href="/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705" className="block">
                          <div className="bg-borderDark/30 rounded-xl p-3 border border-border hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-pink-500 flex items-center justify-center">
                                <Music2 size={16} className="text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm text-foreground">Time - Pink Floyd</p>
                                <p className="text-xs text-muted-foreground">Cross-platform playlist ready</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-lg">
                  <CardHeader>
                    <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <UserSquare className="text-accent" size={24} />
                    </div>
                    <CardTitle className="font-teko text-2xl text-foreground">Your Music Identity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-roboto text-muted-foreground mb-6">
                      Your free Cassette profile becomes your music home - shareable in bios, showcasing your curation skills like a musical resume.
                    </p>
                    <div className="space-y-3">
                      <p className="font-roboto text-sm text-muted-foreground">Organize your music across platforms:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/50 backdrop-blur-sm rounded-lg p-3 border border-border">
                          <p className="text-xs font-medium text-foreground mb-1">Playlists</p>
                          <p className="text-xs text-muted-foreground">Summer Vibes, Chill Study</p>
                        </div>
                        <div className="bg-muted/50 backdrop-blur-sm rounded-lg p-3 border border-border">
                          <p className="text-xs font-medium text-foreground mb-1">Top Artists</p>
                          <p className="text-xs text-muted-foreground">The Weeknd, Tame Impala</p>
                        </div>
                        <div className="bg-muted/50 backdrop-blur-sm rounded-lg p-3 border border-border">
                          <p className="text-xs font-medium text-foreground mb-1">Recent Tracks</p>
                          <p className="text-xs text-muted-foreground">LCD Soundsystem, Flipturn</p>
                        </div>
                        <div className="bg-muted/50 backdrop-blur-sm rounded-lg p-3 border border-border">
                          <p className="text-xs font-medium text-foreground mb-1">Albums</p>
                          <p className="text-xs text-muted-foreground">After Hours, Currents</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Smart Links Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mb-24"
        >
          <div className="text-center mb-12">
            <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-4">
              See Smart Links in Action
            </h2>
            <p className="font-roboto text-muted-foreground max-w-2xl mx-auto">
              Click any link below to see how Cassette creates universal music links that work across all platforms
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Flipturn Track */}
            <Link href="/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3" className="block group">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
                      <Music2 size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-teko text-lg font-bold text-foreground truncate">Stronger</h3>
                      <p className="font-roboto text-sm text-muted-foreground truncate">Kanye West</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-roboto text-xs text-muted-foreground">Spotify → Universal</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Pink Floyd Track */}
            <Link href="/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705" className="block group">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <Music2 size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-teko text-lg font-bold text-foreground truncate">Time</h3>
                      <p className="font-roboto text-sm text-muted-foreground truncate">Pink Floyd</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                        <span className="font-roboto text-xs text-muted-foreground">Apple Music → Universal</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* LCD Soundsystem Track */}
            <Link href="/post?url=https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo" className="block group">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Music2 size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-teko text-lg font-bold text-foreground truncate">Daft Punk is Playing at My House</h3>
                      <p className="font-roboto text-sm text-muted-foreground truncate">LCD Soundsystem</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="font-roboto text-xs text-muted-foreground">Dance/Electronic</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* The Weeknd Album */}
            <Link href="/post?url=https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj" className="block group">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center flex-shrink-0">
                      <Music2 size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-teko text-lg font-bold text-foreground truncate">After Hours</h3>
                      <p className="font-roboto text-sm text-muted-foreground truncate">The Weeknd</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="font-roboto text-xs text-muted-foreground">Full Album</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Tame Impala Album */}
            <Link href="/post?url=https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv" className="block group">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <Music2 size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-teko text-lg font-bold text-foreground truncate">Currents</h3>
                      <p className="font-roboto text-sm text-muted-foreground truncate">Tame Impala</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="font-roboto text-xs text-muted-foreground">Psychedelic Rock</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Childish Gambino Track */}
            <Link href="/post?url=https://open.spotify.com/track/5UH5s7VwbSkFExIl1oqNux" className="block group">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Music2 size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-teko text-lg font-bold text-foreground truncate">Feels Like Summer</h3>
                      <p className="font-roboto text-sm text-muted-foreground truncate">Childish Gambino</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-roboto text-xs text-muted-foreground">Hip-Hop/R&B</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          
          <div className="text-center mt-8">
            <p className="font-roboto text-sm text-muted-foreground">
              Each link automatically detects your preferred streaming service and opens there, while providing alternatives for all other platforms.
            </p>
          </div>
        </motion.div>

        {/* Vision Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-20"
        >
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-border/30 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
            <div className="grid md:grid-cols-[1fr_2fr] gap-10 items-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-20"></div>
                  <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 w-64 h-64 flex flex-col items-center justify-center">
                    <Radio className="text-accent mb-4" size={48} />
                    <h3 className="font-teko text-xl text-foreground text-center">The Future of Curation</h3>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="inline-flex items-center gap-2 bg-bgSubtle/50 px-4 py-2 rounded-full mb-6">
                  <Music2 className="text-accent" size={20} />
                  <span className="font-teko text-accent text-lg">OUR VISION</span>
                </div>
                <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-6">
                  A Home for Music Curators
                </h2>
                <div className="space-y-4 font-roboto text-lg text-muted-foreground">
                  <p>
                    We&apos;re building a platform where music curators—the modern-day radio DJs—can thrive. Where your taste builds community and your passion gets recognized.
                  </p>
                  <p className="border-l-2 border-secondary pl-4 py-1 text-foreground font-medium">
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
          <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-6">
            Ready to Unify Your Music?
          </h2>
          <p className="font-roboto text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
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
                className="font-teko text-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-foreground px-8 py-6 rounded-xl"
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
              className="font-teko text-lg bg-transparent text-foreground border-borderDark hover:bg-bgSubtle/50 px-8 py-6 rounded-xl"
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