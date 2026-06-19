"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, UploadCloud, FileText, X, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const POPULAR_SKILLS = [
  "React", "Node.js", "TypeScript", "Python", "Java", "C++", "AWS", "Docker", "Kubernetes", "SQL", "NoSQL", "GraphQL", "Figma", "UI/UX", "Marketing", "SEO", "Sales", "Project Management"
];

const POPULAR_EDUCATION = [
  "B.S. Computer Science", "B.A. Business Administration", "M.S. Data Science", "High School Diploma", "Associate Degree", "Bootcamp Graduate"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    experience: "",
    location: "",
    workHistory: "",
  });

  const [skillsChips, setSkillsChips] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  const [eduChips, setEduChips] = useState<string[]>([]);
  const [customEdu, setCustomEdu] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isGibberish = (str: string) => {
    const text = str.trim();
    if (!text) return false;
    
    if (/(.)\1{3,}/.test(text)) return true; // 4 identical chars
    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(text)) return true; // 5 consecutive consonants
    if (text.length > 4 && !/[aeiouy]/i.test(text)) return true; // No vowels and > 4 chars
    if (text.split(' ').some(word => word.length > 20)) return true; // Unusually long word
    return false;
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.title.trim() || formData.title.length < 2) {
        toast.error("Please enter a valid job title.");
        return false;
      }
      if (isGibberish(formData.title)) {
        toast.error("Job title looks like random text. Please enter a real title.");
        return false;
      }
      const exp = Number(formData.experience);
      if (formData.experience === "" || isNaN(exp) || exp < 0 || exp > 50) {
        toast.error("Please enter a realistic years of experience (0-50).");
        return false;
      }
      if (!formData.location.trim() || formData.location.length < 2) {
        toast.error("Please enter a valid location.");
        return false;
      }
      if (isGibberish(formData.location)) {
        toast.error("Location looks like random text. Please enter a real location.");
        return false;
      }
    }
    
    if (step === 2) {
      if (eduChips.length === 0) {
        toast.error("Please add at least one education or degree.");
        return false;
      }
      for (const edu of eduChips) {
        if (isGibberish(edu)) {
          toast.error(`Education "${edu}" looks like random text.`);
          return false;
        }
      }
    }

    if (step === 3) {
      if (skillsChips.length === 0) {
        toast.error("Please add at least one skill.");
        return false;
      }
      for (const skill of skillsChips) {
        if (isGibberish(skill)) {
          toast.error(`Skill "${skill}" looks like random text.`);
          return false;
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setIsParsing(true);
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/onboarding/parse-resume", {
        method: "POST",
        body: data,
      });

      if (!res.ok) throw new Error("Failed to parse resume");

      const parsedData = await res.json();
      setFormData({
        title: parsedData.title || "",
        experience: parsedData.experience ? parsedData.experience.toString() : "",
        location: parsedData.location || "",
        workHistory: parsedData.workHistory || "",
      });

      if (parsedData.skills) {
        setSkillsChips(parsedData.skills.split(",").map((s: string) => s.trim()).filter(Boolean));
      }
      if (parsedData.education) {
        // Just throw the whole education string as one chip to start, or let them split it
        setEduChips([parsedData.education.trim()].filter(Boolean));
      }

      toast.success("Resume parsed successfully!");
      setStep(1);
    } catch (error) {
      console.error(error);
      toast.error("Failed to parse resume. You can enter details manually.");
      setStep(1);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const handleSubmit = async () => {
    if (formData.workHistory && formData.workHistory.trim().length < 10) {
      toast.error("If providing work history, please add a bit more detail.");
      return;
    }
    if (formData.workHistory && isGibberish(formData.workHistory)) {
      toast.error("Work history looks like random text. Please provide real details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalData = {
        ...formData,
        skills: skillsChips.join(", "),
        education: eduChips.join(" | "),
      };

      const res = await fetch("/api/onboarding/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      if (!res.ok) throw new Error("Failed to generate resume");

      toast.success("Resume generated successfully! Welcome to JobCrab.");
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill.trim() && !skillsChips.includes(skill.trim())) {
      setSkillsChips([...skillsChips, skill.trim()]);
    }
    setCustomSkill("");
  };

  const removeSkill = (skill: string) => {
    setSkillsChips(skillsChips.filter((s) => s !== skill));
  };

  const addEdu = (edu: string) => {
    if (edu.trim() && !eduChips.includes(edu.trim())) {
      setEduChips([...eduChips, edu.trim()]);
    }
    setCustomEdu("");
  };

  const removeEdu = (edu: string) => {
    setEduChips(eduChips.filter((e) => e !== edu));
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl shadow-xl border-border bg-card/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="text-center relative pb-2">
          <div className="flex justify-center mb-4">
            <Image src="/images/logo.png" alt="JobCrab Logo" width={300} height={80} className="h-16 w-auto object-contain scale-150" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome aboard!</CardTitle>
          <CardDescription className="text-md">
            {step === 0 && "Upload your existing resume to fast-track your setup."}
            {step > 0 && `Let's refine your profile. Step ${step} of 4`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="min-h-[450px] flex flex-col justify-center relative">
          <AnimatePresence mode="wait" custom={1}>
            {step === 0 && (
              <motion.div key="step0" initial="enter" animate="center" exit="exit" variants={slideVariants} transition={{ duration: 0.3 }} className="space-y-6 w-full">
                <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}`}>
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      {isParsing ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <UploadCloud className="h-8 w-8 text-primary" />}
                    </div>
                    {isParsing ? (
                      <div>
                        <p className="font-medium text-lg">Parsing Resume...</p>
                        <p className="text-sm text-muted-foreground">Extracting your skills and history by AI.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-lg">Drag & Drop your Resume (PDF)</p>
                        <p className="text-sm text-muted-foreground">We'll automatically extract your details to save you time.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                </div>
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setStep(1)} className="w-full max-w-sm h-12">
                    <FileText className="mr-2 h-4 w-4" /> Enter details manually
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial="enter" animate="center" exit="exit" variants={slideVariants} transition={{ duration: 0.3 }} className="space-y-6 w-full">
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-base">Current / Target Job Title</Label>
                  <Input id="title" name="title" className="h-12 text-lg" placeholder="e.g. Frontend Developer" value={formData.title} onChange={handleChange} />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="experience" className="text-base">Years of Experience</Label>
                  <Input id="experience" name="experience" type="number" className="h-12 text-lg" placeholder="e.g. 3" value={formData.experience} onChange={handleChange} />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="location" className="text-base">Location</Label>
                  <Input id="location" name="location" className="h-12 text-lg" placeholder="e.g. New York, Remote" value={formData.location} onChange={handleChange} />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial="enter" animate="center" exit="exit" variants={slideVariants} transition={{ duration: 0.3 }} className="space-y-6 w-full">
                <div className="space-y-4">
                  <Label className="text-base">Education & Degrees</Label>
                  
                  {/* Selected Education (Draggable) */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 min-h-[100px]">
                    {eduChips.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No education added yet. Click below or add custom.</p>
                    ) : (
                      <Reorder.Group axis="y" values={eduChips} onReorder={setEduChips} className="space-y-2">
                        {eduChips.map((edu) => (
                          <Reorder.Item key={edu} value={edu} className="flex items-center justify-between bg-background border border-border px-3 py-2 rounded-lg shadow-sm cursor-grab active:cursor-grabbing">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-zinc-400" />
                              <span className="text-sm font-medium">{edu}</span>
                            </div>
                            <button onClick={() => removeEdu(edu)} className="text-zinc-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    )}
                  </div>

                  {/* Add Custom Education */}
                  <div className="flex gap-2">
                    <Input value={customEdu} onChange={(e) => setCustomEdu(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEdu(customEdu))} placeholder="Add custom degree or school..." className="flex-1" />
                    <Button variant="secondary" onClick={() => addEdu(customEdu)}><Plus className="h-4 w-4" /></Button>
                  </div>

                  {/* Word Bank */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Quick Add</p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_EDUCATION.filter(e => !eduChips.includes(e)).map(e => (
                        <button key={e} onClick={() => addEdu(e)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors">
                          + {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial="enter" animate="center" exit="exit" variants={slideVariants} transition={{ duration: 0.3 }} className="space-y-6 w-full">
                <div className="space-y-4">
                  <Label className="text-base">Top Skills & Tools</Label>
                  
                  {/* Selected Skills (Draggable) */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 min-h-[120px]">
                    {skillsChips.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No skills added yet. Click below or add custom.</p>
                    ) : (
                      <Reorder.Group axis="x" values={skillsChips} onReorder={setSkillsChips} className="flex flex-wrap gap-2">
                        {skillsChips.map((skill) => (
                          <Reorder.Item key={skill} value={skill} className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full shadow-sm cursor-grab active:cursor-grabbing text-sm font-medium">
                            <GripVertical className="h-3 w-3 opacity-50" />
                            {skill}
                            <button onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors ml-1"><X className="h-3 w-3" /></button>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    )}
                  </div>

                  {/* Add Custom Skill */}
                  <div className="flex gap-2">
                    <Input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(customSkill))} placeholder="Type a skill and press Enter..." className="flex-1" />
                    <Button variant="secondary" onClick={() => addSkill(customSkill)}>Add</Button>
                  </div>

                  {/* Word Bank */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Popular Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_SKILLS.filter(s => !skillsChips.includes(s)).map(s => (
                        <button key={s} onClick={() => addSkill(s)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors">
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial="enter" animate="center" exit="exit" variants={slideVariants} transition={{ duration: 0.3 }} className="space-y-6 w-full">
                <div className="space-y-3">
                  <Label htmlFor="workHistory" className="text-base">Recent Work History</Label>
                  <Textarea id="workHistory" name="workHistory" placeholder="Briefly describe your last 1-2 roles and key achievements. e.g. 'Software Engineer at ABC Corp: Increased page load speed by 30%...'" className="min-h-[250px] text-base resize-y" value={formData.workHistory} onChange={handleChange} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-border bg-muted/50 p-6">
          <Button variant="outline" onClick={handleBack} disabled={step === 0 || isSubmitting || isParsing}>Back</Button>
          {step > 0 && step < 4 ? (
            <Button onClick={handleNext}>Next Step</Button>
          ) : step === 4 ? (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[200px]">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...</> : "Generate Resume & Finish"}
            </Button>
          ) : <div />}
        </CardFooter>
      </Card>
    </div>
  );
}
