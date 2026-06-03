import React, { useState, useMemo } from 'react';
import { ExternalLink, Search, ChevronUp, ChevronDown, X } from 'lucide-react';

// ── Data ─────────────────────────────────────────────────────────────────────

const COMPANIES = [
  // Agent Payments
  { company: "Nevermined", website: "https://nevermined.ai", category: "Agent Payments", product: "Agent-native payment infrastructure with metering, virtual card delegation, x402 facilitator, fiat+crypto settlement", whyFits: "Handles agent-to-agent payments at scale; needs cryptographic authorization & audit trails for delegated spending", existingSecurity: "PCI-compliant through VGS, scoped API keys, mandate controls", governanceGap: "No cryptographic agent identity or threshold signing for high-value transactions", painPoints: "Agent spending limits, compliance reporting, dispute resolution", companySize: "Startup (Series A)", funding: "Not disclosed", keyExec: "Nevermined Team", linkedin: "https://www.linkedin.com/company/nevermined-ai", partnerPage: "https://nevermined.ai/schedule-demo", devPortal: "https://docs.nevermined.ai", enterpriseSales: "https://nevermined.ai/schedule-demo", priority: 9 },
  { company: "Skyfire", website: "https://skyfire.ai", category: "Agent Payments", product: "KYA (Know Your Agent) protocol for agent identity verification and autonomous payments", whyFits: "Agent identity is core to their product; AEREDIUM provides cryptographic enforcement layer", existingSecurity: "KYA Protocol for agent verification", governanceGap: "Limited policy enforcement beyond identity verification", painPoints: "Agent liability attribution, regulatory compliance", companySize: "Early Stage (10 employees)", funding: "$10M", keyExec: "Amir Sarhangi (CEO)", linkedin: "https://www.linkedin.com/company/skyfire-ai", partnerPage: "https://skyfire.ai/contact", devPortal: "https://docs.skyfire.ai", enterpriseSales: "https://skyfire.ai/contact", priority: 10 },
  { company: "Stripe", website: "https://stripe.com", category: "Agent Payments", product: "Payments infrastructure with Agentic Commerce Protocol (ACP) in development, MCP server", whyFits: "$1.9T volume, 50% Fortune 100 customers; will need agent governance as agentic commerce scales", existingSecurity: "99.999% uptime, proven fraud detection", governanceGap: "ACP still in development; lacks cryptographic agent authorization", painPoints: "Agent authentication, autonomous spending controls", companySize: "Public/Large (10,000+ employees)", funding: "Private (valued $95B)", keyExec: "Patrick Collison (CEO)", linkedin: "https://www.linkedin.com/company/stripe", partnerPage: "https://stripe.com/partners", devPortal: "https://stripe.com/docs", enterpriseSales: "https://stripe.com/contact/sales", priority: 8 },
  { company: "PayPal", website: "https://paypal.com", category: "Agent Payments", product: "Financial OS for AI agents with Agent Ready, Store Sync, PYUSD stablecoin", whyFits: "430M users, $1.5T volume building agent-native infrastructure; needs governance for agent autonomy", existingSecurity: "Multiparty Compute Protocol, established fraud systems", governanceGap: "Agent workflows lack cryptographic policy enforcement", painPoints: "Agent liability, compliance for autonomous transactions", companySize: "Public (30,000+ employees)", funding: "Public (PYPL)", keyExec: "Alex Chriss (CEO)", linkedin: "https://www.linkedin.com/company/paypal", partnerPage: "https://www.paypal.com/partners", devPortal: "https://developer.paypal.com", enterpriseSales: "https://www.paypal.com/business/solutions/enterprise", priority: 8 },
  { company: "Coinbase Commerce", website: "https://commerce.coinbase.com", category: "Agent Payments", product: "AgentKit for AI agent crypto wallets, onchain payment workflows, Base L2 support", whyFits: "162M+ x402 transactions, $45M volume; Agent wallets need cryptographic governance", existingSecurity: "Custodial wallets, AgentKit framework", governanceGap: "No threshold signing or policy enforcement for autonomous agents", painPoints: "Agent key management, regulatory compliance", companySize: "Public (4,000+ employees)", funding: "Public (COIN)", keyExec: "Brian Armstrong (CEO)", linkedin: "https://www.linkedin.com/company/coinbase", partnerPage: "https://www.coinbase.com/partners", devPortal: "https://docs.cloud.coinbase.com/agentkit", enterpriseSales: "https://www.coinbase.com/enterprise", priority: 9 },
  { company: "Adyen", website: "https://adyen.com", category: "Agent Payments", product: "Global payments platform, €1.4T annual volume, 150+ currencies, banking licenses", whyFits: "Enterprise infrastructure for global payments; agents will need governance at scale", existingSecurity: "99.999% uptime, banking licenses", governanceGap: "No agent-specific cryptographic controls", painPoints: "Agent authentication, cross-border compliance", companySize: "Public (4,000+ employees)", funding: "Public (ADYEN)", keyExec: "Pieter van der Does (CEO)", linkedin: "https://www.linkedin.com/company/adyen", partnerPage: "https://www.adyen.com/partners", devPortal: "https://docs.adyen.com", enterpriseSales: "https://www.adyen.com/contact", priority: 7 },

  // Agent Wallets
  { company: "Cobo", website: "https://cobo.com", category: "Agent Wallets", product: "Cobo Agentic Wallet – MPC security, policy controls, multi-chain support for autonomous agents", whyFits: "Enterprise-grade agent wallet infrastructure; AEREDIUM adds cryptographic governance layer", existingSecurity: "MPC security, Pact-based permissions", governanceGap: "Limited threshold signing for agent authorization", painPoints: "Agent key management, policy enforcement", companySize: "Series B (200+ employees)", funding: "$100M+", keyExec: "Jack Lu (CEO)", linkedin: "https://www.linkedin.com/company/cobo-io", partnerPage: "https://cobo.com/contact", devPortal: "https://docs.cobo.com", enterpriseSales: "https://cobo.com/enterprise", priority: 9 },
  { company: "Crossmint", website: "https://crossmint.com", category: "Agent Wallets", product: "AI Agent Wallets with dual-key architecture, smart contract wallets, non-custodial", whyFits: "Dual-key architecture needs cryptographic policy enforcement; scalable to millions of users", existingSecurity: "Non-custodial, Owner Key + Agent Key", governanceGap: "Limited cryptographic authorization beyond dual-key", painPoints: "Agent key security, policy boundaries", companySize: "Series B (100+ employees)", funding: "$50M+", keyExec: "Juan Rozoff (CEO)", linkedin: "https://www.linkedin.com/company/crossmint", partnerPage: "https://crossmint.com/partners", devPortal: "https://docs.crossmint.com", enterpriseSales: "https://crossmint.com/contact", priority: 9 },
  { company: "Anchorage Digital", website: "https://anchorage.com", category: "Agent Wallets", product: "Agentic Banking – compliant access to capital across crypto and traditional financial rails", whyFits: "First agentic banking platform; needs cryptographic governance for compliance", existingSecurity: "Fed-regulated digital asset bank", governanceGap: "Agent authorization lacks cryptographic enforcement", painPoints: "Regulatory compliance, agent liability", companySize: "Series C (300+ employees)", funding: "$250M+", keyExec: "Nathan Pelletier (CEO)", linkedin: "https://www.linkedin.com/company/anchorage", partnerPage: "https://anchorage.com/partners", devPortal: "https://docs.anchorage.com", enterpriseSales: "https://anchorage.com/enterprise", priority: 10 },
  { company: "Openfort", website: "https://openfort.io", category: "Agent Wallets", product: "Wallet infrastructure for AI agents, smart accounts, session keys", whyFits: "Building agent wallet infrastructure; needs cryptographic policy enforcement", existingSecurity: "Smart accounts, session keys", governanceGap: "Limited threshold signing for agent operations", painPoints: "Agent key management, spending limits", companySize: "Seed (30+ employees)", funding: "$10M+", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/openfort", partnerPage: "https://openfort.io/contact", devPortal: "https://docs.openfort.io", enterpriseSales: "https://openfort.io/contact", priority: 8 },
  { company: "BitGo", website: "https://bitgo.com", category: "Agent Wallets", product: "Institutional crypto custody, multi-signature wallets, MPC", whyFits: "Institutional custody for agents; needs cryptographic governance for autonomy", existingSecurity: "Multi-sig, MPC, cold storage", governanceGap: "Agent-specific policies not natively supported", painPoints: "Agent authorization, compliance", companySize: "Series D (500+ employees)", funding: "$500M+", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/bitgo", partnerPage: "https://bitgo.com/partners", devPortal: "https://developers.bitgo.com", enterpriseSales: "https://bitgo.com/enterprise", priority: 7 },

  // AI Trading / DeFi Agents
  { company: "Valory (Olas)", website: "https://valory.xyz", category: "AI Trading / DeFi Agents", product: "Olas AI agent marketplace for autonomous economic agents, payments & billing infrastructure", whyFits: "Agent marketplace needs governance standard; AEREDIUM provides identity + policy enforcement", existingSecurity: "Used Nevermined for payments (6 weeks to 6 hours)", governanceGap: "No cryptographic agent identity or threshold signing", painPoints: "Agent liability, dispute resolution", companySize: "Startup (50+ employees)", funding: "$20M+", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/valory-xyz", partnerPage: "https://valory.xyz/contact", devPortal: "https://docs.valory.xyz", enterpriseSales: "https://valory.xyz/contact", priority: 10 },
  { company: "Rivo", website: "https://rivo.finance", category: "AI Trading / DeFi Agents", product: "Maneki agent for portfolio analysis and yield optimization across multiple chains", whyFits: "Autonomous DeFi trading; needs cryptographic authorization for trades", existingSecurity: "Not disclosed", governanceGap: "No policy enforcement for autonomous trades", painPoints: "Trade authorization, risk management", companySize: "Startup", funding: "Seed", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/rivo-finance", partnerPage: "https://rivo.finance/contact", devPortal: "https://docs.rivo.finance", enterpriseSales: "https://rivo.finance/contact", priority: 8 },
  { company: "Velvet Capital", website: "https://velvet.capital", category: "AI Trading / DeFi Agents", product: "Autonomous portfolio management for DeFi", whyFits: "Manages portfolios autonomously; needs cryptographic governance", existingSecurity: "Not disclosed", governanceGap: "No threshold signing for portfolio changes", painPoints: "Portfolio authorization, compliance", companySize: "Startup", funding: "Seed", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/velvet-capital", partnerPage: "https://velvet.capital/contact", devPortal: "https://docs.velvet.capital", enterpriseSales: "https://velvet.capital/contact", priority: 8 },
  { company: "SingularityDAO", website: "https://singularitydao.ai", category: "AI Trading / DeFi Agents", product: "DynaSets – onchain vaults where AI rebalances portfolios in real-time", whyFits: "AI rebalancing needs cryptographic authorization; shared onchain vaults need governance", existingSecurity: "Onchain smart contracts", governanceGap: "No cryptographic policy enforcement for AI rebalancing", painPoints: "Rebalancing authorization, vault security", companySize: "Startup", funding: "Not disclosed", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/singularity-dao", partnerPage: "https://singularitydao.ai/contact", devPortal: "https://docs.singularitydao.ai", enterpriseSales: "https://singularitydao.ai/contact", priority: 8 },

  // Treasury Automation
  { company: "Atlar", website: "https://atlar.com", category: "Treasury Automation", product: "AI agents for treasury: autonomous workflows for cash positioning, payments, reconciliation, forecasting", whyFits: "Autonomous treasury workflows; agents review every outgoing payment needing governance", existingSecurity: "Secure access to treasury data, user group privileges", governanceGap: "No cryptographic authorization for payment approvals", painPoints: "Payment authorization, audit trails", companySize: "Series B (150+ employees)", funding: "$100M+", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/atlar", partnerPage: "https://atlar.com/contact", devPortal: "https://docs.atlar.com", enterpriseSales: "https://atlar.com/contact/sales", priority: 9 },
  { company: "Modern Treasury", website: "https://moderntreasury.com", category: "Treasury Automation", product: "AI agents for payment operations using LangGraph, Modern Treasury AI platform", whyFits: "Built controllable agents for financial ops; needs cryptographic governance layer", existingSecurity: "Human-in-the-loop approvals, granular permissioning, audit trails", governanceGap: "Human approvals not cryptographically enforced", painPoints: "Payment authorization, compliance", companySize: "Series C (200+ employees)", funding: "$150M+", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/modern-treasury", partnerPage: "https://moderntreasury.com/partners", devPortal: "https://docs.moderntreasury.com", enterpriseSales: "https://moderntreasury.com/contact", priority: 10 },
  { company: "Bottomline (Bea AI)", website: "https://bottomline.com", category: "Treasury Automation", product: "Bea AI agent for treasury and cash management, conversational AI for Office of CFO", whyFits: "AI agent acts as digital team member handling payments; needs cryptographic controls", existingSecurity: "Secure environment, data not exposed to public LLMs", governanceGap: "No cryptographic authorization for payment help requests", painPoints: "Payment approval, compliance", companySize: "Public (2,000+ employees)", funding: "Public (EPAY)", keyExec: "Heather Pavliga (Global Head Brand & Communications)", linkedin: "https://www.linkedin.com/company/bottomline-technologies", partnerPage: "https://bottomline.com/partners", devPortal: "https://bottomline.com/developers", enterpriseSales: "https://bottomline.com/contact", priority: 8 },
  { company: "Ramp", website: "https://ramp.com", category: "Treasury Automation", product: "Corporate card + expense management with AI agents for finance automation", whyFits: "$2.8B funding, finance automation; agents handle money needing governance", existingSecurity: "Standard fintech security", governanceGap: "Agent spending lacks cryptographic enforcement", painPoints: "Spending limits, approval workflows", companySize: "Growth (500+ employees)", funding: "$2,833M", keyExec: "Eric Glyman (CEO)", linkedin: "https://www.linkedin.com/company/ramp-business", partnerPage: "https://ramp.com/partners", devPortal: "https://developers.ramp.com", enterpriseSales: "https://ramp.com/enterprise", priority: 8 },
  { company: "Zip", website: "https://zip.co", category: "Treasury Automation", product: "Business finance automation with AI for treasury operations", whyFits: "$358M funding, finance automation; agents move money needing governance", existingSecurity: "Standard fintech security", governanceGap: "No cryptographic agent authorization", painPoints: "Payment authorization, compliance", companySize: "Growth (300+ employees)", funding: "$358M", keyExec: "Rujul Zaparde (CEO)", linkedin: "https://www.linkedin.com/company/zip-co", partnerPage: "https://zip.co/partners", devPortal: "https://developers.zip.co", enterpriseSales: "https://zip.co/enterprise", priority: 7 },

  // Enterprise AI Agents
  { company: "Sierra", website: "https://sierra.ai", category: "Enterprise AI Agents", product: "Enterprise AI agents for business operations, autonomous decision-making", whyFits: "$635M funding, enterprise agents; agents could access financial systems needing governance", existingSecurity: "Enterprise security standards", governanceGap: "No cryptographic enforcement for agent actions", painPoints: "Agent authorization, audit trails", companySize: "Growth (300+ employees)", funding: "$635M", keyExec: "Bret Taylor (CEO)", linkedin: "https://www.linkedin.com/company/sierra-ai", partnerPage: "https://sierra.ai/contact", devPortal: "https://docs.sierra.ai", enterpriseSales: "https://sierra.ai/enterprise", priority: 7 },
  { company: "Decagon", website: "https://decagon.ai", category: "Enterprise AI Agents", product: "Customer experience agents for enterprise", whyFits: "$481M funding, enterprise agents; may need governance if handling payments", existingSecurity: "Enterprise security", governanceGap: "No cryptographic controls for agent actions", painPoints: "Agent liability, compliance", companySize: "Growth (200+ employees)", funding: "$481M", keyExec: "Jesse Zhang (CEO)", linkedin: "https://www.linkedin.com/company/decagon-ai", partnerPage: "https://decagon.ai/contact", devPortal: "https://docs.decagon.ai", enterpriseSales: "https://decagon.ai/enterprise", priority: 6 },
  { company: "Glean", website: "https://glean.com", category: "Enterprise AI Agents", product: "Enterprise AI search and agents for productivity", whyFits: "$765M funding, enterprise agents; may access financial data needing governance", existingSecurity: "Enterprise security, SOC 2", governanceGap: "No cryptographic enforcement for agent data access", painPoints: "Data access control, audit trails", companySize: "Growth (500+ employees)", funding: "$765M", keyExec: "Arvind Jain (CEO)", linkedin: "https://www.linkedin.com/company/glean", partnerPage: "https://glean.com/partners", devPortal: "https://docs.glean.com", enterpriseSales: "https://glean.com/contact", priority: 6 },
  { company: "Cohere", website: "https://cohere.com", category: "Enterprise AI Agents", product: "Enterprise AI models and agent development platform", whyFits: "$1.5B funding, agent platform; customers building agents need governance", existingSecurity: "Enterprise security", governanceGap: "No native agent governance layer", painPoints: "Customer agent authorization", companySize: "Growth (500+ employees)", funding: "$1,537M", keyExec: "Aidan Gomez (CEO)", linkedin: "https://www.linkedin.com/company/cohere-ai", partnerPage: "https://cohere.com/partners", devPortal: "https://docs.cohere.com", enterpriseSales: "https://cohere.com/enterprise", priority: 7 },
  { company: "LangChain", website: "https://langchain.com", category: "Enterprise AI Agents", product: "Agent development framework, LangGraph for controllable agents", whyFits: "$160M funding, agent framework; customers need governance for production agents", existingSecurity: "Open source framework", governanceGap: "No native cryptographic governance", painPoints: "Production agent authorization", companySize: "Mid (100+ employees)", funding: "$160M", keyExec: "Harrison Chase (CEO)", linkedin: "https://www.linkedin.com/company/langchain", partnerPage: "https://langchain.com/partners", devPortal: "https://docs.langchain.com", enterpriseSales: "https://langchain.com/enterprise", priority: 8 },

  // Agent-to-Agent Commerce
  { company: "Presta", website: "https://wearepresta.com", category: "Agent-to-Agent Commerce", product: "AI Agent Marketplace 2026 – new app store for autonomous services", whyFits: "Agent marketplace needs governance for agent-to-agent transactions", existingSecurity: "Not disclosed", governanceGap: "No cryptographic agent identity or transaction authorization", painPoints: "Agent reputation, dispute resolution", companySize: "Startup", funding: "Not disclosed", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/wearepresta", partnerPage: "https://wearepresta.com/contact", devPortal: "https://docs.wearepresta.com", enterpriseSales: "https://wearepresta.com/contact", priority: 9 },
  { company: "Tines", website: "https://tines.com", category: "Agent-to-Agent Commerce", product: "No-code automation platform with agentic workflows", whyFits: "$271M funding, automation workflows; agents may trigger payments needing governance", existingSecurity: "Enterprise security, SOC 2", governanceGap: "No cryptographic authorization for agent-triggered actions", painPoints: "Workflow authorization, audit trails", companySize: "Growth (300+ employees)", funding: "$271M", keyExec: "Eoin Hinchy (CEO)", linkedin: "https://www.linkedin.com/company/tines", partnerPage: "https://tines.com/partners", devPortal: "https://docs.tines.com", enterpriseSales: "https://tines.com/contact", priority: 7 },

  // Autonomous Procurement
  { company: "Pactum AI", website: "https://pactum.ai", category: "Autonomous Procurement", product: "Autonomous negotiation AI for tail spend and commoditized categories", whyFits: "Autonomous negotiation; needs cryptographic authorization for procurement decisions", existingSecurity: "Not disclosed", governanceGap: "No policy enforcement for autonomous negotiations", painPoints: "Negotiation authorization, compliance", companySize: "Startup", funding: "Seed", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/pactum-ai", partnerPage: "https://pactum.ai/contact", devPortal: "https://docs.pactum.ai", enterpriseSales: "https://pactum.ai/contact", priority: 8 },
  { company: "Keelvar", website: "https://keelvar.com", category: "Autonomous Procurement", product: "Autonomous sourcing AI for procurement workflows", whyFits: "Autonomous sourcing; agents execute procurement needing governance", existingSecurity: "Enterprise security", governanceGap: "No cryptographic authorization for sourcing decisions", painPoints: "Sourcing authorization, compliance", companySize: "Mid (100+ employees)", funding: "Not disclosed", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/keelvar", partnerPage: "https://keelvar.com/contact", devPortal: "https://docs.keelvar.com", enterpriseSales: "https://keelvar.com/contact", priority: 7 },
  { company: "Arkestro", website: "https://arkestro.com", category: "Autonomous Procurement", product: "Predictive sourcing intelligence with AI for procurement", whyFits: "Predictive sourcing; agents may execute purchases needing governance", existingSecurity: "Enterprise security", governanceGap: "No cryptographic enforcement for procurement actions", painPoints: "Purchase authorization, compliance", companySize: "Mid (150+ employees)", funding: "$50M+", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/arkestro", partnerPage: "https://arkestro.com/partners", devPortal: "https://docs.arkestro.com", enterpriseSales: "https://arkestro.com/contact", priority: 7 },
  { company: "Suplari", website: "https://suplari.com", category: "Autonomous Procurement", product: "Autonomous procurement AI for spend management", whyFits: "Autonomous procurement; agents execute transactions needing governance", existingSecurity: "Enterprise security", governanceGap: "No cryptographic authorization for transactions", painPoints: "Transaction authorization, audit trails", companySize: "Mid (100+ employees)", funding: "Not disclosed", keyExec: "Not disclosed", linkedin: "https://www.linkedin.com/company/suplari", partnerPage: "https://suplari.com/contact", devPortal: "https://docs.suplari.com", enterpriseSales: "https://suplari.com/contact", priority: 7 },

  // Financial Infrastructure
  { company: "Alchemy", website: "https://alchemy.com", category: "Financial Infrastructure", product: "Blockchain infrastructure, demonstrated AI agent wallet with x402 payment flow", whyFits: "Agent wallet demo with $45M volume; needs cryptographic governance for agent autonomy", existingSecurity: "Blockchain infrastructure security", governanceGap: "No threshold signing for agent operations", painPoints: "Agent authorization, compliance", companySize: "Growth (500+ employees)", funding: "$700M+", keyExec: "Nick Vincent (CEO)", linkedin: "https://www.linkedin.com/company/alchemyinc", partnerPage: "https://alchemy.com/partners", devPortal: "https://docs.alchemy.com", enterpriseSales: "https://alchemy.com/enterprise", priority: 9 },
  { company: "Lightning Labs", website: "https://lightning.engineering", category: "Financial Infrastructure", product: "Lightning Network toolset for AI agents, L402 protocol for Bitcoin payments", whyFits: "AI agents on Lightning Network; needs cryptographic governance for BTC transactions", existingSecurity: "Lightning Network security", governanceGap: "No policy enforcement for agent payments", painPoints: "Payment authorization, key management", companySize: "Mid (100+ employees)", funding: "$70M+", keyExec: "Elizabeth Stark (CEO)", linkedin: "https://www.linkedin.com/company/lightning-labs", partnerPage: "https://lightning.engineering/contact", devPortal: "https://docs.lightning.engineering", enterpriseSales: "https://lightning.engineering/contact", priority: 8 },
  { company: "BNB Chain", website: "https://bnbchain.org", category: "Financial Infrastructure", product: "ERC-8004 (AI agent identity), BAP-578 (NFT agent entities), deployed AI agent standards", whyFits: "Deployed AI agent standards on-chain; AEREDIUM adds cryptographic governance layer", existingSecurity: "Blockchain security", governanceGap: "Agent identity lacks cryptographic policy enforcement", painPoints: "Agent authorization, compliance", companySize: "Large", funding: "Not disclosed", keyExec: "CZ (founder)", linkedin: "https://www.linkedin.com/company/bnbchain", partnerPage: "https://bnbchain.org/partners", devPortal: "https://docs.bnbchain.org", enterpriseSales: "https://bnbchain.org/contact", priority: 8 },
  { company: "Visa", website: "https://visa.com", category: "Financial Infrastructure", product: "Agentic AI payments research, autonomous payments infrastructure", whyFits: "$1T+ volume, researching agent payments; needs governance as agents scale", existingSecurity: "Established payment security", governanceGap: "No agent-specific cryptographic controls", painPoints: "Agent authentication, compliance", companySize: "Public (27,000+ employees)", funding: "Public (V)", keyExec: "Ryan McInerney (CEO)", linkedin: "https://www.linkedin.com/company/visa", partnerPage: "https://visa.com/partners", devPortal: "https://developer.visa.com", enterpriseSales: "https://visa.com/contact", priority: 7 },
  { company: "Mastercard", website: "https://mastercard.com", category: "Financial Infrastructure", product: "Agentic payments infrastructure, virtual card platforms for AI agents", whyFits: "Agent payments infrastructure; needs cryptographic governance for autonomy", existingSecurity: "Established payment security", governanceGap: "No agent-specific cryptographic enforcement", painPoints: "Agent authorization, compliance", companySize: "Public (30,000+ employees)", funding: "Public (MA)", keyExec: "Michael Miebach (CEO)", linkedin: "https://www.linkedin.com/company/mastercard", partnerPage: "https://mastercard.com/partners", devPortal: "https://developer.mastercard.com", enterpriseSales: "https://mastercard.com/contact", priority: 7 },
];

const CATEGORIES = ['All', ...Array.from(new Set(COMPANIES.map(c => c.category)))];

const CATEGORY_COLORS = {
  'Agent Payments':          { bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.3)',  text: '#22d3ee' },
  'Agent Wallets':           { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', text: '#a78bfa' },
  'AI Trading / DeFi Agents':{ bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  text: '#fbbf24' },
  'Treasury Automation':     { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  text: '#10b981' },
  'Enterprise AI Agents':    { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)',  text: '#3b82f6' },
  'Agent-to-Agent Commerce': { bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.3)', text: '#f472b6' },
  'Autonomous Procurement':  { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.3)',  text: '#fb923c' },
  'Financial Infrastructure': { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)',  text: '#34d399' },
};

function priorityColor(score) {
  if (score >= 10) return { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.3)' };
  if (score >= 9)  return { bg: 'rgba(251,146,60,0.15)', text: '#fb923c', border: 'rgba(251,146,60,0.3)' };
  if (score >= 8)  return { bg: 'rgba(34,211,238,0.12)', text: '#22d3ee', border: 'rgba(34,211,238,0.25)' };
  return             { bg: 'rgba(120,120,163,0.12)',  text: '#7878a3', border: 'rgba(120,120,163,0.25)' };
}

function CategoryBadge({ category }) {
  const c = CATEGORY_COLORS[category] ?? { bg: 'rgba(120,120,163,0.1)', border: 'rgba(120,120,163,0.3)', text: '#7878a3' };
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      padding: '2px 9px', borderRadius: 20,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      whiteSpace: 'nowrap',
    }}>{category}</span>
  );
}

function PriorityBadge({ score }) {
  const c = priorityColor(score);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12, fontWeight: 700,
      padding: '3px 10px', borderRadius: 20,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {score === 10 ? '🔥' : score >= 9 ? '★' : '◆'} {score}
    </span>
  );
}

function ExtLink({ href, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: '#22d3ee', textDecoration: 'none',
        padding: '4px 10px', borderRadius: 8,
        border: '1px solid rgba(34,211,238,0.2)',
        background: 'rgba(34,211,238,0.06)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.14)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.06)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'; }}
    >
      {label} <ExternalLink size={10} />
    </a>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AerediumTargets() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sortField, setSortField]   = useState('priority');
  const [sortDir,   setSortDir]     = useState('desc');
  const [expanded,  setExpanded]    = useState(null); // company name

  const filtered = useMemo(() => {
    let list = COMPANIES;
    if (activeCategory !== 'All') list = list.filter(c => c.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.company.toLowerCase().includes(q) ||
        c.product.toLowerCase().includes(q) ||
        c.whyFits.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [activeCategory, search, sortField, sortDir]);

  const counts = useMemo(() => {
    const m = {};
    COMPANIES.forEach(c => { m[c.category] = (m[c.category] || 0) + 1; });
    return m;
  }, []);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: '#22d3ee' }} /> : <ChevronDown size={12} style={{ color: '#22d3ee' }} />;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030307', color: '#eeeef8', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(34,211,238,0.06) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '56px 32px 40px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: '#22d3ee', textTransform: 'uppercase', marginBottom: 16, opacity: 0.8 }}>
          <span style={{ width: 24, height: 1, background: '#22d3ee', display: 'inline-block' }} />
          AEREDIUM · Target Intelligence
          <span style={{ width: 24, height: 1, background: '#22d3ee', display: 'inline-block' }} />
        </div>
        <h1 style={{ margin: '0 0 12px', fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Partnership Target Companies
        </h1>
        <p style={{ margin: '0 auto', maxWidth: 580, fontSize: 15, color: '#7878a3', lineHeight: 1.7 }}>
          {COMPANIES.length} companies across {CATEGORIES.length - 1} categories — ranked by partnership priority for cryptographic agent governance.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Priority 10', value: COMPANIES.filter(c => c.priority === 10).length, color: '#f87171' },
            { label: 'Priority 9', value: COMPANIES.filter(c => c.priority === 9).length, color: '#fb923c' },
            { label: 'Priority 8', value: COMPANIES.filter(c => c.priority === 8).length, color: '#22d3ee' },
            { label: 'Categories', value: CATEGORIES.length - 1, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '14px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#7878a3', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>

        {/* Search + controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7878a3', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search companies, categories, products…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px 10px 40px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#eeeef8', fontSize: 14, outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7878a3', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#7878a3', whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const active = cat === activeCategory;
            const col = CATEGORY_COLORS[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
                  background: active ? (col ? col.bg : 'rgba(34,211,238,0.12)') : 'rgba(255,255,255,0.04)',
                  color: active ? (col ? col.text : '#22d3ee') : '#7878a3',
                  outline: active ? `1px solid ${col ? col.border : 'rgba(34,211,238,0.3)'}` : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 0.15s',
                }}
              >
                {cat}{cat !== 'All' && counts[cat] ? ` (${counts[cat]})` : ''}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 1fr 70px 160px',
            gap: 0,
            background: 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '0 20px',
          }}>
            {[
              { label: 'Company', field: 'company' },
              { label: 'Product', field: 'product' },
              { label: 'Why AEREDIUM Fits', field: 'whyFits' },
              { label: 'Score', field: 'priority' },
              { label: 'Category', field: 'category' },
            ].map(col => (
              <button
                key={col.field}
                onClick={() => toggleSort(col.field)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '13px 8px', color: '#7878a3', fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left',
                }}
              >
                {col.label} <SortIcon field={col.field} />
              </button>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#4a4a6e', fontSize: 14 }}>
              No companies match your search.
            </div>
          ) : filtered.map((c, i) => {
            const isExpanded = expanded === c.company;
            return (
              <div key={c.company} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {/* Main row */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : c.company)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr 1fr 70px 160px',
                    gap: 0, padding: '14px 20px',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(34,211,238,0.04)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Company */}
                  <div style={{ paddingRight: 12, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 14, fontWeight: 700, color: '#eeeef8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {c.company} <ExternalLink size={11} style={{ opacity: 0.4 }} />
                    </a>
                    <div style={{ fontSize: 11, color: '#4a4a6e' }}>{c.companySize}</div>
                    <div style={{ fontSize: 11, color: '#7878a3' }}>{c.funding}</div>
                  </div>

                  {/* Product */}
                  <div style={{ paddingRight: 16, fontSize: 13, color: '#7878a3', lineHeight: 1.55, display: 'flex', alignItems: 'center' }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.product}
                    </span>
                  </div>

                  {/* Why AEREDIUM */}
                  <div style={{ paddingRight: 16, fontSize: 13, color: '#a5b4fc', lineHeight: 1.55, display: 'flex', alignItems: 'center' }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.whyFits}
                    </span>
                  </div>

                  {/* Score */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PriorityBadge score={c.priority} />
                  </div>

                  {/* Category */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <CategoryBadge category={c.category} />
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div style={{
                    padding: '20px 28px 24px',
                    background: 'rgba(34,211,238,0.025)',
                    borderTop: '1px solid rgba(34,211,238,0.1)',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>
                      {[
                        { label: 'Existing Security', value: c.existingSecurity },
                        { label: 'Governance Gap', value: c.governanceGap },
                        { label: 'Pain Points', value: c.painPoints },
                        { label: 'Key Executive', value: c.keyExec },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4a4a6e', marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 13, color: '#7878a3', lineHeight: 1.6 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#4a4a6e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Links:</span>
                      <ExtLink href={c.partnerPage} label="Partnership" />
                      <ExtLink href={c.devPortal} label="Dev Portal" />
                      <ExtLink href={c.enterpriseSales} label="Enterprise" />
                      <ExtLink href={c.linkedin} label="LinkedIn" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#4a4a6e' }}>
          Click any row to expand company details · {COMPANIES.length} companies · Score 10 = highest partnership priority
        </div>
      </div>
    </div>
  );
}
