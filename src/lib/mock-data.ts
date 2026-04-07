import { syncDerivedFinancials } from "@/lib/dashboard/merge-targets";
import type {
  Brand,
  CampaignObjective,
  Creator,
  CreatorTarget,
  Organization,
  Project,
  TikTokAccount,
} from "./types";

export const organizations: Organization[] = [
  { id: "org-1", name: "Nova Media Group" },
  { id: "org-2", name: "Pulse Creative Lab" },
];

export const brands: Brand[] = [
  { id: "brand-1", name: "USP Branding", tableSegmentId: "tnc" },
  { id: "brand-2", name: "Cashflow Farm", tableSegmentId: "folo" },
  { id: "brand-3", name: "Public Goods Co.", tableSegmentId: "tnc" },
];

export const creators: Creator[] = [
  {
    id: "cr-1",
    name: "Aira Lin",
    avatarUrl:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Aira&backgroundColor=0f172a",
    handleTikTok: "@aira.creates",
    organizationId: "org-1",
    brandIds: ["brand-1", "brand-3"],
    creatorType: "Internal",
  },
  {
    id: "cr-2",
    name: "Mika Reyes",
    avatarUrl:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Mika&backgroundColor=0f172a",
    handleTikTok: "@mika.reyes",
    organizationId: "org-1",
    brandIds: ["brand-2"],
    creatorType: "External",
  },
  {
    id: "cr-3",
    name: "Jordan Vale",
    avatarUrl:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=0f172a",
    handleTikTok: "@jordanvale",
    organizationId: "org-2",
    brandIds: ["brand-1", "brand-2"],
    creatorType: "AssetLoan",
  },
];

export const projects: Project[] = [
  {
    id: "pr-1",
    name: "Public Campaign",
    brandId: "brand-3",
    organizationId: "org-1",
  },
  {
    id: "pr-2",
    name: "Cashflow Farm",
    brandId: "brand-2",
    organizationId: "org-1",
  },
  {
    id: "pr-3",
    name: "USP Branding",
    brandId: "brand-1",
    organizationId: "org-2",
  },
];

export const campaignObjectives: CampaignObjective[] = [
  { id: "camp-1", label: "Awareness" },
  { id: "camp-2", label: "Conversion" },
  { id: "camp-3", label: "Evergreen" },
];

export const tiktokAccounts: TikTokAccount[] = [
  { id: "tt-1", creatorId: "cr-1", label: "@aira.creates (main)" },
  { id: "tt-2", creatorId: "cr-2", label: "@mika.reyes (shop)" },
  { id: "tt-3", creatorId: "cr-3", label: "@jordanvale (alt)" },
];

/** Default base pay by creator type — selaras dengan {@link BASE_PAY_PRESET_VALUES} */
export const defaultBasePayByType: Record<
  Creator["creatorType"],
  number
> = {
  Internal: 785_350,
  External: 785_350,
  AssetLoan: 2_356_050,
};

const MONTH = "2026-03";

const rawInitialTargets: CreatorTarget[] = [
  {
    id: "t-1",
    creatorId: "cr-1",
    projectId: "pr-1",
    campaignObjectiveId: "camp-1",
    creatorType: "Internal",
    tiktokAccountId: "tt-1",
    sortIndex: 0,
    tableSegmentId: "tnc",
    progressWeekIndex: null,
    month: MONTH,
    targetVideos: 24,
    submittedVideos: 22,
    submittedVideoUrls: [],
    incentivePerVideo: 0,
    incentivePercent: 38,
    tncSharingPercent: 42,
    hndSharingPercent: 20,
    tncSharingAmount: 0,
    hndSharingAmount: 0,
    basePay: 785_350,
    expectedRevenue: 0,
    actualRevenue: 0,
    incentives: 0,
    reimbursements: 120,
    expectedProfit: 0,
    actualProfit: 0,
  },
  {
    id: "t-2",
    creatorId: "cr-1",
    projectId: "pr-3",
    campaignObjectiveId: "camp-3",
    creatorType: "Internal",
    tiktokAccountId: "tt-1",
    sortIndex: 1,
    tableSegmentId: "folo",
    progressWeekIndex: null,
    month: MONTH,
    targetVideos: 12,
    submittedVideos: 11,
    submittedVideoUrls: [],
    incentivePerVideo: 0,
    incentivePercent: 35,
    tncSharingPercent: 45,
    hndSharingPercent: 20,
    tncSharingAmount: 0,
    hndSharingAmount: 0,
    basePay: 785_350,
    expectedRevenue: 0,
    actualRevenue: 0,
    incentives: 0,
    reimbursements: 80,
    expectedProfit: 0,
    actualProfit: 0,
  },
  {
    id: "t-3",
    creatorId: "cr-2",
    projectId: "pr-2",
    campaignObjectiveId: "camp-2",
    creatorType: "External",
    tiktokAccountId: "tt-2",
    sortIndex: 0,
    tableSegmentId: "folo",
    progressWeekIndex: null,
    month: MONTH,
    targetVideos: 18,
    submittedVideos: 14,
    submittedVideoUrls: [],
    incentivePerVideo: 0,
    incentivePercent: 40,
    tncSharingPercent: 40,
    hndSharingPercent: 20,
    tncSharingAmount: 0,
    hndSharingAmount: 0,
    basePay: 2_356_050,
    expectedRevenue: 0,
    actualRevenue: 0,
    incentives: 0,
    reimbursements: 140,
    expectedProfit: 0,
    actualProfit: 0,
  },
  {
    id: "t-4",
    creatorId: "cr-3",
    projectId: "pr-3",
    campaignObjectiveId: "camp-1",
    creatorType: "AssetLoan",
    tiktokAccountId: "tt-3",
    sortIndex: 0,
    tableSegmentId: "tnc",
    progressWeekIndex: null,
    month: MONTH,
    targetVideos: 10,
    submittedVideos: 12,
    submittedVideoUrls: [],
    incentivePerVideo: 0,
    incentivePercent: 33,
    tncSharingPercent: 34,
    hndSharingPercent: 33,
    tncSharingAmount: 0,
    hndSharingAmount: 0,
    basePay: 2_356_050,
    expectedRevenue: 0,
    actualRevenue: 0,
    incentives: 0,
    reimbursements: 60,
    expectedProfit: 0,
    actualProfit: 0,
  },
];

export const initialTargets: CreatorTarget[] = rawInitialTargets.map((t) =>
  syncDerivedFinancials(t),
);
