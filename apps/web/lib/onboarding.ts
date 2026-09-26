export type Question = {
  key: string;
  label: string;
  hint?: string;
  long?: boolean;
  optional?: boolean;
};
export const steps: {
  title: string;
  description: string;
  fields: Question[];
}[] = [
  {
    title: "Founder",
    description:
      "The person behind the possibility. Tell us what you bring to the table.",
    fields: [
      { key: "name", label: "Full name" },
      { key: "location", label: "Location", hint: "City and country" },
      { key: "bio", label: "Your story", long: true },
      {
        key: "skills",
        label: "Skills",
        hint: "For example: engineering, product, sales",
      },
      { key: "experience", label: "Professional experience", long: true },
      { key: "linkedin", label: "LinkedIn URL", optional: true },
      { key: "portfolio", label: "Portfolio URL", optional: true },
      { key: "education", label: "Education", optional: true },
      {
        key: "photo_url",
        label: "Profile photo URL",
        hint: "Optional HTTPS image reference. Direct uploads arrive in Phase 2.",
        optional: true,
      },
    ],
  },
  {
    title: "Startup",
    description: "Give your ambition a name and a clear starting point.",
    fields: [
      { key: "name", label: "Startup name" },
      { key: "industry", label: "Industry" },
      { key: "stage", label: "Stage" },
      { key: "website", label: "Website", optional: true },
      { key: "description", label: "Startup description", long: true },
    ],
  },
  {
    title: "Problem",
    description: "Great startups begin with a problem worth solving.",
    fields: [
      { key: "problem", label: "What problem are you solving?", long: true },
      { key: "audience", label: "Who experiences this problem?", long: true },
      { key: "frequency", label: "How frequently does it happen?" },
    ],
  },
  {
    title: "Solution",
    description: "Tell us how your product makes things meaningfully better.",
    fields: [
      { key: "product", label: "Describe your product", long: true },
      {
        key: "value_proposition",
        label: "Unique value proposition",
        long: true,
      },
      { key: "features", label: "Key features", long: true },
    ],
  },
  {
    title: "Market",
    description:
      "Be specific about who you serve. Label estimates and assumptions.",
    fields: [
      { key: "target_customer", label: "Target customer", long: true },
      { key: "geography", label: "Geography" },
      {
        key: "market_size",
        label: "Market size and supporting assumptions",
        long: true,
      },
      { key: "customer_segment", label: "Customer segment" },
    ],
  },
  {
    title: "Traction",
    description:
      "Share where you are today. Zero or pre-launch is a valid answer. Include time periods.",
    fields: [
      { key: "users", label: "Users" },
      { key: "revenue", label: "Revenue and currency" },
      { key: "mrr", label: "Monthly recurring revenue" },
      { key: "growth", label: "Growth rate and period" },
      { key: "customers", label: "Paying customers" },
      { key: "retention", label: "Retention and cohort definition" },
    ],
  },
  {
    title: "Business model",
    description: "How will your company create and capture value?",
    fields: [
      { key: "pricing", label: "Pricing", long: true },
      { key: "revenue_model", label: "Revenue model", long: true },
      {
        key: "unit_economics",
        label: "Unit economics",
        hint: "Include assumptions if you are pre-revenue.",
        long: true,
      },
    ],
  },
  {
    title: "Competition",
    description:
      "Show that you understand the alternatives, including doing nothing.",
    fields: [
      { key: "competitors", label: "Competitors and alternatives", long: true },
      { key: "differentiation", label: "Your differentiation", long: true },
    ],
  },
  {
    title: "Team",
    description: "Who is building this with you, and what do you still need?",
    fields: [
      { key: "founders", label: "Founders", long: true },
      { key: "roles", label: "Roles and responsibilities", long: true },
      {
        key: "team_skills",
        label: "Team strengths and skill gaps",
        long: true,
      },
    ],
  },
  {
    title: "Funding",
    description:
      "Tell us about your plans. This is an application, not a securities transaction.",
    fields: [
      {
        key: "previous_funding",
        label: "Previous funding",
        hint: "Enter none if bootstrapped.",
      },
      {
        key: "funding_requirement",
        label: "Current funding requirement and currency",
      },
      { key: "use_of_funds", label: "Intended use of funds", long: true },
    ],
  },
  {
    title: "Documents",
    description:
      "Add optional HTTPS references. Direct document upload, private storage, and retrieval arrive in Phase 2.",
    fields: [
      { key: "pitch_deck", label: "Pitch deck link", optional: true },
      { key: "business_plan", label: "Business plan link", optional: true },
      { key: "demo", label: "Product demo link", optional: true },
      { key: "other_documents", label: "Other document link", optional: true },
    ],
  },
  {
    title: "Review",
    description:
      "Take a moment to review your story. You can save your work without submitting.",
    fields: [],
  },
];
