import { connectMongo } from "../server/db/mongo";
import { PartnerModel, UserModel } from "../server/db/models";
import { CreatorProfileModel } from "../server/db/creator-models";
import { listPartners, getUserByEmail } from "../server/store";
import {
  generateReferralCode,
  getCreatorById,
} from "../server/creator/creator.service";
import {
  getActiveAgreement,
  setCommissionAgreement,
} from "../server/creator/commission.service";
import { MAX_COMMISSION_PERCENT } from "../server/creator/types";

const checks: Record<string, unknown> = {
  connectMongo,
  PartnerModel,
  UserModel,
  CreatorProfileModel,
  listPartners,
  getUserByEmail,
  generateReferralCode,
  getCreatorById,
  getActiveAgreement,
  setCommissionAgreement,
  MAX_COMMISSION_PERCENT,
};
console.log(
  "PROBE " +
    Object.entries(checks)
      .map(([k, v]) => `${k}:${typeof v === "function" ? "fn" : v != null ? "ok" : "MISSING"}`)
      .join(" "),
);
process.exit(0);
