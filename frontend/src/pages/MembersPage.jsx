import React, { useEffect, useState } from "react";
import { Users, Copy, RefreshCw, Trash2, Shield, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchMembers, updateMemberRole, removeMember, regenerateTenantCode } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { TableSkeleton } from "../components/ui/Skeleton";

export function MembersPage() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [tenantCode, setTenantCode] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchMembers();
      setMembers(data);
    } catch (err) {
      toast.error("Failed to load members list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleToggle = async (memberId, currentRole) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    try {
      await updateMemberRole(memberId, newRole);
      toast.success(`Role updated to ${newRole}`);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to update role");
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember(memberId);
      toast.success("Member removed");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const res = await regenerateTenantCode();
      setTenantCode(res.code);
      toast.success("New invite code generated!");
    } catch (err) {
      toast.error("Failed to regenerate code");
    }
  };

  const copyInviteLink = () => {
    if (tenantCode) {
      navigator.clipboard.writeText(tenantCode);
      toast.success("Invite code copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="skeuo-raised p-6">
          <TableSkeleton rows={4} cols={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Invite Code Box */}
      <div className="skeuo-raised p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-heading)]">Team Invite Code</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Share this code with teammates so they can join your tenant</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="skeuo-inset px-4 py-2 text-sm font-mono font-bold tracking-widest text-[var(--info)] bg-white">
            {tenantCode || "CLICK REGENERATE"}
          </div>
          <button onClick={copyInviteLink} disabled={!tenantCode} className="skeuo-btn skeuo-btn-sm" title="Copy code">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleRegenerateCode} className="skeuo-btn skeuo-btn-sm" title="Generate code">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="skeuo-raised overflow-hidden">
        <div className="p-4 border-b border-[var(--border-light)] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--info)]" />
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Tenant Members ({members.length})</h3>
          </div>
        </div>

        <table className="skeuo-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="font-semibold text-[var(--text-heading)] flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-[var(--info-light)] text-[var(--info)] flex items-center justify-center text-xs font-bold border border-[var(--info-border)]">
                    {m.full_name?.[0]?.toUpperCase()}
                  </div>
                  {m.full_name}
                </td>
                <td className="text-xs text-[var(--text-body)]">{m.email}</td>
                <td>
                  <span className={`skeuo-badge ${m.role === "admin" ? "skeuo-badge-info" : "skeuo-badge-neutral"}`}>
                    {m.role === "admin" ? <Shield className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                    {m.role}
                  </span>
                </td>
                <td className="text-xs text-[var(--text-muted)]">
                  {m.created_at ? new Date(m.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="text-right space-x-1">
                  {m.id !== currentUser.id && (
                    <>
                      <button
                        onClick={() => handleRoleToggle(m.id, m.role)}
                        className="skeuo-btn skeuo-btn-ghost skeuo-btn-sm text-xs"
                      >
                        Toggle Role
                      </button>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="skeuo-btn skeuo-btn-ghost skeuo-btn-sm text-[var(--error)] hover:bg-[var(--error-light)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
