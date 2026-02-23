'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle2, PartyPopper, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface CompletionStepProps {
  username: string;
  displayName: string;
  avatarPreview: string | null;
  isSubmitting: boolean;
  onComplete: () => void;
}

// Confetti particle component
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--accent-royal))'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0 }}
      animate={{
        y: 400,
        x: x + (Math.random() - 0.5) * 100,
        opacity: 0,
        rotate: Math.random() * 360
      }}
      transition={{
        duration: 2 + Math.random(),
        delay,
        ease: 'easeOut'
      }}
      className="absolute top-0 w-2 h-2 rounded-sm"
      style={{ backgroundColor: color, left: '50%' }}
    />
  );
}

export function CompletionStep({
  username,
  displayName,
  avatarPreview,
  isSubmitting,
  onComplete,
}: CompletionStepProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!isSubmitting) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitting]);

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-16 h-16 text-primary" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Setting up your profile...</h2>
          <p className="text-muted-foreground">This will only take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiParticle
              key={i}
              delay={i * 0.05}
              x={(Math.random() - 0.5) * 300}
            />
          ))}
        </div>
      )}

      <div className="space-y-8">
        {/* Cassette Logo + Success */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center p-4"
            >
              <Image
                src="/images/cassette_logo.png"
                alt="Cassette"
                width={64}
                height={64}
                className="object-contain"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-success rounded-full flex items-center justify-center"
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
              className="absolute -top-2 -right-2"
            >
              <PartyPopper className="w-7 h-7 text-warning" />
            </motion.div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-bold text-foreground font-teko tracking-wide">
            You&apos;re All Set!
          </h1>
          <p className="text-muted-foreground">
            Your profile is ready. Time to explore!
          </p>
        </motion.div>

        {/* Profile Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-muted/50 border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-muted border-2 border-primary overflow-hidden flex-shrink-0">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Your avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-lg truncate">
                {displayName}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                @{username}
              </p>
              <p className="text-xs text-primary mt-1">
                cassette.tech/@{username}
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            onClick={onComplete}
            className="w-full py-6 text-lg font-semibold"
            size="lg"
          >
            Go to My Profile
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
