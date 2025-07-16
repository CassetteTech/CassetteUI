import Link from "next/link"
import Image from "next/image"
import { ShadcnLoginForm } from "@/components/shadcn-login-form"
import { AnimatedBackground } from "@/components/ui/animated-background"

export default function ShadcnSignInPage() {
  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground className="fixed inset-0 z-0" />
      
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Link href="/" className="flex flex-col items-center">
            <Image
              src="/images/cassette_words_logo.png"
              alt="Cassette"
              width={200}
              height={80}
              className="mb-2"
              priority
            />
          </Link>
          <ShadcnLoginForm />
        </div>
      </div>
    </div>
  )
}