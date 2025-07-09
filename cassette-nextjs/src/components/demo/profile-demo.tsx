'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Share2, Music } from "lucide-react";
import Image from "next/image";

type TabType = 'playlists' | 'tracks' | 'artists' | 'albums';

// Dummy data
const dummyUserBio = {
  username: "alexmusic",
  displayName: "Alex Music",
  bio: "🎵 Music enthusiast | Playlist curator | Always discovering new sounds",
  avatarUrl: "/images/demo/alex-avatar.jpg",
  connectedServices: ["spotify", "apple-music", "deezer"]
};

const dummyActivityPosts = {
  playlists: [
    { id: 1, title: "Summer Vibes 2024", image: "/images/demo/summer-vibes-playlist.jpg", tracks: 25 },
    { id: 2, title: "Chill Study Session", image: "/images/demo/chill-study-playlist.jpg", tracks: 40 },
    { id: 3, title: "Workout Energy", image: "/images/demo/workout-energy-playlist.jpg", tracks: 35 },
    { id: 4, title: "Late Night Jazz", image: "/images/demo/late-night-jazz-playlist.jpg", tracks: 20 }
  ],
  tracks: [
    { id: 1, title: "Swim Between Trees", artist: "Flipturn", image: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/6e/09/d9/6e09d9bd-2a54-57f0-b254-a1fb1aa6803a/25355.jpg/100x100bb.jpg" },
    { id: 2, title: "Time", artist: "Pink Floyd", image: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/8f/50/cb/8f50cba0-1ab8-deb0-c21f-1750cc3b2201/23UMGIM65578.rgb.jpg/100x100bb.jpg" },
    { id: 3, title: "Daft Punk is Playing at My House", artist: "LCD Soundsystem", image: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/77/61/e7/7761e73a-706b-91b6-743e-d42721f4ee18/859744966031.jpg/100x100bb.jpg" },
    { id: 4, title: "Feels Like Summer", artist: "Childish Gambino", image: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/77/61/e7/7761e73a-706b-91b6-743e-d42721f4ee18/859744966031.jpg/100x100bb.jpg" }
  ],
  artists: [
    { id: 1, name: "The Weeknd", image: "/images/demo/artist_weeknd.jpg", genre: "R&B/Pop" },
    { id: 2, name: "Tame Impala", image: "/images/demo/artist_tameimpala.jpg", genre: "Psychedelic Rock" },
    { id: 3, name: "Frank Ocean", image: "/images/demo/artist_frankocean.jpg", genre: "Alternative R&B" },
    { id: 4, name: "Arctic Monkeys", image: "/images/demo/artist_arcticmonkeys.jpg", genre: "Indie Rock" }
  ],
  albums: [
    { id: 1, title: "After Hours", artist: "The Weeknd", image: "/images/demo/after-hours-album.jpg", year: 2020 },
    { id: 2, title: "Currents", artist: "Tame Impala", image: "/images/demo/currents-album.jpg", year: 2015 },
    { id: 3, title: "Blonde", artist: "Frank Ocean", image: "/images/demo/blonde-album.jpg", year: 2016 },
    { id: 4, title: "AM", artist: "Arctic Monkeys", image: "/images/demo/am-album.jpg", year: 2013 }
  ]
};

export function ProfileDemo() {
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
          <div className="grid grid-cols-2 gap-2 p-3">
            {dummyActivityPosts.playlists.map((playlist) => (
              <div key={playlist.id} className="space-y-1">
                <div className="aspect-square rounded-md bg-muted overflow-hidden">
                  <img 
                    src={playlist.image} 
                    alt={playlist.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-medium text-xs truncate">{playlist.title}</h3>
                <p className="text-xs text-muted-foreground">{playlist.tracks} tracks</p>
              </div>
            ))}
          </div>
        );

      case 'tracks':
        return (
          <div className="space-y-1 p-3">
            {dummyActivityPosts.tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                  <img 
                    src={track.image} 
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs truncate">{track.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'artists':
        return (
          <div className="grid grid-cols-2 gap-3 p-3">
            {dummyActivityPosts.artists.map((artist) => (
              <div key={artist.id} className="flex flex-col items-center text-center space-y-1">
                <div className="w-16 h-16 rounded-full bg-muted overflow-hidden">
                  <img 
                    src={artist.image} 
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-medium text-xs">{artist.name}</h3>
                <p className="text-xs text-muted-foreground">{artist.genre}</p>
              </div>
            ))}
          </div>
        );

      case 'albums':
        return (
          <div className="space-y-1 p-3">
            {dummyActivityPosts.albums.map((album) => (
              <div key={album.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                  <img 
                    src={album.image} 
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs truncate">{album.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{album.artist} • {album.year}</p>
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-8">
      {/* Phone Frame */}
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
                    <img src={dummyUserBio.avatarUrl} alt={dummyUserBio.displayName} />
                  </Avatar>
                  <div>
                    <h1 className="text-sm font-bold">{dummyUserBio.displayName}</h1>
                    <p className="text-xs text-muted-foreground">@{dummyUserBio.username}</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed">{dummyUserBio.bio}</p>

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
                  <Button className="flex-1 h-8" variant="outline">
                    <Music className="mr-2 h-3 w-3" />
                    <span className="text-xs">Add Music</span>
                  </Button>
                  <Button className="flex-1 h-8 bg-red-500 hover:bg-red-600 text-white" onClick={handleShare}>
                    <Share2 className="mr-2 h-3 w-3" />
                    <span className="text-xs">Share Profile</span>
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="sticky top-0 z-10 bg-background border-t">
                <div className="p-3">
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
                    <TabsList className="flex h-8 items-center justify-start rounded-lg w-full p-1 bg-muted/50 backdrop-blur-sm border border-border/50">
                      {tabs.map((tab) => (
                        <TabsTrigger
                          key={tab.key}
                          value={tab.key}
                          className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-all duration-200 data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
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
      </div>
    </div>
  );
}