const API_URL = import.meta.env.VITE_API_URL || "";

interface PricingRecommendation {
    recommendedBuyPrice: number;
    recommendedSellPrice: number;
    confidenceScore: number;
    reasoning: string;
}

interface AIPricingRequest {
    specs: string;
    condition: 'NEW' | 'USED_A' | 'USED_B' | 'USED_C' | 'BROKEN' | 'IN_INSPECTION';
    additionalNotes?: string;
}

export const aiService = {
    /**
     * Get pricing recommendations from the AI engine based on laptop specs and condition.
     */
    async getPricingRecommendation(data: AIPricingRequest): Promise<PricingRecommendation> {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_URL}/ai/pricing`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Gagal mendapatkan rekomendasi AI");
        }

        return await response.json();
    }
};
