'use client';

import { MusicServicesConnection } from '@/components/features/profile/music-services-connection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MusicAuthDemoPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Secure Music Authentication Demo</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          This page demonstrates the secure authentication flow for connecting Spotify and Apple Music accounts.
          All sensitive operations are handled on the backend.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MusicServicesConnection />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Features</CardTitle>
              <CardDescription>How we keep your data safe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-start">
                  🔐 Backend Token Exchange
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Client secrets never leave the server
                </p>
              </div>

              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-start">
                  🛡️ CSRF Protection
                </Badge>
                <p className="text-sm text-muted-foreground">
                  State parameters prevent cross-site attacks
                </p>
              </div>

              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-start">
                  🔒 Encrypted Storage
                </Badge>
                <p className="text-sm text-muted-foreground">
                  All tokens are encrypted before database storage
                </p>
              </div>

              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-start">
                  ⏰ Token Refresh
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Automatic token renewal for uninterrupted access
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Implementation Details</CardTitle>
              <CardDescription>Technical overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <h4 className="font-semibold">Spotify OAuth 2.0</h4>
                <p className="text-muted-foreground">
                  Authorization Code flow with PKCE-like state validation
                </p>
              </div>

              <div className="text-sm space-y-1">
                <h4 className="font-semibold">Apple Music</h4>
                <p className="text-muted-foreground">
                  Server-generated developer tokens + client-side MusicKit.js
                </p>
              </div>

              <div className="text-sm space-y-1">
                <h4 className="font-semibold">Database Schema</h4>
                <p className="text-muted-foreground">
                  RLS-protected table with encrypted token columns
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flow Diagrams</CardTitle>
          <CardDescription>Authentication flow visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-green-600">✅ Secure Spotify Flow</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>User clicks &quot;Connect Spotify&quot;</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Frontend redirects to /api/auth/spotify/connect</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Backend generates state, redirects to Spotify</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>User authorizes on Spotify</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <span>Spotify redirects to /api/auth/spotify/callback</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">6</span>
                  <span>Backend exchanges code for tokens using client secret</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">7</span>
                  <span>Tokens encrypted and stored in database</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-green-600">✅ Secure Apple Music Flow</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>User clicks &quot;Connect Apple Music&quot;</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Frontend fetches developer token from backend</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Backend generates JWT using private key</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>Frontend configures MusicKit with token</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <span>User authorizes on Apple Music</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">6</span>
                  <span>Frontend sends user token to backend</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">7</span>
                  <span>User token encrypted and stored in database</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}