"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Server, Users, UserX } from "lucide-react";

export default function PlatformClient({ organizations, isImpersonating, currentOrgId }: { organizations: any[], isImpersonating: boolean, currentOrgId: string | null }) {
    const [loading, setLoading] = useState(false);

    const handleImpersonate = async (orgId: string) => {
        if (!confirm("Are you sure you want to impersonate this tenant? You will have full access to their data.")) return;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/impersonate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId: orgId })
            });
            if (res.ok) {
                window.location.href = "/dashboard";
            } else {
                alert("Failed to start impersonation");
                setLoading(false);
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleStopImpersonation = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/impersonate/stop", {
                method: "POST"
            });
            if (res.ok) {
                window.location.reload();
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {isImpersonating && (
                <div className="flex justify-end">
                    <Button variant="destructive" onClick={handleStopImpersonation} disabled={loading} className="gap-2 font-bold">
                        <UserX className="h-4 w-4" /> Stop Impersonating
                    </Button>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                    <Card key={org.id} className={currentOrgId === org.id ? "border-primary shadow-md" : ""}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl flex items-center justify-between">
                                {org.name}
                                {currentOrgId === org.id && <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">Active</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2 mb-4">
                                <p className="text-muted-foreground flex items-center gap-2">
                                    <Server className="h-4 w-4" /> {org.stores?.length || 0} Stores
                                </p>
                            </div>
                            
                            {!isImpersonating || currentOrgId !== org.id ? (
                                <Button 
                                    variant="outline" 
                                    className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                                    onClick={() => handleImpersonate(org.id)}
                                    disabled={loading}
                                >
                                    <Users className="h-4 w-4" /> Impersonate
                                </Button>
                            ) : (
                                <Button 
                                    variant="secondary" 
                                    className="w-full gap-2 opacity-50 cursor-not-allowed"
                                    disabled={true}
                                >
                                    Currently Impersonating
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
