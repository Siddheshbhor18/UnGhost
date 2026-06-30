/**
 * Editorial content for the 6 bootcamp courses — curriculum highlights and
 * the recruiter-facing tagline. Kept separate from `shared/rooms.ts` (which
 * defines the canonical room schema used for validation) so marketing copy
 * can iterate without touching the data layer.
 *
 * Every surface that markets a course (catalog cards, room hero, landing
 * grid, cart picker) MUST source curriculum + tagline from here so changes
 * propagate everywhere.
 */
import type { BootcampCategory } from "@/shared/rooms";

export interface CourseContent {
  /** One-line tagline shown above the curriculum bullets. */
  tagline: string;
  /** What the student will actually learn — 3 to 4 short bullets. */
  curriculum: readonly string[];
}

export const COURSE_CONTENT: Record<BootcampCategory, CourseContent> = {
  ai: {
    tagline: "Ship real GenAI products, not toy demos.",
    curriculum: [
      "Build and deploy LLM agents end-to-end",
      "Prompt engineering, evals, and guardrails that hold",
      "Vector search, RAG pipelines, and fine-tuning",
      "Production cost, latency, and safety patterns",
    ],
  },
  gtm: {
    tagline: "Engineer revenue: pipelines, automation, ops.",
    curriculum: [
      "Outbound systems that book real meetings",
      "CRM, lead scoring, and lifecycle automation",
      "Attribution, dashboards, and revenue ops",
      "Tooling stack: HubSpot, Clay, Apollo, Make, n8n",
    ],
  },
  marketing: {
    tagline: "Growth that compounds — without the spam.",
    curriculum: [
      "Performance marketing: Meta, Google, LinkedIn",
      "Content engines that rank and convert",
      "Funnels, attribution, and unit economics",
      "Brand, positioning, and message-market fit",
    ],
  },
  sales: {
    tagline: "B2B selling, from cold call to closed-won.",
    curriculum: [
      "Discovery, qualification, and MEDDPICC",
      "Objection handling and negotiation playbooks",
      "Pipeline math: conversion, velocity, forecast",
      "Closing techniques and contract motions",
    ],
  },
  entrepreneurship: {
    tagline: "Zero-to-one: from idea to first 100 customers.",
    curriculum: [
      "Validate ideas with real users, not surveys",
      "Build an MVP in 30 days with no-code + AI",
      "Pricing, fundraising, and cap-table basics",
      "Ops, hiring, and the first 18 months",
    ],
  },
  freelancing: {
    tagline: "Land clients, price your work, run solo.",
    curriculum: [
      "Find inbound clients on LinkedIn + Upwork",
      "Scope, contracts, and milestone billing",
      "Pricing — hourly, retainer, value-based",
      "Solo ops: invoicing, taxes, async delivery",
    ],
  },
};
