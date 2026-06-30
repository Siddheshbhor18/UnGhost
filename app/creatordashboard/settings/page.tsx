"use client";

import { useState } from "react";
import { Settings as SettingsIcon, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Field,
  Input,
  Textarea,
  Select,
  SectionLabel,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useApi, PageState } from "../_components/useApi";
import { ReferralLinkCard } from "../_components/ReferralLinkCard";
import type { ProfileResponse, CampaignsResponse } from "../_lib/api";
import type {
  CreatorProfile,
  PaymentMethod,
  SocialLinks,
} from "@/server/creator/types";

export default function SettingsPage() {
  const profileQuery = useApi<ProfileResponse>("/api/creator/settings");
  const linkQuery = useApi<CampaignsResponse>("/api/creator/campaigns");

  return (
    <div className="space-y-4 py-4">
      <div>
        <SectionLabel icon={<SettingsIcon size={13} />} tone="brand">
          Settings
        </SectionLabel>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-neutral-900">
          Your profile
        </h1>
      </div>

      {linkQuery.data && (
        <ReferralLinkCard url={linkQuery.data.referralUrl} />
      )}

      <PageState query={profileQuery} skeleton={<FormSkeleton />}>
        {(data) =>
          data.profile ? (
            <SettingsForms profile={data.profile} onSaved={profileQuery.reload} />
          ) : (
            <Card padded>
              <p className="text-body-sm text-neutral-500">
                Profile unavailable. Try reloading.
              </p>
            </Card>
          )
        }
      </PageState>
    </div>
  );
}

function SettingsForms({
  profile,
  onSaved,
}: {
  profile: CreatorProfile;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const social = profile.socialLinks ?? {};
  const pay = profile.paymentDetails;

  const [instagram, setInstagram] = useState(social.instagram ?? "");
  const [youtube, setYoutube] = useState(social.youtube ?? "");
  const [linkedin, setLinkedin] = useState(social.linkedin ?? "");
  const [twitter, setTwitter] = useState(social.twitter ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [method, setMethod] = useState<PaymentMethod>(pay?.method ?? "upi");
  const [accountRef, setAccountRef] = useState(pay?.accountRef ?? "");
  const [accountName, setAccountName] = useState(pay?.accountName ?? "");
  const [ifsc, setIfsc] = useState(pay?.ifsc ?? "");
  const [savingPay, setSavingPay] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const socialLinks: SocialLinks = {};
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (youtube.trim()) socialLinks.youtube = youtube.trim();
      if (linkedin.trim()) socialLinks.linkedin = linkedin.trim();
      if (twitter.trim()) socialLinks.twitter = twitter.trim();
      const res = await fetch("/api/creator/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ socialLinks, bio: bio.trim() }),
      });
      if (!res.ok) {
        push({ tone: "error", title: "Couldn't save — check your links are full URLs." });
        return;
      }
      push({ tone: "success", title: "Profile saved." });
      onSaved();
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePayment() {
    setSavingPay(true);
    try {
      const body: {
        method: PaymentMethod;
        accountRef: string;
        accountName?: string;
        ifsc?: string;
      } = { method, accountRef: accountRef.trim() };
      if (accountName.trim()) body.accountName = accountName.trim();
      if (ifsc.trim()) body.ifsc = ifsc.trim().toUpperCase();
      const res = await fetch("/api/creator/payment-details", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        push({ tone: "error", title: "Couldn't save payment details — check the fields." });
        return;
      }
      push({ tone: "success", title: "Payment details saved — pending verification." });
      onSaved();
    } finally {
      setSavingPay(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card padded>
        <h2 className="mb-3 font-display text-lg font-semibold text-neutral-900">
          Social links
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Instagram">
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/you" />
          </Field>
          <Field label="YouTube">
            <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@you" />
          </Field>
          <Field label="LinkedIn">
            <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/you" />
          </Field>
          <Field label="Twitter / X">
            <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/you" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Bio">
            <Textarea value={bio} rows={3} maxLength={2000} onChange={(e) => setBio(e.target.value)} placeholder="A line about you." />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button loading={savingProfile} onClick={saveProfile}>
            Save profile
          </Button>
        </div>
      </Card>

      <Card padded>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-neutral-900">
            Payout details
          </h2>
          {pay ? (
            pay.verified ? (
              <Badge tone="success" leadingIcon={<ShieldCheck size={13} />}>
                Verified
              </Badge>
            ) : (
              <Badge tone="warning" leadingIcon={<ShieldAlert size={13} />}>
                Pending verification
              </Badge>
            )
          ) : null}
        </div>
        <p className="mb-3 text-body-xs text-neutral-500">
          We verify these before your first payout. Changing them resets
          verification.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
            </Select>
          </Field>
          <Field label={method === "upi" ? "UPI ID" : "Account number"}>
            <Input value={accountRef} onChange={(e) => setAccountRef(e.target.value)} placeholder={method === "upi" ? "you@upi" : "Account number"} />
          </Field>
          <Field label="Account holder name">
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Name as per bank" />
          </Field>
          {method === "bank_transfer" && (
            <Field label="IFSC">
              <Input value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="e.g. HDFC0001234" />
            </Field>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button loading={savingPay} disabled={!accountRef.trim()} onClick={savePayment}>
            Save payout details
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FormSkeleton() {
  return (
    <Card padded>
      <div className="space-y-3">
        <Skeleton shape="text" width={120} />
        <Skeleton shape="block" height={40} />
        <Skeleton shape="block" height={40} />
      </div>
    </Card>
  );
}
