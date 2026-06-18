"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, UploadCloud, FileText } from "lucide-react";
import { toast } from "sonner";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // Step 0: Upload Resume or Manual
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    experience: "",
    location: "",
    education: "",
    skills: "",
    workHistory: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = () => setStep((s) => s + 1);
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
        education: parsedData.education || "",
        skills: parsedData.skills || "",
        workHistory: parsedData.workHistory || "",
      });
      toast.success("Resume parsed successfully!");
      setStep(1); // Move to review step
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
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-zinc-200/50 backdrop-blur-sm overflow-hidden">
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
        
        <CardContent className="min-h-[400px] flex flex-col justify-center relative">
          <AnimatePresence mode="wait" custom={1}>
            {step === 0 && (
              <motion.div
                key="step0"
                initial="enter"
                animate="center"
                exit="exit"
                variants={slideVariants}
                transition={{ duration: 0.3 }}
                className="space-y-6 w-full"
              >
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-zinc-300 hover:border-primary/50 hover:bg-zinc-50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      {isParsing ? (
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      ) : (
                        <UploadCloud className="h-8 w-8 text-primary" />
                      )}
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
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setStep(1)} className="w-full max-w-sm h-12">
                    <FileText className="mr-2 h-4 w-4" /> Enter details manually
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial="enter"
                animate="center"
                exit="exit"
                variants={slideVariants}
                transition={{ duration: 0.3 }}
                className="space-y-6 w-full"
              >
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-base">Current / Target Job Title</Label>
                  <Input
                    id="title"
                    name="title"
                    className="h-12 text-lg"
                    placeholder="e.g. Frontend Developer"
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="experience" className="text-base">Years of Experience</Label>
                  <Input
                    id="experience"
                    name="experience"
                    type="number"
                    className="h-12 text-lg"
                    placeholder="e.g. 3"
                    value={formData.experience}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="location" className="text-base">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    className="h-12 text-lg"
                    placeholder="e.g. New York, Remote"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial="enter"
                animate="center"
                exit="exit"
                variants={slideVariants}
                transition={{ duration: 0.3 }}
                className="space-y-6 w-full"
              >
                <div className="space-y-3">
                  <Label htmlFor="education" className="text-base">Education / Degree</Label>
                  <Textarea
                    id="education"
                    name="education"
                    className="min-h-[150px] text-base resize-y"
                    placeholder="e.g. B.S. Computer Science, University of XYZ, 2020. Relevant Coursework: Data Structures..."
                    value={formData.education}
                    onChange={handleChange}
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial="enter"
                animate="center"
                exit="exit"
                variants={slideVariants}
                transition={{ duration: 0.3 }}
                className="space-y-6 w-full"
              >
                <div className="space-y-3">
                  <Label htmlFor="skills" className="text-base">Top Skills & Tools</Label>
                  <Textarea
                    id="skills"
                    name="skills"
                    className="min-h-[150px] text-base resize-y"
                    placeholder="e.g. React, TypeScript, Node.js, TailwindCSS, AWS, Docker..."
                    value={formData.skills}
                    onChange={handleChange}
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial="enter"
                animate="center"
                exit="exit"
                variants={slideVariants}
                transition={{ duration: 0.3 }}
                className="space-y-6 w-full"
              >
                <div className="space-y-3">
                  <Label htmlFor="workHistory" className="text-base">Recent Work History</Label>
                  <Textarea
                    id="workHistory"
                    name="workHistory"
                    placeholder="Briefly describe your last 1-2 roles and key achievements. e.g. 'Software Engineer at ABC Corp: Increased page load speed by 30%...'"
                    className="min-h-[250px] text-base resize-y"
                    value={formData.workHistory}
                    onChange={handleChange}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-zinc-100 bg-zinc-50/50 p-6">
          <Button variant="outline" onClick={handleBack} disabled={step === 0 || isSubmitting || isParsing}>
            Back
          </Button>
          {step > 0 && step < 4 ? (
            <Button onClick={handleNext} disabled={!formData.title && step === 1}>
              Next Step
            </Button>
          ) : step === 4 ? (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[200px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...
                </>
              ) : (
                "Generate Resume & Finish"
              )}
            </Button>
          ) : (
            <div /> // Placeholder for step 0
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
