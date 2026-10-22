const severityStyles = {
  Low: 'border-slate-400/20 bg-slate-400/10 text-slate-200',
  Medium: 'border-blue-400/25 bg-blue-400/10 text-blue-200',
  High: 'border-orange-400/25 bg-orange-400/10 text-orange-200',
  Critical: 'border-red-400/30 bg-red-500/15 text-red-200',
};

export default function AIAnalysisCard({ report, compact = false, showSignals = false }) {
  if (!report) return null;

  const confidence = Math.max(0, Math.min(1, Number(report.ai_confidence_score) || 0));
  const confidencePercent = Math.round(confidence * 100);
  const detectedCategory = report.ai_detected_category || 'Unknown';
  const flags = Array.isArray(report.ai_flags) ? report.ai_flags : [];
  const severityClass = severityStyles[report.severity] || severityStyles.Medium;
  const mismatch = report.ai_detected_category && report.ai_detected_category !== report.category;

  return (
    <section className={`rounded-2xl border border-blue-400/15 bg-[#101116]/95 ${compact ? 'p-4' : 'p-5'} shadow-[0_16px_50px_rgba(37,99,235,0.1)]`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">AI analysis</h3>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${severityClass}`}>
          {report.severity || 'Medium'} severity
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-400">Detected category</span>
        <span className="text-right font-semibold text-slate-100">{detectedCategory}</span>
      </div>

      <div className="mt-3">
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-slate-400">Confidence</span>
          <span className="font-bold text-blue-200">{confidencePercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {mismatch && (
        <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
          AI thinks this looks like {detectedCategory}. An officer will review it.
        </p>
      )}

      {showSignals && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {report.description_assessment && (
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${report.description_assessment === 'contradicted' ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              description: {report.description_assessment}
            </span>
          )}
          {report.authenticity && (
            <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200">
              authenticity: {report.authenticity.replaceAll('_', ' ')}
            </span>
          )}
          {report.image_type && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
              image: {report.image_type.replaceAll('_', ' ')}
            </span>
          )}
          {(report.authenticity_signals || []).map(signal => (
            <span key={signal} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-100">
              {signal}
            </span>
          ))}
        </div>
      )}

      {showSignals && report.description_observation && (
        <p className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/5 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
          Description check: {report.description_observation}
        </p>
      )}

      {showSignals && flags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {flags.map(flag => (
            <span key={flag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
              {flag.replaceAll('_', ' ')}
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        {report.ai_summary || 'No AI summary is available.'}
      </p>
      {report.status === 'Needs Review' && (
        <p className="mt-3 text-xs leading-relaxed text-slate-400">An officer will review your photo and report.</p>
      )}
    </section>
  );
}
