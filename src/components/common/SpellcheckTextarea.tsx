import { Sparkles } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  applyAllSpellFixes,
  applySingleSpellFix,
  findFrenchSpellIssues,
} from '../../utils/frenchSpellcheck';

interface SpellcheckTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Champ texte avec correcteur orthographique français double couche :
 * 1) Attributs natifs navigateur (lang="fr", spellCheck, autoCorrect)
 * 2) Détection hors-ligne instantanée avec soulignement ondulé rouge + correction en 1 tap.
 */
export const SpellcheckTextarea: React.FC<SpellcheckTextareaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 2,
  className = '',
  style,
}) => {
  const issues = useMemo(() => findFrenchSpellIssues(value), [value]);

  // Segments pour afficher le texte avec soulignement ondulé rouge sur les mots mal orthographiés
  const highlightedSegments = useMemo(() => {
    if (issues.length === 0) return null;
    const nodes: React.ReactNode[] = [];
    let cursor = 0;

    issues.forEach((issue, idx) => {
      if (issue.index > cursor) {
        nodes.push(<span key={`txt-${idx}`}>{value.slice(cursor, issue.index)}</span>);
      }
      nodes.push(
        <button
          key={`err-${idx}`}
          type="button"
          onClick={() => onChange(applySingleSpellFix(value, issue))}
          title={`Cliquer pour corriger en « ${issue.suggestion} »`}
          className="underline decoration-wavy decoration-[#C93535] underline-offset-4 font-medium cursor-pointer hover:bg-[#FDF1F1] rounded px-0.5"
          style={{ color: 'var(--err-text)' }}
        >
          {issue.original}
        </button>
      );
      cursor = issue.index + issue.length;
    });

    if (cursor < value.length) {
      nodes.push(<span key="txt-end">{value.slice(cursor)}</span>);
    }

    return nodes;
  }, [issues, value, onChange]);

  return (
    <div className="space-y-2">
      <textarea
        lang="fr"
        spellCheck={true}
        autoCorrect="on"
        autoCapitalize="sentences"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] resize-none focus:outline-none focus:border-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] ${className}`}
      />

      {issues.length > 0 && (
        <div
          className="p-2.5 rounded-xl border text-[12px] space-y-2"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--err-border)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium" style={{ color: 'var(--err-text)' }}>
              {issues.length} faute{issues.length > 1 ? 's' : ''} détectée{issues.length > 1 ? 's' : ''} :
            </span>
            <button
              type="button"
              onClick={() => onChange(applyAllSpellFixes(value))}
              style={{ color: 'var(--accent)' }}
              className="text-[11px] font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              Tout corriger
            </button>
          </div>

          {/* Aperçu souligné en rouge ondulé */}
          <div className="leading-relaxed" style={{ color: 'var(--ink-primary)' }}>
            {highlightedSegments}
          </div>

          {/* Suggestions cliquables en 1 tap */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {issues.slice(0, 4).map((iss, idx) => (
              <button
                key={`${iss.original}-${idx}`}
                type="button"
                onClick={() => onChange(applySingleSpellFix(value, iss))}
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--ink-primary)',
                }}
                className="px-2 py-0.5 rounded-md border text-[11px] cursor-pointer hover:border-[var(--accent)] transition-colors"
              >
                <span className="line-through opacity-60 mr-1">{iss.original}</span>
                <span className="font-semibold" style={{ color: 'var(--ok-text)' }}>
                  → {iss.suggestion}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
