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
  avatarUrl: "/api/placeholder/100/100",
  connectedServices: ["spotify", "apple-music", "deezer"]
};

const dummyActivityPosts = {
  playlists: [
    { id: 1, title: "Summer Vibes 2024", image: "/api/placeholder/200/200", tracks: 25 },
    { id: 2, title: "Chill Study Session", image: "/api/placeholder/200/200", tracks: 40 },
    { id: 3, title: "Workout Energy", image: "/api/placeholder/200/200", tracks: 35 },
    { id: 4, title: "Late Night Jazz", image: "/api/placeholder/200/200", tracks: 20 }
  ],
  tracks: [
    { id: 1, title: "Midnight City", artist: "M83", image: "/api/placeholder/100/100" },
    { id: 2, title: "Electric Feel", artist: "MGMT", image: "/api/placeholder/100/100" },
    { id: 3, title: "Daft Punk is Playing at My House", artist: "LCD Soundsystem", image: "/api/placeholder/100/100" },
    { id: 4, title: "Feels Like Summer", artist: "Childish Gambino", image: "/api/placeholder/100/100" }
  ],
  artists: [
    { id: 1, name: "The Weeknd", image: "/api/placeholder/150/150", genre: "R&B/Pop" },
    { id: 2, name: "Tame Impala", image: "/api/placeholder/150/150", genre: "Psychedelic Rock" },
    { id: 3, name: "Frank Ocean", image: "/api/placeholder/150/150", genre: "Alternative R&B" },
    { id: 4, name: "Arctic Monkeys", image: "/api/placeholder/150/150", genre: "Indie Rock" }
  ],
  albums: [
    { id: 1, title: "After Hours", artist: "The Weeknd", image: "/api/placeholder/200/200", year: 2020 },
    { id: 2, title: "Currents", artist: "Tame Impala", image: "/api/placeholder/200/200", year: 2015 },
    { id: 3, title: "Blonde", artist: "Frank Ocean", image: "/api/placeholder/200/200", year: 2016 },
    { id: 4, title: "AM", artist: "Arctic Monkeys", image: "/api/placeholder/200/200", year: 2013 }
  ]
};

export function ProfileDemo() {
  const [activeTab, setActiveTab] = useState<TabType>('playlists');

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
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <img src={dummyUserBio.avatarUrl} alt={dummyUserBio.displayName} />
                    </Avatar>
                    <div>
                      <h1 className="text-sm font-bold">{dummyUserBio.displayName}</h1>
                      <p className="text-xs text-muted-foreground">@{dummyUserBio.username}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-full h-8 w-8">
                    <Share2 className="h-3 w-3" />
                  </Button>
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

                <Button className="w-full h-8" variant="default">
                  <Music className="mr-2 h-3 w-3" />
                  <span className="text-xs">Add Music</span>
                </Button>
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