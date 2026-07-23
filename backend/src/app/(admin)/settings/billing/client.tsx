"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BillingClient({ subscription, invoices, organizationId }: { subscription: any, invoices: any[], organizationId: string }) {
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async (planKey: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/subscription/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planKey })
            });
            const data = await res.json();
            if (data.checkoutUrl) {
                // Redirect to stub checkout or actual payment page
                window.location.href = data.checkoutUrl;
            } else {
                alert(data.error || "Failed to start checkout");
            }
        } catch (error) {
            console.error("Upgrade error", error);
            alert("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleMockWebhook = async (planKey: string) => {
        // Developer tool for phase 5: Fake a webhook to instantly upgrade
        const res = await fetch("/api/webhooks/billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "payment_success",
                invoiceId: invoices[0]?.id || "mock-invoice-id",
                planKey,
                orgId: organizationId
            })
        });
        if (res.ok) {
            alert("Webhook triggered. Refreshing page.");
            window.location.reload();
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Current Plan: {subscription?.plan?.name || "None"}</CardTitle>
                    <CardDescription>
                        Status: <span className="capitalize font-semibold">{subscription?.status || "inactive"}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm space-y-2">
                        <p><strong>Renewal Date:</strong> {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}</p>
                        <p><strong>Transactions Limit:</strong> {subscription?.plan?.maxTransactionsPerMonth === null ? "Unlimited" : subscription?.plan?.maxTransactionsPerMonth}</p>
                        <p><strong>Stores Limit:</strong> {subscription?.plan?.maxStores === null ? "Unlimited" : subscription?.plan?.maxStores}</p>
                    </div>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button onClick={() => handleUpgrade("pro")} disabled={loading}>
                        Upgrade to Pro
                    </Button>
                    <Button variant="outline" onClick={() => handleUpgrade("business")} disabled={loading}>
                        Upgrade to Business
                    </Button>
                </CardFooter>
            </Card>

            {/* Developer Only Tools to test Phase 5 stub */}
            <Card className="border-red-500 bg-red-50/50 dark:bg-red-950/20">
                <CardHeader>
                    <CardTitle className="text-red-500">Developer Stub Tools</CardTitle>
                    <CardDescription>Simulate webhook callbacks for testing.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleMockWebhook("pro")}>Simulate Pro Payment</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleMockWebhook("business")}>Simulate Business Payment</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice History</CardTitle>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No invoices found.</p>
                    ) : (
                        <div className="space-y-4">
                            {invoices.map((inv) => (
                                <div key={inv.id} className="flex justify-between items-center p-4 border rounded-md">
                                    <div>
                                        <p className="font-medium">{inv.description}</p>
                                        <p className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">Rp {inv.amount.toLocaleString()}</p>
                                        <p className={`text-sm ${inv.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {inv.status.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
