"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface ProfileData {
  name: string;
  email: string;
  githubUrl: string;
  linkedinUrl: string;
  currentWork: string;
  education: string;
  bio: string;
}

export default function EmployeeDashboard() {
  const { theme, toggleTheme } = useTheme();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "projects">("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    githubUrl: "",
    linkedinUrl: "",
    currentWork: "",
    education: "",
    bio: "",
  });
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
    if (session?.user) {
      setProfileData({
        name: session.user.name || "",
        email: session.user.email || "",
        githubUrl: (session.user as any).githubUrl || "",
        linkedinUrl: (session.user as any).linkedinUrl || "",
        currentWork: (session.user as any).currentWork || "",
        education: (session.user as any).education || "",
        bio: (session.user as any).bio || "",
      });
    }
  }, [session, isPending, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      alert("Profile saved successfully!");
    } catch (error) {
      alert("Failed to save profile");
    }
    setIsSaving(false);
  };

  const fetchGithubRepos = async () => {
    if (!profileData.githubUrl) {
      alert("Please enter your GitHub URL first");
      return;
    }
    
    setIsLoadingRepos(true);
    try {
      const username = profileData.githubUrl.split("github.com/")[1]?.split("/")[0];
      const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
      const repos = await response.json();
      setGithubRepos(repos);
    } catch (error) {
      alert("Failed to fetch GitHub repos");
    }
    setIsLoadingRepos(false);
  };

  const toggleProjectSelection = (repoId: string) => {
    setSelectedProjects(prev => 
      prev.includes(repoId) 
        ? prev.filter(id => id !== repoId)
        : [...prev, repoId]
    );
  };

  return (
    <div className={clsx(
      "min-h-screen transition-colors duration-700",
      theme === "dark" ? "mesh-gradient-dark" : "mesh-gradient-light paper-texture"
    )}>
      <div className="grain absolute inset-0 z-0" />
      
      {/* Header */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className={clsx(
              "font-display text-3xl font-bold",
              theme === "dark" ? "text-white" : "text-black"
            )}>
              Employee Dashboard
            </h1>
            
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={clsx(
                  "px-4 py-2 rounded-full font-display font-semibold text-sm",
                  theme === "dark" 
                    ? "glass-dark text-white hover:bg-white/20" 
                    : "glass-light text-gray-900 hover:bg-black/10"
                )}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              
              <button
                onClick={handleLogout}
                className="px-6 py-2 rounded-full font-body font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("profile")}
            className={clsx(
              "px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all",
              activeTab === "profile"
                ? "bg-[#FF6B6B] text-white shadow-lg"
                : theme === "dark"
                  ? "glass-dark text-white/60 hover:text-white"
                  : "glass-light text-black/60 hover:text-black"
            )}
          >
            Profile
          </button>
          
          <button
            onClick={() => setActiveTab("projects")}
            className={clsx(
              "px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all",
              activeTab === "projects"
                ? "bg-[#FF6B6B] text-white shadow-lg"
                : theme === "dark"
                  ? "glass-dark text-white/60 hover:text-white"
                  : "glass-light text-black/60 hover:text-black"
            )}
          >
            Projects
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              "rounded-3xl p-8",
              theme === "dark" ? "glass-dark" : "glass-light"
            )}
          >
            <h2 className={clsx(
              "font-display text-2xl font-bold mb-6",
              theme === "dark" ? "text-white" : "text-black"
            )}>
              Profile Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#FF6B6B]"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#FF6B6B]",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body opacity-60 cursor-not-allowed",
                    theme === "dark"
                      ? "bg-white/5 text-white border border-white/10"
                      : "bg-black/5 text-black border border-black/10"
                  )}
                />
              </div>

              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  GitHub URL
                </label>
                <input
                  type="url"
                  value={profileData.githubUrl}
                  onChange={(e) => setProfileData({ ...profileData, githubUrl: e.target.value })}
                  placeholder="https://github.com/username"
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#FF6B6B] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#FF6B6B] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={profileData.linkedinUrl}
                  onChange={(e) => setProfileData({ ...profileData, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#FF6B6B] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#FF6B6B] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Current Status
                </label>
                <input
                  type="text"
                  value={profileData.currentWork}
                  onChange={(e) => setProfileData({ ...profileData, currentWork: e.target.value })}
                  placeholder="e.g., Software Engineer at Company or Student at University"
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#FF6B6B] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#FF6B6B] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Education
                </label>
                <input
                  type="text"
                  value={profileData.education}
                  onChange={(e) => setProfileData({ ...profileData, education: e.target.value })}
                  placeholder="e.g., B.S. Computer Science, MIT"
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#FF6B6B] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#FF6B6B] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body resize-none",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#FF6B6B] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#FF6B6B] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="mt-8 px-8 py-4 rounded-2xl font-display font-bold text-lg bg-[#FF6B6B] text-white hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </motion.div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              "rounded-3xl p-8",
              theme === "dark" ? "glass-dark" : "glass-light"
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={clsx(
                "font-display text-2xl font-bold",
                theme === "dark" ? "text-white" : "text-black"
              )}>
                Import Projects from GitHub
              </h2>
              
              <button
                onClick={fetchGithubRepos}
                disabled={isLoadingRepos || !profileData.githubUrl}
                className="px-6 py-3 rounded-xl font-body font-semibold bg-[#FF6B6B] text-white hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isLoadingRepos ? "Loading..." : "Fetch Repositories"}
              </button>
            </div>

            {githubRepos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {githubRepos.map((repo) => (
                  <motion.div
                    key={repo.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => toggleProjectSelection(repo.id.toString())}
                    className={clsx(
                      "p-4 rounded-xl cursor-pointer transition-all",
                      selectedProjects.includes(repo.id.toString())
                        ? "bg-[#FF6B6B] text-white shadow-lg"
                        : theme === "dark"
                          ? "bg-white/5 border border-white/10 hover:bg-white/10"
                          : "bg-white/50 border border-black/5 hover:bg-white/70"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-body font-bold text-sm">{repo.name}</h3>
                      {selectedProjects.includes(repo.id.toString()) && (
                        <span className="text-xl">✓</span>
                      )}
                    </div>
                    <p className={clsx(
                      "font-body text-xs mb-3 line-clamp-2",
                      selectedProjects.includes(repo.id.toString())
                        ? "text-white/80"
                        : theme === "dark" ? "text-white/60" : "text-black/60"
                    )}>
                      {repo.description || "No description"}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      {repo.language && (
                        <span className={clsx(
                          "px-2 py-1 rounded",
                          selectedProjects.includes(repo.id.toString())
                            ? "bg-white/20"
                            : "bg-black/10"
                        )}>
                          {repo.language}
                        </span>
                      )}
                      <span>⭐ {repo.stargazers_count}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className={clsx(
                "text-center py-12",
                theme === "dark" ? "text-white/60" : "text-black/60"
              )}>
                <p className="font-body text-lg mb-2">No projects loaded</p>
                <p className="font-body text-sm">
                  Enter your GitHub URL in the Profile tab and click "Fetch Repositories"
                </p>
              </div>
            )}

            {selectedProjects.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  className="px-8 py-4 rounded-2xl font-display font-bold text-lg bg-[#FF6B6B] text-white hover:shadow-lg hover:shadow-red-500/50 transition-all"
                >
                  Save Selected Projects ({selectedProjects.length})
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
