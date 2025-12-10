import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, User, Mail, Building, Briefcase, FileText, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  job_title: z.string().max(100).optional().nullable(),
  avatar_url: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
});

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, roles, loading, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    company: "",
    job_title: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        company: profile.company || "",
        job_title: profile.job_title || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setErrors({});

    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    const { error } = await updateProfile({
      full_name: formData.full_name,
      bio: formData.bio || null,
      company: formData.company || null,
      job_title: formData.job_title || null,
      avatar_url: formData.avatar_url || null,
    });
    setIsSaving(false);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      setIsEditing(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center justify-between h-full px-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl py-8 px-4">
        <Tabs defaultValue="view" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Profile</h1>
            <TabsList>
              <TabsTrigger value="view" onClick={() => setIsEditing(false)}>View</TabsTrigger>
              <TabsTrigger value="edit" onClick={() => setIsEditing(true)}>Edit</TabsTrigger>
            </TabsList>
          </div>

          {/* View Profile */}
          <TabsContent value="view" className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials(profile?.full_name || "U")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <h2 className="text-2xl font-bold">{profile?.full_name || "Unnamed User"}</h2>
                    <p className="text-muted-foreground">{profile?.email}</p>
                    
                    {(profile?.job_title || profile?.company) && (
                      <p className="text-sm text-muted-foreground">
                        {profile?.job_title}
                        {profile?.job_title && profile?.company && " at "}
                        {profile?.company}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {roles.map((role) => (
                        <Badge key={role.id} variant={role.role === "admin" ? "default" : "secondary"}>
                          {role.role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {profile?.bio && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-muted-foreground">{profile.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Member since</Label>
                    <p className="font-medium">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last updated</Label>
                    <p className="font-medium">
                      {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Edit Profile */}
          <TabsContent value="edit" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                    {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={profile?.email || ""}
                        disabled
                        className="pl-10 opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="job_title"
                        value={formData.job_title}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                        placeholder="Software Engineer"
                        className="pl-10"
                      />
                    </div>
                    {errors.job_title && <p className="text-sm text-destructive">{errors.job_title}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Acme Inc."
                        className="pl-10"
                      />
                    </div>
                    {errors.company && <p className="text-sm text-destructive">{errors.company}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  {errors.avatar_url && <p className="text-sm text-destructive">{errors.avatar_url}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="pl-10 min-h-[100px]"
                    />
                  </div>
                  {errors.bio && <p className="text-sm text-destructive">{errors.bio}</p>}
                </div>

                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
