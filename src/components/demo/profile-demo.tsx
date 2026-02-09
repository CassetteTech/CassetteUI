'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Share2, Music } from "lucide-react";
import Image from "next/image";
import { theme } from "@/lib/theme";

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
    { id: 7, title: "In Rainbows", artist: "Radiohead", image: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/50/c7/dd50c790-99ac-d3d0-5ab8-e3891fb8fd52/634904032463.png/100x100bb.jpg", year: 2007 }
  ]
};

interface ProfileDemoProps {
  arrowColor?: string;
}

export function ProfileDemo({ arrowColor }: ProfileDemoProps = {}) {
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
    switch (activeTab) {
      case 'playlists':
        return (
          <div className="space-y-1 p-3">
            {dummyActivityPosts.playlists.map((playlist) => (
              <div key={playlist.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  <Image
                    src={playlist.image}
                    alt={playlist.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs truncate text-foreground">{playlist.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{playlist.tracks} tracks</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'tracks':
        return (
          <div className="space-y-1 p-3">
            {dummyActivityPosts.tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  <Image
                    src={track.image}
                    alt={track.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs truncate text-foreground">{track.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'artists':
        return (
          <div className="space-y-1 p-3">
            {dummyActivityPosts.artists.map((artist) => (
              <div key={artist.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  <Image
                    src={artist.image}
                    alt={artist.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs truncate text-foreground">{artist.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{artist.genre}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'albums':
        return (
          <div className="space-y-1 p-3">
            {dummyActivityPosts.albums.map((album) => (
              <div key={album.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  <Image
                    src={album.image}
                    alt={album.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs truncate text-foreground">{album.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{album.artist} • {album.year}</p>
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center py-8 lg:py-16">
      {/* Phone + call-outs wrapper */}
      <div className="relative">
        {/* Phone Body */}
        <div className="w-80 h-[640px] bg-black rounded-[2.5rem] p-2 shadow-2xl">
          {/* Screen */}
          <div className="w-full h-full bg-background rounded-[2rem] overflow-hidden relative">
            {/* Screen Content */}
            <div className="h-full flex flex-col pt-8">
              {/* Profile Header */}
              <div className="p-3 space-y-3">
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

                <div className="flex gap-2">
                  <Button className="flex-1 h-8 border-2 border-gray-400" variant="outline">
                    <Music className="mr-2 h-3 w-3" />
                    <span className="text-xs">Add Music</span>
                  </Button>
                  <Button className="flex-1 h-8 text-white" style={{ backgroundColor: theme.colors.brandRed }} onClick={handleShare}>
                    <Share2 className="mr-2 h-3 w-3" />
                    <span className="text-xs">Share Profile</span>
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="sticky top-0 z-10 bg-background border-t">
                <div className="p-3">
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
                    <TabsList className="flex h-10 items-center justify-start rounded-lg w-full p-1 bg-muted/50 backdrop-blur-sm border border-border/50">
                      {tabs.map((tab) => (
                        <TabsTrigger
                          key={tab.key}
                          value={tab.key}
                          className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-all duration-200 data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground data-[state=active]:text-white"
                          style={{
                            backgroundColor: activeTab === tab.key ? theme.colors.brandRed : undefined,
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

              {/* Content */}
              <div className="flex-1 overflow-auto">
                {renderContent()}
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

        {/* TOP CALLOUT */}
        <div className="absolute -top-48 left-1/2 -translate-x-1/2">
          {/* retro window frame */}
          <div className="relative w-72 h-32">
            <div className="absolute inset-0 bg-white rounded-xl outline outline-1 outline-black shadow-[1px_1px_0px_1px_rgba(0,0,0,1)]">
              {/* "browser chrome" bars */}
              <div className="absolute left-0 top-0 w-full h-7 bg-white outline outline-1 outline-black">
                {([6, 9, 12, 15, 18, 21] as const).map((y) => (
                  <div key={y} className="absolute left-1 right-1 h-px bg-black" style={{ top: y }} />
                ))}
                <div className="absolute left-8 top-1 w-4 h-4 bg-white border border-black" />
              </div>

              {/* label text */}
              <div className="flex items-center justify-center h-full px-4 pt-7">
                <p className="text-center text-black font-['Atkinson_Hyperlegible'] font-bold text-xl leading-snug">
                  Add music to your profile <br />from any streaming platform!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow from Add Music button to top label */}
        <div className="absolute top-[216px] left-[12px]">
          {/* Horizontal segment left */}
          <div className="absolute w-8 h-0.5 -left-8 -translate-y-1/2" style={{ backgroundColor: arrowColor || 'hsl(var(--foreground))' }} />
          {/* Vertical segment up - adjusted to reach middle of label (label is h-32, so middle is 16 from top) */}
          <div className="absolute h-[346px] w-0.5 -left-8 -top-[346px]" style={{ backgroundColor: arrowColor || 'hsl(var(--foreground))' }} />
          {/* Horizontal segment to label */}
          <div className="absolute w-4 h-0.5 -left-8 -top-[347px]" style={{ backgroundColor: arrowColor || 'hsl(var(--foreground))' }} />
          {/* Arrow head pointing right */}
          <div className="absolute w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-t-transparent border-b-transparent -left-4 -top-[346px] -translate-y-1/2" style={{ borderLeftColor: arrowColor || 'hsl(var(--foreground))' }} />
        </div>

        {/* BOTTOM CALLOUT */}
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2">
          {/* retro window frame */}
          <div className="relative w-72 h-32">
            <div className="absolute inset-0 bg-white rounded-xl outline outline-1 outline-black shadow-[1px_1px_0px_1px_rgba(0,0,0,1)]">
              {/* "browser chrome" bars */}
              <div className="absolute left-0 top-0 w-full h-7 bg-white outline outline-1 outline-black">
                {([6, 9, 12, 15, 18, 21] as const).map((y) => (
                  <div key={y} className="absolute left-1 right-1 h-px bg-black" style={{ top: y }} />
                ))}
                <div className="absolute left-4 top-1 w-4 h-4 bg-white border border-black" />
              </div>

              {/* label text */}
              <div className="flex items-center justify-center h-full px-4 pt-7">
                <p className="text-center text-black font-['Atkinson_Hyperlegible'] font-bold text-xl leading-snug">
                  Share smart links <br />with friends
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow from Share Profile button to bottom label */}
        <div className="absolute top-[216px] right-[12px]">
          {/* Horizontal segment right */}
          <div className="absolute w-8 h-0.5 -right-8 -translate-y-1/2" style={{ backgroundColor: arrowColor || 'hsl(var(--foreground))' }} />
          {/* Vertical segment down - adjusted to reach middle of label */}
          <div className="absolute h-[552px] w-0.5 -right-8 top-0" style={{ backgroundColor: arrowColor || 'hsl(var(--foreground))' }} />
          {/* Horizontal segment to label */}
          <div className="absolute w-4 h-0.5 -right-8 top-[552px]" style={{ backgroundColor: arrowColor || 'hsl(var(--foreground))' }} />
          {/* Arrow head pointing left */}
          <div className="absolute w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent -right-4 top-[553px] -translate-y-1/2" style={{ borderRightColor: arrowColor || 'hsl(var(--foreground))' }} />
        </div>
      </div>
    </div>
  );
}