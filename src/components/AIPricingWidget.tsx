import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, DollarSign, Activity } from "lucide-react";
import { aiService } from "@/services/aiService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIPricingWidgetProps {
  specs: string;
  condition: string;
  onApplyBuyPrice?: (price: number) => void;
  onApplySellPrice?: (price: number) => void;
  className?: string;
}

export function AIPricingWidget({ specs, condition, onApplyBuyPrice, onApplySellPrice, className }: AIPricingWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    buyPrice: number;
    sellPrice: number;
    confidence: number;
    reasoning: string;
  } | null>(null);

  const handleSuggest = async () => {
    if (!specs || specs.trim().length < 5) {
      toast.error("Spesifikasi terlalu singkat untuk dianalisis AI");
      return;
    }

    // Map internal condition to schema expected by backend
    let mappedCondition: 'NEW' | 'USED_A' | 'USED_B' | 'USED_C' | 'BROKEN' | 'IN_INSPECTION' = 'USED_A';
    if (condition === "Baru") mappedCondition = 'NEW';
    else if (condition === "Bekas (Mulus)") mappedCondition = 'USED_A';
    else if (condition === "Bekas (Lecet)") mappedCondition = 'USED_B';
    else if (condition.startsWith("Minus")) mappedCondition = 'USED_C';
    else if (condition === "Mati Total") mappedCondition = 'BROKEN';

    setIsLoading(true);
    try {
      const res = await aiService.getPricingRecommendation({
        specs,
        condition: mappedCondition
      });

      setRecommendation({
        buyPrice: res.recommendedBuyPrice,
        sellPrice: res.recommendedSellPrice,
        confidence: res.confidenceScore,
        reasoning: res.reasoning
      });
      
      toast.success("AI berhasil menganalisis spesifikasi!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mendapatkan rekomendasi harga");
    } finally {
      setIsLoading(false);
    }
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  return (
    <div className={cn("rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden", className)}>
      <div className="p-3 bg-blue-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-400">AI Pricing Intelligence</h4>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleSuggest} 
          disabled={isLoading || !specs}
          className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm transition-all"
        >
          {isLoading ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isLoading ? "Menganalisis..." : "Taksir Harga"}
        </Button>
      </div>

      {recommendation && (
        <div className="p-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Harga Beli (Max)
              </span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {formatIDR(recommendation.buyPrice)}
              </div>
              {onApplyBuyPrice && (
                <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => onApplyBuyPrice(recommendation.buyPrice)}>
                  Gunakan Harga
                </Button>
              )}
            </div>

            <div className="space-y-1.5 bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full -mr-8 -mt-8" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-1 relative z-10">
                <DollarSign className="w-3 h-3" /> Harga Jual (Min)
              </span>
              <div className="text-lg font-bold text-green-700 dark:text-green-400 relative z-10">
                {formatIDR(recommendation.sellPrice)}
              </div>
              {onApplySellPrice && (
                <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs border-green-200 hover:bg-green-50 text-green-700 relative z-10" onClick={() => onApplySellPrice(recommendation.sellPrice)}>
                  Gunakan Harga
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Analisis AI:</span>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full",
                recommendation.confidence >= 80 ? "bg-green-100 text-green-700" :
                recommendation.confidence >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
              )}>
                Skor Akurasi: {recommendation.confidence}%
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
              {recommendation.reasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
