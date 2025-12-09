"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Users, Mail, Shield, UserPlus, Trash2, Loader2,
    Crown, ShieldCheck, User, Clock, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface TeamMember {
    id: string;
    user_id: string;
    role: "owner" | "admin" | "member";
    email: string;
    name: string;
    created_at: string;
}

interface TeamInvite {
    id: string;
    email: string;
    role: "admin" | "member";
    created_at: string;
    expires_at: string;
}

const ROLE_CONFIG = {
    owner: { label: "Owner", icon: Crown, color: "bg-amber-100 text-amber-700" },
    admin: { label: "Admin", icon: ShieldCheck, color: "bg-blue-100 text-blue-700" },
    member: { label: "Member", icon: User, color: "bg-slate-100 text-slate-700" }
};

export default function TeamPage() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [businessName, setBusinessName] = useState("");
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
    const [sending, setSending] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: "member" | "invite"; id: string; name: string } | null>(null);

    // Fetch team data
    const fetchTeam = async () => {
        try {
            const res = await fetch("/api/team");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setMembers(data.members || []);
            setInvites(data.invites || []);
            setBusinessName(data.businessName || "");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    // Send invite
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setSending(true);
        try {
            const res = await fetch("/api/team", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast.success(`Invitation sent to ${inviteEmail}`);
            setInviteEmail("");
            fetchTeam();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSending(false);
        }
    };

    // Delete member or invite
    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            const param = deleteTarget.type === "member" ? "memberId" : "inviteId";
            const res = await fetch(`/api/team?${param}=${deleteTarget.id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast.success(deleteTarget.type === "member" ? "Member removed" : "Invite cancelled");
            setDeleteTarget(null);
            fetchTeam();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    // Get current user's role
    const currentUserRole = members.find(m => m.role === "owner") ? "owner" :
        members.find(m => m.role === "admin") ? "admin" : "member";
    const canInvite = currentUserRole === "owner" || currentUserRole === "admin";
    const canRemove = currentUserRole === "owner";

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Users className="h-8 w-8" />
                    Team Management
                </h2>
                <p className="text-muted-foreground">
                    Invite team members to help manage {businessName || "your business"}.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left: Members List */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Members</CardTitle>
                            <CardDescription>
                                People with access to this dashboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {members.map((member) => {
                                const config = ROLE_CONFIG[member.role];
                                const RoleIcon = config.icon;
                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-sm text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`${config.color} shadow-none`}>
                                                <RoleIcon className="h-3 w-3 mr-1" />
                                                {config.label}
                                            </Badge>
                                            {canRemove && member.role !== "owner" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setDeleteTarget({
                                                        type: "member",
                                                        id: member.id,
                                                        name: member.name
                                                    })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {members.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p>No team members yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending Invites */}
                    {invites.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-amber-500" />
                                    Pending Invites
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {invites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-amber-50/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                <Mail className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{invite.email}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                                {invite.role}
                                            </Badge>
                                            {canInvite && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setDeleteTarget({
                                                        type: "invite",
                                                        id: invite.id,
                                                        name: invite.email
                                                    })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Invite Form */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-green-500" />
                                Invite Member
                            </CardTitle>
                            <CardDescription>
                                Send an email invitation to join your team
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {canInvite ? (
                                <form onSubmit={handleInvite} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="teammate@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="member">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        Member
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="admin">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="h-4 w-4" />
                                                        Admin
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Separator />

                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <p><strong>Admin:</strong> Full access except billing</p>
                                        <p><strong>Member:</strong> View & message only</p>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={sending}>
                                        {sending ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                        ) : (
                                            <><Mail className="mr-2 h-4 w-4" /> Send Invitation</>
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p>Only admins can invite members</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {deleteTarget?.type === "member" ? "Remove Team Member?" : "Cancel Invitation?"}
                        </DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.type === "member"
                                ? `${deleteTarget?.name} will lose access to this dashboard immediately.`
                                : `The invitation to ${deleteTarget?.name} will be cancelled.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            {deleteTarget?.type === "member" ? "Remove" : "Cancel Invite"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
