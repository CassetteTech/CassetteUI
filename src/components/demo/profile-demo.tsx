'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Share2, Music } from "lucide-react";
import Image from "next/image";

type TabType = 'playlists' | 'tracks' | 'artists' | 'albums';

// Dummy data
const dummyUserBio = {
  username: "matttoppi",
  displayName: "Matt Toppi",
  bio: "🎵 Music enthusiast | Playlist curator | Always discovering new sounds",
  avatarUrl: "/images/cassette_logo.png",
  connectedServices: ["spotify", "apple-music", "deezer"]
};

const dummyActivityPosts = {
  playlists: [
    { id: 1, title: "Summer Vibes 2024", image: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/200x200bb.jpg", tracks: 25 },
    { id: 2, title: "Chill Study Session", image: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/50/c7/dd50c790-99ac-d3d0-5ab8-e3891fb8fd52/634904032463.png/200x200bb.jpg", tracks: 40 },
    { id: 3, title: "Workout Energy", image: "https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/39/25/2d/39252d65-2d50-b991-0962-f7a98a761271/00602517483507.rgb.jpg/200x200bb.jpg", tracks: 35 },
    { id: 4, title: "Late Night Jazz", image: "https://is1-ssl.mzstatic.com/image/thumb/Music/7f/9f/d6/mzi.vtnaewef.jpg/200x200bb.jpg", tracks: 20 },
    { id: 5, title: "Road Trip Anthems", image: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/48/53/43/485343e3-dd6a-0034-faec-f4b6403f8108/13UMGIM63890.rgb.jpg/200x200bb.jpg", tracks: 30 },
    { id: 6, title: "Indie Discoveries", image: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/6d/db/fc/6ddbfc02-1a96-a4ce-eb86-b3822757b6fe/735910620207_cover.jpg/200x200bb.jpg", tracks: 18 },
    { id: 7, title: "90s Nostalgia", image: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/45/b2/24/45b224b7-baa4-c320-9e3b-fd37dcfcdcb1/mzi.nkvwvqxf.jpg/200x200bb.jpg", tracks: 22 }
  ],
  tracks: [
    { id: 1, title: "Swim Between Trees", artist: "Flipturn", image: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/6e/09/d9/6e09d9bd-2a54-57f0-b254-a1fb1aa6803a/25355.jpg/100x100bb.jpg" },
    { id: 2, title: "Time", artist: "Pink Floyd", image: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/3e/76/b0/3e76b0e3-762b-2286-a019-8afb19cee541/886445635829.jpg/100x100bb.jpg" },
    { id: 3, title: "Midnight City", artist: "M83", image: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/100x100bb.jpg" },
    { id: 4, title: "Redbone", artist: "Childish Gambino", image: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e5/bc/65/e5bc6574-1f2a-24a7-6fe0-d17fd32b9869/886447214268.jpg/100x100bb.jpg" },
    { id: 5, title: "Let It Happen", artist: "Tame Impala", image: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a8/2e/b4/a82eb490-f30a-a321-461a-0383c88fec95/15UMGIM23316.rgb.jpg/100x100bb.jpg" },
    { id: 6, title: "Do I Wanna Know?", artist: "Arctic Monkeys", image: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/cc/0f/2d/cc0f2d02-5ff1-10e7-eea2-76863a55dbad/887828031795.png/100x100bb.jpg" }
  ],
  artists: [
    { id: 1, name: "The Weeknd", image: "/images/demo/artist_weeknd.jpg", genre: "R&B/Pop" },
    { id: 2, name: "Tame Impala", image: "/images/demo/artist_tameimpala.jpg", genre: "Psychedelic Rock" },
    { id: 3, name: "Frank Ocean", image: "/images/demo/artist_frankocean.jpg", genre: "Alternative R&B" },
    { id: 4, name: "Arctic Monkeys", image: "/images/demo/artist_arcticmonkeys.jpg", genre: "Indie Rock" },
    { id: 5, name: "Tyler, the Creator", image: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/6f/e3/09/6fe30938-89fb-e4ae-d67a-648746c26db1/196871668248.jpg/100x100bb.jpg", genre: "Hip-Hop/Rap" },
    { id: 6, name: "Kendrick Lamar", image: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/ab/16/ef/ab16efe9-e7f1-66ec-021c-5592a23f0f9e/17UMGIM88793.rgb.jpg/100x100bb.jpg", genre: "Hip-Hop" },
    { id: 7, name: "Radiohead", image: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/100x100bb.jpg", genre: "Alternative Rock" }
  ],
  albums: [
    { id: 1, title: "After Hours", artist: "The Weeknd", image: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/2b/b9/fe/2bb9fef5-d7f3-8345-25a9-db0e79fde4e4/20UMGIM11048.rgb.jpg/100x100bb.jpg", year: 2020 },
    { id: 2, title: "Currents", artist: "Tame Impala", image: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a8/2e/b4/a82eb490-f30a-a321-461a-0383c88fec95/15UMGIM23316.rgb.jpg/100x100bb.jpg", year: 2015 },
    { id: 3, title: "Blonde", artist: "Frank Ocean", image: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bb/45/68/bb4568f3-68cd-619d-fbcb-4e179916545d/BlondCover-Final.jpg/100x100bb.jpg", year: 2016 },
    { id: 4, title: "AM", artist: "Arctic Monkeys", image: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/cc/0f/2d/cc0f2d02-5ff1-10e7-eea2-76863a55dbad/887828031795.png/100x100bb.jpg", year: 2013 },
    { id: 5, title: "IGOR", artist: "Tyler, the Creator", image: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/6f/e3/09/6fe30938-89fb-e4ae-d67a-648746c26db1/196871668248.jpg/100x100bb.jpg", year: 2019 },
    { id: 6, title: "good kid, m.A.A.d city", artist: "Kendrick Lamar", image: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/36/86/ec/3686ec99-dec4-0a01-8b74-2d8a9a0263a7/12UMGIM52988.rgb.jpg/100x100bb.jpg", year: 2012 },
    { id: 7, title: "In Rainbows", artist: "Radiohead", image: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/50/c7/dd50c790-99ac-d3d0-5ab8-e3891fb8fd52/634904032463.png/200x200bb.jpg", year: 2007 }
  ]
};

// Tab content slide animation
const tabContentVariants = {
  enter: { opacity: 0, x: 12 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
};

// Annotation slide-in from left
const annotationLeft = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.8 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// Annotation slide-in from right
const annotationRight = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.8 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

interface ProfileDemoProps {
  annotations?: boolean;
}

export function ProfileDemo({ annotations = true }: ProfileDemoProps) {
  const [activeTab, setActiveTab] = useState<TabType>('playlists');

  const handleShare = () => {
    const shareUrl = 'https://cassette.tech/';

    if (navigator.share) {
      navigator.share({
        title: `${dummyUserBio.displayName}'s Profile`,
        text: `Check out ${dummyUserBio.displayName}'s music profile on Cassette`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'playlists', label: 'Playlists' },
    { key: 'tracks', label: 'Tracks' },
    { key: 'artists', label: 'Artists' },
    { key: 'albums', label: 'Albums' },
  ];

  const renderContent = () => {
    const items = (() => {
      switch (activeTab) {
        case 'playlists':
          return dummyActivityPosts.playlists.map((p) => ({ id: p.id, image: p.image, line1: p.title, line2: `${p.tracks} tracks` }));
        case 'tracks':
          return dummyActivityPosts.tracks.map((t) => ({ id: t.id, image: t.image, line1: t.title, line2: t.artist }));
        case 'artists':
          return dummyActivityPosts.artists.map((a) => ({ id: a.id, image: a.image, line1: a.name, line2: a.genre }));
        case 'albums':
          return dummyActivityPosts.albums.map((a) => ({ id: a.id, image: a.image, line1: a.title, line2: `${a.artist} \u2022 ${a.year}` }));
      }
    })();

    return (
      <div className="space-y-1 p-3">
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3, ease: 'easeOut' }}
            className="flex items-center gap-2 p-2 rounded-none border-b border-border/40 hover:bg-muted/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-sm bg-muted overflow-hidden flex-shrink-0 border border-border/50">
              <Image src={item.image} alt={item.line1} width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-xs truncate text-foreground">{item.line1}</h4>
              <p className="text-xs text-muted-foreground truncate">{item.line2}</p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center py-4 sm:py-8 lg:py-12">
      <motion.div
        className="relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {/* Phone (static) */}
        <div className="relative z-10">
          {/* Phone Body */}
          <div className="relative w-72 sm:w-80 h-[580px] sm:h-[640px] bg-black rounded-[2.5rem] p-2 shadow-2xl">
            {/* Screen */}
            <div className="w-full h-full bg-background rounded-[2rem] overflow-hidden relative">
              {/* Screen Content */}
              <div className="h-full flex flex-col pt-8 overflow-hidden">
                {/* Profile Header */}
                <div className="p-3 space-y-3 min-w-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <Image src={dummyUserBio.avatarUrl} alt={dummyUserBio.displayName} width={48} height={48} />
                    </Avatar>
                    <div>
                      <h1 className="text-sm font-bold text-foreground">{dummyUserBio.displayName}</h1>
                      <p className="text-xs text-muted-foreground">@{dummyUserBio.username}</p>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-foreground">{dummyUserBio.bio}</p>

                  <div className="flex gap-2">
                    {dummyUserBio.connectedServices.map((service) => (
                      <div key={service} className="w-6 h-6 relative">
                        <Image
                          src={`/images/${service === 'apple-music' ? 'apple_music' : service}_logo_colored.png`}
                          alt={service}
                          width={24}
                          height={24}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1.5 min-w-0">
                    <Button className="flex-1 min-w-0 h-7 sm:h-8 border-2 border-gray-400 px-2" variant="outline">
                      <Music className="mr-1 h-3 w-3 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs truncate">Add Music</span>
                    </Button>
                    <Button className="flex-1 min-w-0 h-7 sm:h-8 bg-primary text-white px-2 hover:bg-primary/90" onClick={handleShare}>
                      <Share2 className="mr-1 h-3 w-3 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs truncate">Share Profile</span>
                    </Button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="sticky top-0 z-10 bg-background border-t">
                  <div className="p-3">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
                      <TabsList className="flex h-10 items-center justify-start rounded-none w-full p-1 bg-muted border-2 border-border">
                        {tabs.map((tab) => (
                          <TabsTrigger
                            key={tab.key}
                            value={tab.key}
                            className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-none px-1 sm:px-2 py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-normal sm:tracking-wider transition-all duration-100 text-muted-foreground hover:text-foreground data-[state=active]:text-white font-teko"
                            style={{
                              backgroundColor: activeTab === tab.key ? 'hsl(var(--primary))' : undefined,
                              height: activeTab === tab.key ? '32px' : '28px',
                            }}
                          >
                            {tab.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {/* Content with tab transition */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      variants={tabContentVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      {renderContent()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl"></div>
            </div>
          </div>

          {/* Phone Details */}
          <div className="absolute -right-1 top-20 w-1 h-12 bg-black rounded-r-lg"></div>
          <div className="absolute -right-1 top-36 w-1 h-16 bg-black rounded-r-lg"></div>
          <div className="absolute -right-1 top-56 w-1 h-16 bg-black rounded-r-lg"></div>
          <div className="absolute -left-1 top-28 w-1 h-8 bg-black rounded-l-lg"></div>
        </div>

        {/* Animated floating annotations */}
        {annotations && (
          <>
            {/* Left annotation — slides in from right toward phone */}
            <motion.div
              custom={0}
              variants={annotationLeft}
              className="absolute z-0 left-0 top-[185px] sm:top-[195px] -translate-x-[calc(100%+24px)] hidden sm:flex items-center gap-2"
            >
              <span className="bg-background border-2 border-foreground/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground shadow-[3px_3px_0px_0px] shadow-foreground/10 whitespace-nowrap font-teko">
                Add from any platform
              </span>
              <motion.div
                className="w-4 h-0.5 bg-foreground/30"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.1, duration: 0.3 }}
                style={{ originX: 0 }}
              />
            </motion.div>

            {/* Right annotation 1 */}
            <motion.div
              custom={1}
              variants={annotationRight}
              className="absolute z-0 right-0 top-[228px] sm:top-[238px] translate-x-[calc(100%+24px)] hidden sm:flex items-center gap-2"
            >
              <motion.div
                className="w-4 h-0.5 bg-foreground/30"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.25, duration: 0.3 }}
                style={{ originX: 1 }}
              />
              <span className="bg-background border-2 border-foreground/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground shadow-[3px_3px_0px_0px] shadow-foreground/10 whitespace-nowrap font-teko">
                Smart sharing
              </span>
            </motion.div>

            {/* Right annotation 2 */}
            <motion.div
              custom={2}
              variants={annotationRight}
              className="absolute z-0 right-0 top-[290px] sm:top-[305px] translate-x-[calc(100%+24px)] hidden sm:flex items-center gap-2"
            >
              <motion.div
                className="w-4 h-0.5 bg-foreground/30"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.4, duration: 0.3 }}
                style={{ originX: 1 }}
              />
              <span className="bg-background border-2 border-foreground/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground shadow-[3px_3px_0px_0px] shadow-foreground/10 whitespace-nowrap font-teko">
                Organize by type
              </span>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
