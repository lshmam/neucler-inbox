"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
    Building2, Users, Bell, Puzzle, Globe,
    Upload, Mail, Phone, MapPin, Clock, Plus,
    Copy, Check, Link2, Calendar, Webhook,
    Trash2, Settings, Info, Crown, ShieldCheck, User, Loader2, AlertCircle
} from "lucide-react";

interface SettingsClientProps {
    merchantId: string;
    businessName: string;
    profile: any;
}

// Days of week for business hours
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Timezones
const TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (No DST)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

export function SettingsClient({ merchantId, businessName, profile }: SettingsClientProps) {
    // General state
    const [logo, setLogo] = useState<string | null>(null);
    const [name, setName] = useState(businessName || '');
    const [email, setEmail] = useState(profile?.support_email || '');
    const [phone, setPhone] = useState(profile?.support_phone || '');
    const [address, setAddress] = useState(profile?.address || '');
    const [timezone, setTimezone] = useState(profile?.timezone || 'America/Los_Angeles');
    const [masterBookingUrl, setMasterBookingUrl] = useState(profile?.master_booking_url || '');
    const [slug, setSlug] = useState(profile?.slug || '');
    const [businessHours, setBusinessHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
        Monday: { open: '09:00', close: '17:00', closed: false },
        Tuesday: { open: '09:00', close: '17:00', closed: false },
        Wednesday: { open: '09:00', close: '17:00', closed: false },
        Thursday: { open: '09:00', close: '17:00', closed: false },
        Friday: { open: '09:00', close: '17:00', closed: false },
        Saturday: { open: '10:00', close: '14:00', closed: true },
        Sunday: { open: '10:00', close: '14:00', closed: true },
    });

    // Team state - real data from API
    const [teamMembers, setTeamMembers] = useState<{
        id: string; user_id: string; role: 'owner' | 'admin' | 'member';
        email: string; name: string; created_at: string;
    }[]>([]);
    const [teamInvites, setTeamInvites] = useState<{
        id: string; email: string; role: 'admin' | 'member';
        created_at: string; expires_at: string;
    }[]>([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteSending, setInviteSending] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'member' | 'invite'; id: string; name: string } | null>(null);

    // Notification state
    const [notifyNewLead, setNotifyNewLead] = useState(true);
    const [notifyMissedCall, setNotifyMissedCall] = useState(true);
    const [notifyDailySummary, setNotifyDailySummary] = useState(false);
    const [notifyEmail, setNotifyEmail] = useState('');

    // Integration state
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [incomingWebhook] = useState(`https://api.yourapp.com/webhooks/${merchantId}/incoming`);
    const [outgoingWebhook, setOutgoingWebhook] = useState('');

    // Widget state
    const [widgetColor, setWidgetColor] = useState('#906CDD');
    const [widgetGreeting, setWidgetGreeting] = useState('Hi! Text us here');
    const [widgetIcon, setWidgetIcon] = useState('chat');
    const widgetCode = `<script src="https://cdn.yourapp.com/widget.js" data-merchant="${merchantId}" data-color="${widgetColor}"></script>`;

    // Fetch team data
    const fetchTeam = async () => {
        try {
            const res = await fetch('/api/team');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setTeamMembers(data.members || []);
            setTeamInvites(data.invites || []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setTeamLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    const handleSaveGeneral = async () => {
        try {
            const res = await fetch('/api/settings/general', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    address,
                    timezone,
                    masterBookingUrl,
                    slug
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success("Settings saved!");
        } catch (err: any) {
            toast.error(err.message || "Failed to save settings");
        }
    };

    const handleInviteMember = async () => {
        if (!inviteEmail) return;
        setInviteSending(true);
        try {
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success(`Invitation sent to ${inviteEmail}`);
            setInviteEmail('');
            setInviteOpen(false);
            fetchTeam();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setInviteSending(false);
        }
    };

    const handleDeleteTeamItem = async () => {
        if (!deleteTarget) return;
        try {
            const param = deleteTarget.type === 'member' ? 'memberId' : 'inviteId';
            const res = await fetch(`/api/team?${param}=${deleteTarget.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success(deleteTarget.type === 'member' ? 'Member removed' : 'Invite cancelled');
            setDeleteTarget(null);
            fetchTeam();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const ROLE_CONFIG = {
        owner: { label: 'Owner', icon: Crown, color: 'bg-amber-100 text-amber-700' },
        admin: { label: 'Admin', icon: ShieldCheck, color: 'bg-blue-100 text-blue-700' },
        member: { label: 'Member', icon: User, color: 'bg-slate-100 text-slate-700' }
    };

    const currentUserRole = teamMembers.find(m => m.role === 'owner')?.user_id === merchantId ? 'owner' :
        teamMembers.find(m => m.role === 'admin') ? 'admin' : 'member';
    const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';
    const canRemove = currentUserRole === 'owner';

    const handleSaveNotifications = () => {
        toast.success("Notification preferences saved!");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">Manage your account and preferences</p>
                </div>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="general" className="gap-2">
                        <Building2 className="h-4 w-4" /> General
                    </TabsTrigger>
                    <TabsTrigger value="team" className="gap-2">
                        <Users className="h-4 w-4" /> Team
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="h-4 w-4" /> Notifications
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2">
                        <Puzzle className="h-4 w-4" /> Integrations
                    </TabsTrigger>
                    <TabsTrigger value="widget" className="gap-2">
                        <Globe className="h-4 w-4" /> Site Widget
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: GENERAL */}
                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Identity & Operation
                            </CardTitle>
                            <CardDescription>
                                Your business profile used across all AI interactions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Logo Upload */}
                            <div className="flex items-center gap-6">
                                <Avatar className="h-20 w-20">
                                    {logo ? (
                                        <AvatarImage src={logo} />
                                    ) : (
                                        <AvatarFallback className="text-2xl bg-gradient-to-br from-[#906CDD] to-blue-500 text-white">
                                            {name[0]?.toUpperCase() || 'B'}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <div className="space-y-2">
                                    <Label>Logo</Label>
                                    <Button variant="outline" size="sm">
                                        <Upload className="mr-2 h-4 w-4" /> Upload Image
                                    </Button>
                                    <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Business Details */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Business Name</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Support Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@example.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Support Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-10" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Timezone</Label>
                                    <Select value={timezone} onValueChange={setTimezone}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIMEZONES.map(tz => (
                                                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Physical Address */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Physical Address
                                </Label>
                                <Textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="123 Main St, City, State ZIP"
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Used for displaying your location to customers
                                </p>
                            </div>

                            <Separator />

                            {/* Zero-Touch Booking Section */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-green-500" />
                                        Zero-Touch Booking
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Configure your master booking URL for automatic link generation
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Master Booking URL</Label>
                                        <Input
                                            value={masterBookingUrl}
                                            onChange={(e) => setMasterBookingUrl(e.target.value)}
                                            placeholder="https://calendly.com/your-business"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Your Calendly, Cal.com, or booking page URL
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Branded URL Slug</Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground whitespace-nowrap">yourapp.com/go/</span>
                                            <Input
                                                value={slug}
                                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                placeholder="your-business"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Creates trackable short links like /go/{slug}/abc123
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Business Hours */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="flex items-center gap-2 text-base">
                                            <Clock className="h-4 w-4" /> Business Hours
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Automations use these hours to trigger After-Hours messages
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    {DAYS.map(day => (
                                        <div key={day} className="flex items-center gap-4 py-2 px-3 bg-muted/30 rounded-lg">
                                            <div className="w-28 font-medium text-sm">{day}</div>
                                            <Switch
                                                checked={!businessHours[day].closed}
                                                onCheckedChange={(checked) => setBusinessHours({
                                                    ...businessHours,
                                                    [day]: { ...businessHours[day], closed: !checked }
                                                })}
                                            />
                                            {!businessHours[day].closed ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="time"
                                                        value={businessHours[day].open}
                                                        onChange={(e) => setBusinessHours({
                                                            ...businessHours,
                                                            [day]: { ...businessHours[day], open: e.target.value }
                                                        })}
                                                        className="w-32 h-8"
                                                    />
                                                    <span className="text-muted-foreground">to</span>
                                                    <Input
                                                        type="time"
                                                        value={businessHours[day].close}
                                                        onChange={(e) => setBusinessHours({
                                                            ...businessHours,
                                                            [day]: { ...businessHours[day], close: e.target.value }
                                                        })}
                                                        className="w-32 h-8"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Closed</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSaveGeneral} className="bg-[#906CDD] hover:bg-[#7a5bb5]">
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: TEAM */}
                <TabsContent value="team" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Team Members
                                    </CardTitle>
                                    <CardDescription>
                                        Manage who has access to this account
                                    </CardDescription>
                                </div>
                                {canInvite && (
                                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Plus className="mr-2 h-4 w-4" /> Invite Member
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Invite Team Member</DialogTitle>
                                                <DialogDescription>
                                                    Send an email invitation to join your team
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>Email Address</Label>
                                                    <Input
                                                        type="email"
                                                        placeholder="colleague@example.com"
                                                        value={inviteEmail}
                                                        onChange={(e) => setInviteEmail(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Role</Label>
                                                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">
                                                                <div className="flex items-center gap-2">
                                                                    <ShieldCheck className="h-4 w-4" /> Admin (Full access except billing)
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="member">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="h-4 w-4" /> Member (View & message only)
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                                                <Button onClick={handleInviteMember} disabled={inviteSending}>
                                                    {inviteSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Invitation'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {teamLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : teamMembers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p>No team members yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {teamMembers.map((member) => {
                                        const config = ROLE_CONFIG[member.role];
                                        const RoleIcon = config.icon;
                                        return (
                                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
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
                                                    {canRemove && member.role !== 'owner' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => setDeleteTarget({ type: 'member', id: member.id, name: member.name })}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending Invites */}
                    {teamInvites.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-600">
                                    <Clock className="h-5 w-5" />
                                    Pending Invites
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {teamInvites.map((invite) => (
                                    <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-amber-50/50">
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
                                            <Badge variant="outline">{invite.role}</Badge>
                                            {canInvite && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setDeleteTarget({ type: 'invite', id: invite.id, name: invite.email })}
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

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {deleteTarget?.type === 'member' ? 'Remove Team Member?' : 'Cancel Invitation?'}
                                </DialogTitle>
                                <DialogDescription>
                                    {deleteTarget?.type === 'member'
                                        ? `${deleteTarget?.name} will lose access to this dashboard immediately.`
                                        : `The invitation to ${deleteTarget?.name} will be cancelled.`
                                    }
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteTeamItem}>
                                    {deleteTarget?.type === 'member' ? 'Remove' : 'Cancel Invite'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* TAB 3: NOTIFICATIONS */}
                <TabsContent value="notifications" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notification Preferences
                            </CardTitle>
                            <CardDescription>
                                Configure how you get alerted about leads and activity
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Notification Email</Label>
                                <Input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={notifyEmail}
                                    onChange={(e) => setNotifyEmail(e.target.value)}
                                />
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">New Lead Captured</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Email me when a new lead comes in via call, SMS, or widget
                                        </p>
                                    </div>
                                    <Switch checked={notifyNewLead} onCheckedChange={setNotifyNewLead} />
                                </div>

                                <div className="flex items-center justify-between py-3 border-b">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Missed Call Alert</Label>
                                        <p className="text-sm text-muted-foreground">
                                            SMS me when a call is missed (AI couldn't answer)
                                        </p>
                                    </div>
                                    <Switch checked={notifyMissedCall} onCheckedChange={setNotifyMissedCall} />
                                </div>

                                <div className="flex items-center justify-between py-3">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Daily Summary Report</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive a daily email with lead summary and AI performance
                                        </p>
                                    </div>
                                    <Switch checked={notifyDailySummary} onCheckedChange={setNotifyDailySummary} />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSaveNotifications}>Save Preferences</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: INTEGRATIONS */}
                <TabsContent value="integrations" className="space-y-6">
                    {/* Calendar */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                Calendar Integration
                            </CardTitle>
                            <CardDescription>
                                Sync your calendar to show real-time availability
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Calendar className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Google Calendar</p>
                                        <p className="text-sm text-muted-foreground">
                                            {calendarConnected ? 'Connected' : 'Not connected'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant={calendarConnected ? 'outline' : 'default'}
                                    onClick={() => setCalendarConnected(!calendarConnected)}
                                >
                                    {calendarConnected ? 'Disconnect' : 'Connect'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Webhooks */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Webhook className="h-5 w-5 text-orange-500" />
                                Webhooks
                            </CardTitle>
                            <CardDescription>
                                Connect to external tools like Zapier, Jobber, or ServiceTitan
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Incoming */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-green-500" />
                                    <Label className="text-base">Incoming Webhook</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Receive data from Typeform, Zapier, or other tools
                                </p>
                                <div className="flex gap-2">
                                    <Input value={incomingWebhook} readOnly className="font-mono text-xs bg-muted" />
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(incomingWebhook)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            {/* Outgoing */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-blue-500" />
                                    <Label className="text-base">Outgoing Webhook</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Send lead data to Jobber, ServiceTitan, or your CRM
                                </p>
                                <Input
                                    value={outgoingWebhook}
                                    onChange={(e) => setOutgoingWebhook(e.target.value)}
                                    placeholder="https://your-crm.com/webhooks/leads"
                                    className="font-mono text-sm"
                                />
                                <Button variant="outline" size="sm">Test Webhook</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 5: SITE WIDGET */}
                <TabsContent value="widget" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-indigo-500" />
                                Website Chat Widget
                            </CardTitle>
                            <CardDescription>
                                Configure the chat bubble that appears on your website
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Config */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Brand Color</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                value={widgetColor}
                                                onChange={(e) => setWidgetColor(e.target.value)}
                                                className="w-16 h-10 p-1 cursor-pointer"
                                            />
                                            <Input
                                                value={widgetColor}
                                                onChange={(e) => setWidgetColor(e.target.value)}
                                                className="font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Greeting Message</Label>
                                        <Input
                                            value={widgetGreeting}
                                            onChange={(e) => setWidgetGreeting(e.target.value)}
                                            placeholder="Hi! How can we help?"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Widget Icon</Label>
                                        <Select value={widgetIcon} onValueChange={setWidgetIcon}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="chat">💬 Chat Bubble</SelectItem>
                                                <SelectItem value="phone">📞 Phone</SelectItem>
                                                <SelectItem value="help">❓ Help</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="space-y-2">
                                    <Label>Preview</Label>
                                    <div className="border rounded-lg p-8 bg-slate-50 relative min-h-[200px]">
                                        <div
                                            className="absolute bottom-4 right-4 h-14 w-14 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                                            style={{ backgroundColor: widgetColor }}
                                        >
                                            <span className="text-2xl">
                                                {widgetIcon === 'chat' ? '💬' : widgetIcon === 'phone' ? '📞' : '❓'}
                                            </span>
                                        </div>
                                        <div
                                            className="absolute bottom-20 right-4 bg-white rounded-lg shadow-lg p-3 max-w-[200px]"
                                            style={{ borderColor: widgetColor, borderWidth: '2px' }}
                                        >
                                            <p className="text-sm">{widgetGreeting}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Install Code */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base">Install Code</Label>
                                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(widgetCode)}>
                                        <Copy className="mr-2 h-4 w-4" /> Copy Code
                                    </Button>
                                </div>
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Paste this code before the closing <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> tag on your website.
                                    </AlertDescription>
                                </Alert>
                                <Textarea
                                    value={widgetCode}
                                    readOnly
                                    className="font-mono text-xs bg-slate-900 text-green-400 h-20"
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button className="bg-[#906CDD] hover:bg-[#7a5bb5]">
                                    Save Widget Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >
        </div >
    );
}
