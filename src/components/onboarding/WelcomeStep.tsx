'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles, Users, Share2 } from 'lucide-react';
import Image from 'next/image';

interface WelcomeStepProps {
  onNext: () => void;
  displayName?: string;
}

const features = [
  {
    icon: Share2,
    title: 'Share Music Easily',
    description: 'Share songs across any streaming platform',
  },
  {
    icon: Users,
    title: 'Connect with Friends',
    description: 'Follow others and discover their taste',
  },
  {
    icon: Sparkles,
    title: 'Personalized Experience',
    description: 'Curated recommendations just for you',
  },
];

export function WelcomeStep({ onNext, displayName }: WelcomeStepProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4"
      >
        {/* Cassette Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mx-auto"
        >
          <Image
            src="/images/cassette_logo.png"
            alt="Cassette"
            width={100}
            height={100}
            className="mx-auto"
            priority
          />
        </motion.div>

        {/* Cassette Word Logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Image
            src="/images/cassette_words_logo.png"
            alt="Cassette"
            width={180}
            height={40}
            className="mx-auto"
            priority
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-foreground font-atkinson"
        >
          {displayName ? `Welcome, ${displayName}!` : 'Welcome!'}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground max-w-sm mx-auto"
        >
          Let&apos;s set up your profile so you can start sharing and discovering music with others.
        </motion.p>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="pt-4"
      >
        <Button
          onClick={onNext}
          className="w-full py-6 text-lg font-semibold"
          size="lg"
        >
          Get Started
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          This will only take a minute
        </p>
      </motion.div>
    </div>
  );
}
