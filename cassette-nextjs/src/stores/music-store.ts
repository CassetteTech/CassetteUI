import { create } from 'zustand';
import { Track, MusicSearchResult } from '@/types';

interface MusicState {
  searchResults: MusicSearchResult | null;
  isSearching: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  searchQuery: string;
  setSearchResults: (results: MusicSearchResult | null) => void;
  setIsSearching: (searching: boolean) => void;
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

export const useMusicStore = create<MusicState>((set) => ({
  searchResults: null,
  isSearching: false,
  currentTrack: null,
  isPlaying: false,
  searchQuery: '',
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () =>
    set({
      searchResults: null,
      isSearching: false,
      searchQuery: '',
    }),
}));