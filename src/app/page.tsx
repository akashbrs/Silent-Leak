"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, MapPin, ChevronRight, CheckCircle2, Lock, FileSearch, HelpCircle } from "lucide-react";

const clientQuestions = [
  "Based on the adversary's observed tradecraft, classify the primary attack methodology employed during this incident.",
  "Identify the threat actor that publicly claimed responsibility for compromising the victim's environment.",
  "Determine the Indian state in which the compromised manufacturing facility is geographically located.",
  "Identify the industrial city hosting the manufacturing campus referenced throughout the incident reporting.",
  "According to threat intelligence reporting, what was the approximate volume of data the adversary claimed to have exfiltrated from the victim's environment?",
  "Estimate the total number of files reportedly included within the adversary's published leak inventory.",
  "Name the two multinational technology organisations reportedly referenced within the compromised dataset.",
  "Assess the adversary's primary post-compromise objective based on observed behaviour and public communications.",
  "Following the organisation's official statement, were physical manufacturing operations materially disrupted by the cyber incident?",
  "Identify the national Computer Emergency Response Team responsible for coordinating the government's response to this incident.",
  "Which specialist incident response and cyber defence organisation reportedly assisted during the forensic investigation?",
  "Based on the complete intelligence picture, determine the final incident classification assigned to this compromise."
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<"scenario" | "questions">("scenario");
  const [answers, setAnswers] = useState<string[]>(Array(clientQuestions.length).fill(""));
  const [solved, setSolved] = useState<boolean[]>(Array(clientQuestions.length).fill(false));
  const [verifying, setVerifying] = useState<boolean[]>(Array(clientQuestions.length).fill(false));
  const [errors, setErrors] = useState<boolean[]>(Array(clientQuestions.length).fill(false));
  const [completed, setCompleted] = useState(false);
  const [coordinates, setCoordinates] = useState("");
  const [globalLoading, setGlobalLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/session/state");
      const data = await res.json();
      
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }

      if (data.solved && Object.keys(data.solved).length > 0) {
        const newSolved = Array(clientQuestions.length).fill(false);
        const newAnswers = Array(clientQuestions.length).fill("");
        
        Object.entries(data.solved).forEach(([idxStr, ansStr]) => {
          const idx = parseInt(idxStr, 10);
          newSolved[idx] = true;
          newAnswers[idx] = ansStr as string;
        });
        
        setSolved(newSolved);
        setAnswers(newAnswers);
        setStarted(true);
        setActiveTab("questions");
      }

      if (data.completed && data.coordinates) {
        setCompleted(true);
        setCoordinates(data.coordinates);
      }
    } catch (err) {
      console.error("Failed to fetch session state");
    }
  };

  const startInvestigation = async () => {
    if (csrfToken) {
      setStarted(true);
      return;
    }
    
    setGlobalLoading(true);
    try {
      const res = await fetch("/api/session", { method: "POST" });
      const data = await res.json();
      if (data.success && data.csrfToken) {
        setCsrfToken(data.csrfToken);
        setStarted(true);
      }
    } catch (err) {
      console.error("Failed to start session");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleVerifyOne = async (index: number) => {
    if (verifying[index] || solved[index] || !answers[index].trim()) return;
    
    setVerifying(v => { const n = [...v]; n[index] = true; return n; });
    setErrors(e => { const n = [...e]; n[index] = false; return n; });

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: index, answer: answers[index], csrfToken }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.solved) {
          const newSolved = Array(clientQuestions.length).fill(false);
          data.solved.forEach((idxStr: string) => {
            newSolved[parseInt(idxStr, 10)] = true;
          });
          setSolved(newSolved);
        }

        if (data.completed && data.coordinates) {
          setCompleted(true);
          setCoordinates(data.coordinates);
        }
      } else {
        setErrors(e => { const n = [...e]; n[index] = true; return n; });
        setTimeout(() => setErrors(e => { const n = [...e]; n[index] = false; return n; }), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(v => { const n = [...v]; n[index] = false; return n; });
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 selection:bg-cyan-500/30 font-sans relative overflow-x-hidden pb-24">
      {/* Background glow effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-neutral-950/80 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => setStarted(false)}
            className="flex items-center gap-2 text-white font-bold text-lg tracking-tight hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-5 h-5 text-cyan-500" />
            Silent Leak challenge(OSINT)
          </button>
          
          {started && !completed && (
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("scenario")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "scenario" ? "bg-white/10 text-cyan-400" : "text-neutral-400 hover:text-white"
                }`}
              >
                <FileSearch className="w-4 h-4" /> Evidence
              </button>
              <button
                onClick={() => setActiveTab("questions")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "questions" ? "bg-white/10 text-cyan-400" : "text-neutral-400 hover:text-white"
                }`}
              >
                <HelpCircle className="w-4 h-4" /> Questions
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-32 relative z-10 flex flex-col min-h-[calc(100vh-8rem)]">
        <AnimatePresence mode="wait">
          {!started ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 mt-12 md:mt-24"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-mono mb-4">
                <ShieldAlert className="w-4 h-4" />
                <span>Silent-Leak</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-sm">
                Data <span className="text-cyan-500">Extortion</span>
              </h1>
              
              <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                Investigate the recent massive data breach. Read the intercepted intelligence report and answer the OSINT questions to unlock the final coordinates.
                <br /><br />
                <span className="text-cyan-400 font-mono text-sm border border-cyan-500/30 bg-cyan-900/20 px-3 py-1.5 rounded-lg inline-block">
                  Flag Format: BSCTF{'{answer}'}
                </span>
              </p>

              <button
                onClick={startInvestigation}
                disabled={globalLoading}
                className="mt-8 group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-neutral-950 font-semibold rounded-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {globalLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Enter Investigation
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>
          ) : completed ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl mx-auto mt-12"
            >
              <div className="relative overflow-hidden rounded-2xl bg-neutral-900/50 border border-cyan-500/30 p-8 md:p-12 backdrop-blur-xl shadow-2xl text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />
                <div className="mx-auto w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-6 border border-cyan-500/40">
                  <MapPin className="w-8 h-8 text-cyan-400" />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-4">Investigation Complete</h2>
                <p className="text-neutral-400 mb-8">
                  You have successfully corroborated all details of the data extortion incident. The hidden facility coordinates have been decrypted.
                </p>

                <div className="bg-black/40 border border-white/10 rounded-xl p-6 font-mono">
                  <p className="text-sm text-neutral-500 mb-2 uppercase tracking-widest">Target Coordinates</p>
                  <p className="text-2xl md:text-4xl text-cyan-400 font-bold tracking-wider">{coordinates}</p>
                </div>
              </div>
            </motion.div>
          ) : activeTab === "scenario" ? (
            <motion.div
              key="scenario"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full space-y-8"
            >
              <div className="p-8 rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur-md">
                <h2 className="text-2xl text-white font-semibold mb-6 flex items-center gap-3">
                  <FileSearch className="w-6 h-6 text-cyan-400" /> Intelligence Briefing
                </h2>
                
                <div className="prose prose-invert max-w-none text-neutral-300 space-y-4">
                  <h3 className="text-xl font-bold text-white mb-2">EYES ONLY – OPERATION SHADOW CIRCUIT</h3>
                  
                  <p>
                    A strategic manufacturing partner within one of India's largest industrial conglomerates has recently appeared on the leak portal of a relatively new extortion collective. Unlike conventional ransomware campaigns, the operators have favoured the publication of stolen information over the disruption of production systems, suggesting a shift in operational strategy.
                  </p>
                  
                  <p>
                    The victim plays a significant role in the global electronics supply chain and is responsible for manufacturing components for internationally recognised technology brands. Public reporting indicates that the organisation's primary production campus is situated in a rapidly expanding industrial corridor in southern India, only a short distance from the country's largest technology hub.
                  </p>
                  
                  <p>
                    Threat intelligence sources indicate that the adversary advertised a substantial collection of exfiltrated corporate material. The archive is believed to contain technical documentation, internal communications, enterprise resource planning records, identity-related material and quality assurance artefacts. Independent researchers have also observed references to documents associated with multiple multinational technology companies whose products reach hundreds of millions of consumers worldwide.
                  </p>
                  
                  <p>
                    Although the attackers have attempted to maximise public attention through their disclosure strategy, the organisation has stated that manufacturing activities continued without interruption while incident response procedures were initiated. Government authorities, together with an internationally recognised digital incident response organisation, have reportedly coordinated efforts to assess the scope of the compromise.
                  </p>
                  
                  <p>
                    Field analysts should avoid assuming that every public claim made by the adversary is accurate. Multiple independent sources must be correlated before drawing conclusions. Intelligence gathered from official statements, reputable news organisations, corporate disclosures, mapping services and publicly available records should be combined to establish the most reliable assessment.
                  </p>

                  <h3 className="text-xl font-bold text-white mt-8 mb-2">Mission</h3>
                  
                  <p>
                    Your objective is to reconstruct the complete incident timeline by answering intelligence checkpoints on this secure terminal. Each verified finding will unlock another stage of the investigation. 
                  </p>
                  
                  <p className="mt-4 text-rose-200">
                    <strong>Important:</strong> The final target location is strictly classified. Do not attempt to guess or geolocate the facility using this briefing alone. Once you successfully validate all intelligence requirements on this platform, our internal system will automatically decrypt and reveal the highly-classified geographic coordinates required to complete the operation.
                  </p>
                  
                  <p className="mt-8 pt-6 border-t border-white/10 text-cyan-400/80 font-mono text-sm">
                    <strong>Remember:</strong> Individual facts are rarely sufficient. Correlation of multiple sources is the key to successful intelligence analysis.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <div className="mb-8 font-mono text-cyan-500 text-sm flex items-center gap-2 justify-center bg-cyan-900/20 border border-cyan-500/20 py-2 px-4 rounded-full w-max mx-auto">
                <ShieldAlert className="w-4 h-4" />
                FLAGS EXTRACTED: {solved.filter(Boolean).length} / {clientQuestions.length}
              </div>

              <div className="space-y-6">
                {clientQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-6 rounded-2xl border backdrop-blur-md transition-colors ${
                      solved[idx] ? 'bg-cyan-900/10 border-cyan-500/30' : 'bg-neutral-900/40 border-white/10'
                    }`}
                  >
                    <h3 className="text-lg text-white mb-4 flex gap-3">
                      <span className="text-neutral-500 font-mono">{String(idx + 1).padStart(2, '0')}.</span>
                      {q}
                    </h3>
                    
                    <div className="flex gap-3 items-center">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={answers[idx]}
                          onChange={(e) => {
                            const newAnswers = [...answers];
                            newAnswers[idx] = e.target.value;
                            setAnswers(newAnswers);
                          }}
                          placeholder="BSCTF{...}"
                          disabled={solved[idx] || verifying[idx] || globalLoading}
                          className={`w-full bg-black/50 border rounded-xl px-4 py-3 font-mono text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 transition-all ${
                            solved[idx] ? 'border-cyan-500/50 text-cyan-400' :
                            errors[idx] ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-cyan-500'
                          }`}
                        />
                        {errors[idx] && (
                          <Lock className="w-4 h-4 text-red-500 absolute right-4 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      
                      {solved[idx] ? (
                        <div className="h-11 px-4 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center border border-cyan-500/30">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleVerifyOne(idx)}
                          disabled={!answers[idx].trim() || verifying[idx] || globalLoading}
                          className="h-11 px-6 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 disabled:opacity-50 transition-all flex items-center justify-center min-w-[100px]"
                        >
                          {verifying[idx] ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          ) : "Submit"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
