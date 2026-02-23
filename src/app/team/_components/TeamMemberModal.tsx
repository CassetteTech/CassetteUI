"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Github, Linkedin, Twitter, Mail } from "lucide-react";
import Image from "next/image";
import { teamMembers, getTypeConfig } from "../_data";

interface TeamMemberModalProps {
  memberName: string | null;
  onClose: () => void;
}

export function TeamMemberModal({ memberName, onClose }: TeamMemberModalProps) {
  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && memberName) {
        onClose();
      }
    };

    if (memberName) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [memberName, onClose]);

  return (
    <AnimatePresence mode="wait">
      {memberName && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            key={`modal-${memberName}`}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="surface-top border border-foreground/15 dark:border-border rounded-lg elev-4 max-w-3xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const member = teamMembers.find((m) => m.name === memberName);
              if (!member) return null;

              const typeConfig = getTypeConfig(member.type);

              return (
                <div className="p-8 sm:p-10">
                  {/* Accent bar — category color */}
                  <div className={`h-[2px] w-10 ${typeConfig.accentBar} mb-6`} />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                        <Image
                          src={member.image}
                          alt={member.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div>
                        <h2 className="font-teko text-4xl text-foreground font-bold leading-none mb-1">
                          {member.name}
                        </h2>
                        <p
                          className={`font-roboto text-lg ${typeConfig.iconColor}`}
                        >
                          {member.role}
                        </p>
                        {(Array.isArray(member.type)
                          ? member.type.includes("cofounder")
                          : member.type === "cofounder") && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm mt-2 text-xs font-medium ${typeConfig.iconBg} ${typeConfig.iconColor}`}
                          >
                            Co-Founder
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Close"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-teko text-lg text-muted-foreground uppercase tracking-wider mb-3">
                        Background
                      </h3>
                      <p className="font-roboto text-foreground/90 leading-relaxed">
                        {member.fullBio}
                      </p>
                    </div>

                    <hr className="border-foreground/10 dark:border-border" />

                    <div>
                      <h3 className="font-teko text-lg text-muted-foreground uppercase tracking-wider mb-3">
                        Experience
                      </h3>
                      <p className="font-roboto text-foreground/90 leading-relaxed">
                        {member.background}
                      </p>
                    </div>

                    <hr className="border-foreground/10 dark:border-border" />

                    <div>
                      <h3 className="font-teko text-lg text-muted-foreground uppercase tracking-wider mb-3">
                        Expertise
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {member.expertise.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1.5 text-sm rounded-sm border border-foreground/10 dark:border-border bg-muted/50 text-foreground/80 font-roboto"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <hr className="border-foreground/10 dark:border-border" />

                    <div>
                      <h3 className="font-teko text-lg text-muted-foreground uppercase tracking-wider mb-3">
                        Connect
                      </h3>
                      <div className="flex gap-3">
                        {[
                          { href: member.social.github, icon: Github, label: "GitHub" },
                          { href: member.social.linkedin, icon: Linkedin, label: "LinkedIn" },
                          { href: member.social.twitter, icon: Twitter, label: "Twitter" },
                          { href: member.social.email, icon: Mail, label: "Email" },
                        ].map(({ href, icon: Icon, label }) => (
                          <a
                            key={label}
                            href={href}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50 text-sm"
                            aria-label={label}
                          >
                            <Icon size={18} />
                            <span className="font-roboto font-medium">
                              {label}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
