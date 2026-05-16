import { Clock3, Mail, Shield, UserMinus, UserRound } from "lucide-react";
import type { WorkspaceInvite, WorkspaceMember } from "@sprintjam/types";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getAvatarInfo, isAvatarUrl } from "@/utils/avatars";
import { getInitials } from "@/utils/initials";

type WorkspaceMemberRole = WorkspaceMember["role"];

interface WorkspaceMemberSectionsProps {
  activeMembers: WorkspaceMember[];
  pendingMembers: WorkspaceMember[];
  invites: WorkspaceInvite[];
  isWorkspaceAdmin: boolean;
  isUpdatingMemberId: number | null;
  onApproveMember: (member: WorkspaceMember) => void;
  onRemoveMember: (member: WorkspaceMember) => void;
  onRoleChange: (member: WorkspaceMember, role: WorkspaceMemberRole) => void;
}

function memberDisplayName(member: WorkspaceMember) {
  return member.name?.trim() || member.email;
}

function MemberAvatar({ member }: { member: WorkspaceMember }) {
  const displayName = memberDisplayName(member);
  const avatarInfo = member.avatar ? getAvatarInfo(member.avatar) : null;
  const fallbackInitials =
    getInitials(displayName) || getInitials(member.email);

  return (
    <Avatar
      className="h-11 w-11 shrink-0 border border-slate-200 bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-semibold uppercase text-white shadow-sm dark:border-white/10 dark:from-brand-600 dark:to-indigo-600"
      src={isAvatarUrl(member.avatar) ? member.avatar : undefined}
      alt={displayName}
      fallback={
        avatarInfo && !isAvatarUrl(member.avatar) ? (
          <avatarInfo.Icon size={22} className={avatarInfo.color} />
        ) : member.avatar && !isAvatarUrl(member.avatar) ? (
          <span className="text-lg normal-case">{member.avatar}</span>
        ) : fallbackInitials ? (
          fallbackInitials
        ) : (
          <UserRound className="h-5 w-5" />
        )
      }
    />
  );
}

function MemberIdentity({ member }: { member: WorkspaceMember }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MemberAvatar member={member} />
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-white">
          {memberDisplayName(member)}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {member.email}
        </p>
      </div>
    </div>
  );
}

function ActiveMemberRow({
  member,
  isWorkspaceAdmin,
  isUpdating,
  onRemoveMember,
  onRoleChange,
}: {
  member: WorkspaceMember;
  isWorkspaceAdmin: boolean;
  isUpdating: boolean;
  onRemoveMember: (member: WorkspaceMember) => void;
  onRoleChange: (member: WorkspaceMember, role: WorkspaceMemberRole) => void;
}) {
  const nextRole = member.role === "admin" ? "member" : "admin";

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-slate-900/60">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <MemberIdentity member={member} />
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge
              variant={member.role === "admin" ? "primary" : "default"}
              size="sm"
            >
              {member.role === "admin" ? "Admin" : "Member"}
            </Badge>
            {member.role === "admin" ? (
              <Badge variant="success" size="sm">
                <Shield className="mr-1 h-3.5 w-3.5" />
                Can manage
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button
            size="sm"
            variant="secondary"
            isLoading={isUpdating}
            disabled={!isWorkspaceAdmin}
            onClick={() => onRoleChange(member, nextRole)}
          >
            {nextRole === "admin" ? "Make admin" : "Make member"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<UserMinus className="h-4 w-4" />}
            isLoading={isUpdating}
            disabled={!isWorkspaceAdmin}
            onClick={() => onRemoveMember(member)}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

function PendingMemberRow({
  member,
  isWorkspaceAdmin,
  isUpdating,
  onApproveMember,
  onRemoveMember,
}: {
  member: WorkspaceMember;
  isWorkspaceAdmin: boolean;
  isUpdating: boolean;
  onApproveMember: (member: WorkspaceMember) => void;
  onRemoveMember: (member: WorkspaceMember) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-3 dark:border-amber-400/20 dark:bg-amber-400/10">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <MemberIdentity member={member} />
          <Badge variant="warning" size="sm">
            Pending approval
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button
            size="sm"
            isLoading={isUpdating}
            disabled={!isWorkspaceAdmin}
            onClick={() => onApproveMember(member)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            isLoading={isUpdating}
            disabled={!isWorkspaceAdmin}
            onClick={() => onRemoveMember(member)}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

function InviteRow({ invite }: { invite: WorkspaceInvite }) {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-3 dark:border-amber-400/20 dark:bg-amber-400/10">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-600 dark:border-amber-400/20 dark:bg-slate-950 dark:text-amber-300">
          <Mail className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-white">
            {invite.email}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Invite sent {new Date(invite.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceMemberSections({
  activeMembers,
  pendingMembers,
  invites,
  isWorkspaceAdmin,
  isUpdatingMemberId,
  onApproveMember,
  onRemoveMember,
  onRoleChange,
}: WorkspaceMemberSectionsProps) {
  const pendingCount = pendingMembers.length + invites.length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Pending access ({pendingCount})
        </p>
        <div className="space-y-3">
          {pendingCount === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No pending approvals or invites.
            </p>
          ) : null}

          {pendingMembers.map((member) => (
            <PendingMemberRow
              key={member.id}
              member={member}
              isWorkspaceAdmin={isWorkspaceAdmin}
              isUpdating={isUpdatingMemberId === member.id}
              onApproveMember={onApproveMember}
              onRemoveMember={onRemoveMember}
            />
          ))}

          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Shield className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          Workspace members ({activeMembers.length})
        </p>
        <div className="space-y-3">
          {activeMembers.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No active members.
            </p>
          ) : null}

          {activeMembers.map((member) => (
            <ActiveMemberRow
              key={member.id}
              member={member}
              isWorkspaceAdmin={isWorkspaceAdmin}
              isUpdating={isUpdatingMemberId === member.id}
              onRemoveMember={onRemoveMember}
              onRoleChange={onRoleChange}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
