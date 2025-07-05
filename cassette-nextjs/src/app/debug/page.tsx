'use client';

import { useState } from 'react';
import { useMusicLinkConversion } from '@/hooks/use-music';
import { AnimatedButton } from '@/components/ui/animated-button';
import { UIText } from '@/components/ui/typography';

export default function DebugPage() {
  const [testUrl, setTestUrl] = useState('https://open.spotify.com/track/6mH4EevpFs1sdHJOSkleN2?si=195882c7cae94654');
  const { mutate: convertLink, isPending, error, data } = useMusicLinkConversion();
  
  const handleTest = () => {
    console.log('🧪 Debug: Testing conversion with URL:', testUrl);
    convertLink(testUrl);
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block mb-2">Test URL:</label>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <AnimatedButton
          text="Test Conversion"
          onClick={handleTest}
          height={40}
          width={150}
          initialPos={4}
        />
        
        <div className="mt-8 space-y-4">
          <div>
            <UIText className="font-bold">Status:</UIText>
            <pre className="bg-gray-100 p-2 rounded">
              {isPending ? 'Converting...' : 'Ready'}
            </pre>
          </div>
          
          {error && (
            <div>
              <UIText className="font-bold text-red-600">Error:</UIText>
              <pre className="bg-red-50 p-2 rounded text-red-800">
                {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
              </pre>
            </div>
          )}
          
          {data && (
            <div>
              <UIText className="font-bold text-green-600">Success:</UIText>
              <pre className="bg-green-50 p-2 rounded text-green-800 overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}