"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { AuthModal } from "@/components/AuthModal";
import clsx from "clsx";

type UserRole = "recruiter" | "employee";

const roleContent = {
  recruiter: {
    title: "Find Your Next Star",
    subtitle: "Access verified talent profiles with AI-powered matching",
    features: [
      "Skills-based candidate discovery",
      "AI-powered interview insights", 
      "Real-time collaboration tools",
      "Data-driven hiring decisions"
    ],
    cta: "Start Recruiting",
    color: "cyan"
  },
  employee: {
    title: "Land Your Dream Role",
    subtitle: "Showcase your true skills and get matched with opportunities",
    features: [
      "Build your verified profile",
      "AI interview preparation",
      "Skill assessment tracking",
      "Direct employer connections"
    ],
    cta: "Apply Now",
    color: "red"
  }
};

export default function LandingPage() {
  const [role, setRole] = useState<UserRole>("employee");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const content = roleContent[role];

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  return (
    <div className={clsx(
      "relative min-h-screen transition-colors duration-700 overflow-hidden",
      theme === "dark" ? "mesh-gradient-dark" : "mesh-gradient-light paper-texture"
    )}>
      {/* Grain overlay */}
      <div className="grain absolute inset-0 z-0" />
      
      {/* Floating orbs */}
      <motion.div
        className={clsx(
          "absolute w-96 h-96 rounded-full blur-3xl opacity-20",
          role === "recruiter" ? "bg-cyan-500" : "bg-red-500"
        )}
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ top: "10%", left: "10%" }}
      />
      
      <motion.div
        className={clsx(
          "absolute w-96 h-96 rounded-full blur-3xl opacity-20",
          role === "recruiter" ? "bg-purple-500" : "bg-orange-500"
        )}
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ bottom: "10%", right: "10%" }}
      />

      {/* Theme Toggle */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={toggleTheme}
        className={clsx(
          "fixed top-8 right-8 z-50 px-6 py-3 rounded-full font-display font-semibold tracking-wide",
          "transition-all duration-300 hover:scale-110",
          theme === "dark" 
            ? "glass-dark text-white hover:bg-white/20" 
            : "glass-light text-gray-900 hover:bg-black/10"
        )}
      >
        {theme === "dark" ? "☀️ LIGHT" : "🌙 DARK"}
      </motion.button>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16"
        >
          <h1 className={clsx(
            "font-display text-6xl md:text-8xl font-black tracking-tighter",
            theme === "dark" ? "text-white" : "text-black"
          )}>
            TRUTH
            <span className={clsx(
              "inline-block animate-glow",
              role === "recruiter" 
                ? "text-[#00D9FF]" 
                : "text-[#FF6B6B]"
            )}>
              TALENT
            </span>
          </h1>
        </motion.div>

        {/* Glass Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className={clsx(
            "w-full max-w-2xl rounded-3xl p-10 shadow-2xl relative overflow-hidden",
            theme === "dark" ? "glass-dark" : "glass-light"
          )}
        >
          {/* Role Toggle */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRole("employee")}
                className={clsx(
                  "px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all duration-300",
                  role === "employee"
                    ? theme === "dark"
                      ? "bg-[#FF6B6B] text-white shadow-lg shadow-red-500/50"
                      : "bg-[#FF6B6B] text-white shadow-lg shadow-red-500/30"
                    : theme === "dark"
                      ? "bg-white/10 text-white/60 hover:bg-white/20"
                      : "bg-black/5 text-black/50 hover:bg-black/10"
                )}
              >
                EMPLOYEE
              </motion.button>

              <div className={clsx(
                "w-12 h-12 rounded-full flex items-center justify-center font-display font-black text-xl",
                theme === "dark" ? "bg-white/20 text-white" : "bg-black/10 text-black"
              )}>
                ⟺
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRole("recruiter")}
                className={clsx(
                  "px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all duration-300",
                  role === "recruiter"
                    ? theme === "dark"
                      ? "bg-[#00D9FF] text-black shadow-lg shadow-cyan-500/50"
                      : "bg-[#00D9FF] text-black shadow-lg shadow-cyan-500/30"
                    : theme === "dark"
                      ? "bg-white/10 text-white/60 hover:bg-white/20"
                      : "bg-black/5 text-black/50 hover:bg-black/10"
                )}
              >
                RECRUITER
              </motion.button>
            </div>

            {/* Role Description */}
            <AnimatePresence mode="wait">
              <motion.p
                key={role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={clsx(
                  "text-center font-body text-sm",
                  theme === "dark" ? "text-white/70" : "text-black/70"
                )}
              >
                {role === "employee" 
                  ? "Create your profile, showcase skills, and connect with top companies"
                  : "Post jobs, discover talent, and build your dream team with AI-powered tools"}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Title */}
              <div className="text-center">
                <h2 className={clsx(
                  "font-display text-4xl md:text-5xl font-bold mb-3",
                  theme === "dark" ? "text-white" : "text-black",
                  role === "recruiter" && theme === "dark" && "text-glow-cyan",
                  role === "employee" && theme === "dark" && "text-glow-red"
                )}>
                  {content.title}
                </h2>
                <p className={clsx(
                  "font-body text-lg",
                  theme === "dark" ? "text-white/80" : "text-black/80"
                )}>
                  {content.subtitle}
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                {content.features.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={clsx(
                      "p-4 rounded-xl backdrop-blur-sm",
                      theme === "dark" 
                        ? "bg-white/5 border border-white/10" 
                        : "bg-white/50 border border-black/5"
                    )}
                  >
                    <p className={clsx(
                      "font-body text-sm font-medium text-center",
                      theme === "dark" ? "text-white/90" : "text-black/90"
                    )}>
                      {feature}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                className={clsx(
                  "w-full py-5 rounded-2xl font-display font-bold text-xl tracking-wide",
                  "transition-all duration-300 shadow-2xl",
                  role === "recruiter"
                    ? "bg-[#00D9FF] text-black hover:shadow-cyan-500/50"
                    : "bg-[#FF6B6B] text-white hover:shadow-red-500/50"
                )}
              >
                {content.cta} →
              </motion.button>

              {/* Sign Up Link */}
              <p className={clsx(
                "text-center font-body text-sm",
                theme === "dark" ? "text-white/60" : "text-black/60"
              )}>
                Don't have an account?{" "}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={handleLogin}
                  className={clsx(
                    "font-semibold underline underline-offset-2",
                    role === "recruiter" ? "text-[#00D9FF]" : "text-[#FF6B6B]"
                  )}
                >
                  Sign up free
                </motion.button>
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Footer Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16"
        >
          <div className={clsx(
            "px-8 py-3 rounded-full font-body text-sm",
            theme === "dark" 
              ? "glass-dark text-white/80" 
              : "glass-light text-black/80"
          )}>
            Powered by AI • Verified Skills • Transparent Hiring
          </div>
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        role={role}
      />
    </div>
  );
}
