"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string;
}

export default function RecruiterDashboard() {
  const { theme, toggleTheme } = useTheme();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"jobs" | "upload" | "create">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  
  // Form state for creating new jobs
  const [newJob, setNewJob] = useState<Omit<Job, "id">>({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    salary: "",
    description: "",
    requirements: "",
  });

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  // Parse CSV file
  const parseCSV = (text: string): Job[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const job: any = { id: Date.now() + index + '' };
      
      headers.forEach((header, i) => {
        if (header === 'title') job.title = values[i] || '';
        else if (header === 'company') job.company = values[i] || '';
        else if (header === 'location') job.location = values[i] || '';
        else if (header === 'type') job.type = values[i] || 'Full-time';
        else if (header === 'salary') job.salary = values[i] || '';
        else if (header === 'description') job.description = values[i] || '';
        else if (header === 'requirements') job.requirements = values[i] || '';
      });
      
      return job as Job;
    });
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let parsedJobs: Job[] = [];

        if (file.name.endsWith('.csv')) {
          parsedJobs = parseCSV(text);
        } else if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          parsedJobs = (Array.isArray(data) ? data : [data]).map((job, index) => ({
            id: Date.now() + index + '',
            title: job.title || '',
            company: job.company || '',
            location: job.location || '',
            type: job.type || 'Full-time',
            salary: job.salary || '',
            description: job.description || '',
            requirements: job.requirements || '',
          }));
        }

        // Save jobs via API
        await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobs: parsedJobs }),
        });

        setJobs(prev => [...prev, ...parsedJobs]);
        alert(`Successfully uploaded ${parsedJobs.length} job(s)`);
        setActiveTab("jobs");
      } catch (error) {
        alert("Failed to parse file. Please check the format.");
      }
      setIsUploading(false);
    };
    
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Create new job
  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.company) {
      alert("Please fill in at least title and company");
      return;
    }

    const job: Job = {
      id: Date.now() + '',
      ...newJob,
    };

    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: [job] }),
      });

      setJobs(prev => [...prev, job]);
      setNewJob({
        title: "",
        company: "",
        location: "",
        type: "Full-time",
        salary: "",
        description: "",
        requirements: "",
      });
      alert("Job posted successfully!");
      setActiveTab("jobs");
    } catch (error) {
      alert("Failed to create job");
    }
  };

  // Delete job
  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      await fetch(`/api/jobs/${id}`, {
        method: "DELETE",
      });
      setJobs(prev => prev.filter(job => job.id !== id));
    } catch (error) {
      alert("Failed to delete job");
    }
  };

  // Update job
  const handleUpdateJob = async () => {
    if (!editingJob) return;

    try {
      await fetch(`/api/jobs/${editingJob.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingJob),
      });

      setJobs(prev => prev.map(job => job.id === editingJob.id ? editingJob : job));
      setEditingJob(null);
      alert("Job updated successfully!");
    } catch (error) {
      alert("Failed to update job");
    }
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
              Recruiter Dashboard
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
            onClick={() => setActiveTab("jobs")}
            className={clsx(
              "px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all",
              activeTab === "jobs"
                ? "bg-[#00D9FF] text-black shadow-lg"
                : theme === "dark"
                  ? "glass-dark text-white/60 hover:text-white"
                  : "glass-light text-black/60 hover:text-black"
            )}
          >
            All Jobs ({jobs.length})
          </button>
          
          <button
            onClick={() => setActiveTab("upload")}
            className={clsx(
              "px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all",
              activeTab === "upload"
                ? "bg-[#00D9FF] text-black shadow-lg"
                : theme === "dark"
                  ? "glass-dark text-white/60 hover:text-white"
                  : "glass-light text-black/60 hover:text-black"
            )}
          >
            Upload CSV/JSON
          </button>

          <button
            onClick={() => setActiveTab("create")}
            className={clsx(
              "px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all",
              activeTab === "create"
                ? "bg-[#00D9FF] text-black shadow-lg"
                : theme === "dark"
                  ? "glass-dark text-white/60 hover:text-white"
                  : "glass-light text-black/60 hover:text-black"
            )}
          >
            Create Job
          </button>
        </div>

        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {jobs.length === 0 ? (
              <div className={clsx(
                "rounded-3xl p-12 text-center",
                theme === "dark" ? "glass-dark" : "glass-light"
              )}>
                <p className={clsx(
                  "font-body text-lg",
                  theme === "dark" ? "text-white/70" : "text-black/70"
                )}>
                  No jobs posted yet. Create a job or upload from CSV/JSON.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                      "rounded-2xl p-6",
                      theme === "dark" ? "glass-dark" : "glass-light"
                    )}
                  >
                    {editingJob?.id === job.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={editingJob.title}
                            onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                            className={clsx(
                              "px-4 py-2 rounded-xl font-body",
                              theme === "dark"
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/70 text-black border border-black/20"
                            )}
                            placeholder="Job Title"
                          />
                          <input
                            type="text"
                            value={editingJob.company}
                            onChange={(e) => setEditingJob({ ...editingJob, company: e.target.value })}
                            className={clsx(
                              "px-4 py-2 rounded-xl font-body",
                              theme === "dark"
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/70 text-black border border-black/20"
                            )}
                            placeholder="Company"
                          />
                          <input
                            type="text"
                            value={editingJob.location}
                            onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                            className={clsx(
                              "px-4 py-2 rounded-xl font-body",
                              theme === "dark"
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/70 text-black border border-black/20"
                            )}
                            placeholder="Location"
                          />
                          <select
                            value={editingJob.type}
                            onChange={(e) => setEditingJob({ ...editingJob, type: e.target.value })}
                            className={clsx(
                              "px-4 py-2 rounded-xl font-body",
                              theme === "dark"
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/70 text-black border border-black/20"
                            )}
                          >
                            <option>Full-time</option>
                            <option>Part-time</option>
                            <option>Contract</option>
                            <option>Internship</option>
                          </select>
                          <input
                            type="text"
                            value={editingJob.salary}
                            onChange={(e) => setEditingJob({ ...editingJob, salary: e.target.value })}
                            className={clsx(
                              "px-4 py-2 rounded-xl font-body md:col-span-2",
                              theme === "dark"
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/70 text-black border border-black/20"
                            )}
                            placeholder="Salary Range"
                          />
                          <textarea
                            value={editingJob.description}
                            onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                            className={clsx(
                              "px-4 py-2 rounded-xl font-body md:col-span-2 resize-none",
                              theme === "dark"
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/70 text-black border border-black/20"
                            )}
                            placeholder="Job Description"
                            rows={3}
                          />
                          <textarea
                            value={editingJob.requirements}
                            onChange={(e) => setEditingJob({ ...editingJob, requirements: e.target.value })}
                            className={clsx(
                              "px-4 py-2 rounded-xl font-body md:col-span-2 resize-none",
                              theme === "dark"
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/70 text-black border border-black/20"
                            )}
                            placeholder="Requirements"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleUpdateJob}
                            className="px-6 py-2 rounded-xl font-body font-semibold bg-[#00D9FF] text-black hover:shadow-lg transition-all"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingJob(null)}
                            className={clsx(
                              "px-6 py-2 rounded-xl font-body font-semibold transition-all",
                              theme === "dark"
                                ? "bg-white/10 text-white hover:bg-white/20"
                                : "bg-black/10 text-black hover:bg-black/20"
                            )}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className={clsx(
                              "font-display text-2xl font-bold mb-2",
                              theme === "dark" ? "text-white" : "text-black"
                            )}>
                              {job.title}
                            </h3>
                            <div className="flex flex-wrap gap-3 font-body text-sm">
                              <span className={clsx(
                                "px-3 py-1 rounded-full",
                                theme === "dark" ? "bg-white/10 text-white/80" : "bg-black/10 text-black/80"
                              )}>
                                {job.company}
                              </span>
                              <span className={clsx(
                                "px-3 py-1 rounded-full",
                                theme === "dark" ? "bg-white/10 text-white/80" : "bg-black/10 text-black/80"
                              )}>
                                {job.location}
                              </span>
                              <span className="px-3 py-1 rounded-full bg-[#00D9FF] text-black">
                                {job.type}
                              </span>
                              {job.salary && (
                                <span className={clsx(
                                  "px-3 py-1 rounded-full",
                                  theme === "dark" ? "bg-white/10 text-white/80" : "bg-black/10 text-black/80"
                                )}>
                                  {job.salary}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingJob(job)}
                              className={clsx(
                                "px-4 py-2 rounded-xl font-body font-semibold text-sm transition-all",
                                theme === "dark"
                                  ? "bg-white/10 text-white hover:bg-white/20"
                                  : "bg-black/10 text-black hover:bg-black/20"
                              )}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="px-4 py-2 rounded-xl font-body font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        
                        {job.description && (
                          <div className="mb-4">
                            <h4 className={clsx(
                              "font-display font-bold mb-2",
                              theme === "dark" ? "text-white" : "text-black"
                            )}>
                              Description
                            </h4>
                            <p className={clsx(
                              "font-body text-sm",
                              theme === "dark" ? "text-white/70" : "text-black/70"
                            )}>
                              {job.description}
                            </p>
                          </div>
                        )}
                        
                        {job.requirements && (
                          <div>
                            <h4 className={clsx(
                              "font-display font-bold mb-2",
                              theme === "dark" ? "text-white" : "text-black"
                            )}>
                              Requirements
                            </h4>
                            <p className={clsx(
                              "font-body text-sm",
                              theme === "dark" ? "text-white/70" : "text-black/70"
                            )}>
                              {job.requirements}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Upload Tab */}
        {activeTab === "upload" && (
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
              Upload Jobs from CSV or JSON
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-3",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Select File (CSV or JSON)
                </label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body cursor-pointer",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#00D9FF] file:text-black file:font-semibold"
                      : "bg-white/70 text-black border border-black/20 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#00D9FF] file:text-black file:font-semibold"
                  )}
                />
              </div>

              <div className={clsx(
                "p-6 rounded-xl",
                theme === "dark" ? "bg-white/5" : "bg-black/5"
              )}>
                <h3 className={clsx(
                  "font-display font-bold mb-3",
                  theme === "dark" ? "text-white" : "text-black"
                )}>
                  CSV Format Example
                </h3>
                <pre className={clsx(
                  "font-mono text-xs overflow-x-auto",
                  theme === "dark" ? "text-white/70" : "text-black/70"
                )}>
{`title,company,location,type,salary,description,requirements
Software Engineer,TechCorp,Remote,Full-time,$120k-$150k,Build amazing products,5+ years experience
Product Manager,StartupXYZ,San Francisco,Full-time,$140k-$180k,Lead product development,3+ years PM experience`}
                </pre>
              </div>

              <div className={clsx(
                "p-6 rounded-xl",
                theme === "dark" ? "bg-white/5" : "bg-black/5"
              )}>
                <h3 className={clsx(
                  "font-display font-bold mb-3",
                  theme === "dark" ? "text-white" : "text-black"
                )}>
                  JSON Format Example
                </h3>
                <pre className={clsx(
                  "font-mono text-xs overflow-x-auto",
                  theme === "dark" ? "text-white/70" : "text-black/70"
                )}>
{`[
  {
    "title": "Software Engineer",
    "company": "TechCorp",
    "location": "Remote",
    "type": "Full-time",
    "salary": "$120k-$150k",
    "description": "Build amazing products",
    "requirements": "5+ years experience"
  }
]`}
                </pre>
              </div>
            </div>
          </motion.div>
        )}

        {/* Create Tab */}
        {activeTab === "create" && (
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
              Create New Job Posting
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Job Title *
                </label>
                <input
                  type="text"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#00D9FF] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#00D9FF] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Company *
                </label>
                <input
                  type="text"
                  value={newJob.company}
                  onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                  placeholder="e.g., TechCorp Inc."
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#00D9FF] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#00D9FF] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Location
                </label>
                <input
                  type="text"
                  value={newJob.location}
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  placeholder="e.g., Remote, San Francisco, Hybrid"
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#00D9FF] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#00D9FF] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div>
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Job Type
                </label>
                <select
                  value={newJob.type}
                  onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#00D9FF]"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#00D9FF]",
                    "focus:outline-none transition-colors"
                  )}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Salary Range
                </label>
                <input
                  type="text"
                  value={newJob.salary}
                  onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                  placeholder="e.g., $120k - $150k"
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#00D9FF] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#00D9FF] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Job Description
                </label>
                <textarea
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
                  rows={5}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body resize-none",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#00D9FF] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#00D9FF] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <label className={clsx(
                  "block font-body text-sm font-semibold mb-2",
                  theme === "dark" ? "text-white/90" : "text-black/90"
                )}>
                  Requirements
                </label>
                <textarea
                  value={newJob.requirements}
                  onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                  placeholder="List the required skills, experience, and qualifications..."
                  rows={5}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-body resize-none",
                    theme === "dark"
                      ? "bg-white/10 text-white border border-white/20 focus:border-[#00D9FF] placeholder:text-white/40"
                      : "bg-white/70 text-black border border-black/20 focus:border-[#00D9FF] placeholder:text-black/40",
                    "focus:outline-none transition-colors"
                  )}
                />
              </div>
            </div>

            <button
              onClick={handleCreateJob}
              className="mt-8 px-8 py-4 rounded-2xl font-display font-bold text-lg bg-[#00D9FF] text-black hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Post Job
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
