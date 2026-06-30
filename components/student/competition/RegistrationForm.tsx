"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, PartyPopper, User, GraduationCap } from "lucide-react";
import { Button, Card, Input, Select, Field } from "@/components/ui";

const YEAR_OPTIONS = [
  { value: "", label: "Select year" },
  { value: "1st", label: "1st Year" },
  { value: "2nd", label: "2nd Year" },
  { value: "3rd", label: "3rd Year" },
  { value: "4th", label: "4th Year" },
  { value: "5th+", label: "5th Year / Postgrad" },
] as const;

const CONFETTI_COUNT = 60;

interface RegistrationData {
  name: string;
  email: string;
  phone: string;
  collegeName: string;
  course: string;
  year: string;
  githubId: string;
  linkedinId: string;
}

interface RegistrationFormProps {
  /** Pre-filled user data from session */
  prefillName: string;
  prefillEmail: string;
  onComplete: (data: RegistrationData) => void;
  onCancel: () => void;
}

/**
 * RegistrationForm — Two-step hackathon registration.
 *
 * Step 1: Personal details (name, email, phone — pre-filled from session)
 * Step 2: Academic + social (college, course, year, GitHub, LinkedIn)
 *
 * Fires confetti burst on completion. All state is in-memory;
 * the parent persists to localStorage.
 */
export function RegistrationForm({
  prefillName,
  prefillEmail,
  onComplete,
  onCancel,
}: RegistrationFormProps): JSX.Element {
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<RegistrationData>({
    name: prefillName,
    email: prefillEmail,
    phone: "",
    collegeName: "",
    course: "",
    year: "",
    githubId: "",
    linkedinId: "",
  });

  const update = useCallback(
    (field: keyof RegistrationData, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  // Scroll form into view on step change
  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formStep]);

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!data.name.trim()) errs.name = "Name is required";
    if (!data.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errs.email = "Enter a valid email";
    if (!data.phone.trim()) errs.phone = "Phone number is required";
    else if (!/^\+?[\d\s-]{8,15}$/.test(data.phone.replace(/\s/g, "")))
      errs.phone = "Enter a valid phone number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!data.collegeName.trim()) errs.collegeName = "College name is required";
    if (!data.course.trim()) errs.course = "Course is required";
    if (!data.year) errs.year = "Select your year";
    if (!data.githubId.trim()) errs.githubId = "GitHub ID is required";
    if (!data.linkedinId.trim()) errs.linkedinId = "LinkedIn URL is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setFormStep(2);
  };

  const handleSubmit = () => {
    if (!validateStep2()) return;
    setShowConfetti(true);
    setTimeout(() => {
      onComplete(data);
    }, 1800);
  };

  return (
    <div ref={formRef} className="mx-auto max-w-2xl px-4 py-10">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 1.2;
            const duration = 2.5 + Math.random() * 1.5;
            const hue = Math.floor(Math.random() * 360);
            const size = 6 + Math.random() * 6;
            const rotation = Math.random() * 720;
            return (
              <div
                key={i}
                className="absolute top-[-5%]"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size * 0.6}px`,
                  backgroundColor: `hsl(${hue}, 80%, 58%)`,
                  borderRadius: "1px",
                  animation: `comp-confetti-fall ${duration}s cubic-bezier(0.23, 1, 0.32, 1) ${delay}s forwards`,
                  transform: `rotate(${rotation}deg)`,
                }}
              />
            );
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3 animate-[comp-confetti-pop_0.5s_ease-out_0.2s_both]">
              <PartyPopper size={48} className="mx-auto text-brand-500" />
              <p className="font-display font-extrabold text-2xl text-neutral-950">
                You&apos;re In!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-8">
        <StepIndicator step={1} current={formStep} label="Personal" icon={<User size={14} />} />
        <div className="flex-1 h-[2px] bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: formStep >= 2 ? "100%" : "0%" }}
          />
        </div>
        <StepIndicator step={2} current={formStep} label="Academic" icon={<GraduationCap size={14} />} />
      </div>

      {/* Form Card */}
      <Card surface="glass" className="!p-6 md:!p-8 space-y-6">
        {formStep === 1 && (
          <div className="space-y-5" style={{ animation: "comp-form-slide-in 0.3s ease-out" }}>
            <div>
              <h2 className="font-display font-bold text-xl text-neutral-900 tracking-tight">
                Personal Details
              </h2>
              <p className="text-body-sm text-neutral-500 mt-1">
                Some fields are pre-filled from your profile.
              </p>
            </div>

            <div className="grid gap-4">
              <FormField
                label="Full Name"
                value={data.name}
                onChange={(v) => update("name", v)}
                error={errors.name}
                placeholder="Your full name"
              />
              <FormField
                label="Email Address"
                type="email"
                value={data.email}
                onChange={(v) => update("email", v)}
                error={errors.email}
                placeholder="you@college.edu"
              />
              <FormField
                label="Phone Number"
                type="tel"
                value={data.phone}
                onChange={(v) => update("phone", v)}
                error={errors.phone}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                trailingIcon={<ArrowRight size={14} />}
                onClick={handleNext}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {formStep === 2 && (
          <div className="space-y-5" style={{ animation: "comp-form-slide-in 0.3s ease-out" }}>
            <div>
              <h2 className="font-display font-bold text-xl text-neutral-900 tracking-tight">
                Academic & Social
              </h2>
              <p className="text-body-sm text-neutral-500 mt-1">
                College details and social handles for verification.
              </p>
            </div>

            <div className="grid gap-4">
              <FormField
                label="College Name"
                value={data.collegeName}
                onChange={(v) => update("collegeName", v)}
                error={errors.collegeName}
                placeholder="IIT Bombay, VIT Pune..."
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  label="Course"
                  value={data.course}
                  onChange={(v) => update("course", v)}
                  error={errors.course}
                  placeholder="B.Tech CSE, BCA..."
                />
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Year
                  </label>
                  <Select
                    value={data.year}
                    onChange={(e) => update("year", e.target.value)}
                  >
                    {YEAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                  {errors.year && (
                    <p className="text-xs text-error mt-1">{errors.year}</p>
                  )}
                </div>
              </div>

              <FormField
                label="GitHub Username"
                value={data.githubId}
                onChange={(v) => update("githubId", v)}
                error={errors.githubId}
                placeholder="octocat"
              />
              <FormField
                label="LinkedIn Profile URL"
                value={data.linkedinId}
                onChange={(v) => update("linkedinId", v)}
                error={errors.linkedinId}
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<ArrowLeft size={14} />}
                onClick={() => setFormStep(1)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                trailingIcon={<CheckCircle2 size={14} />}
                onClick={handleSubmit}
              >
                Complete Registration
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Internal Helpers ── */

function StepIndicator({
  step,
  current,
  label,
  icon,
}: {
  step: number;
  current: number;
  label: string;
  icon: React.ReactNode;
}) {
  const isActive = current >= step;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid place-items-center w-8 h-8 rounded-full text-xs font-bold transition-colors duration-300 ${
          isActive
            ? "bg-brand-500 text-white shadow-sm"
            : "bg-neutral-100 text-neutral-400"
        }`}
      >
        {isActive && current > step ? <CheckCircle2 size={14} /> : icon}
      </span>
      <span
        className={`text-xs font-medium transition-colors duration-300 hidden sm:block ${
          isActive ? "text-neutral-900" : "text-neutral-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function FormField({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={error ? "!border-error !ring-error/30" : ""}
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}
