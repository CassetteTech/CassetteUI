import type { InternalMatchDecisionEvidence } from '@/types';
import { Field, Mono } from './kit/primitives';
import { appliedResultLabel, formatMilliseconds, formatProbability, modelChoiceLabel } from './match-decision-evidence';

/**
 * One stored decision: source, options, deterministic decision, Jev attempt and applied result.
 * Deterministic scores and model probabilities sit in separate columns and never share a label.
 */
export function DecisionEvidence({ evidence }: { evidence: InternalMatchDecisionEvidence }) {
  const model = evidence.modelSelection;
  const answer = model?.attempt.answer;
  const source = evidence.source;
  return (
    <div className="mt-1 border-l-2 border-domain/40 pl-2">
      <Field label="Evidence">
        <Mono>{evidence.evidenceId} · {evidence.disposition}</Mono>
      </Field>
      {!evidence.payloadAvailable ? (
        <p className="py-1 text-[11px] text-muted-foreground">
          {evidence.captureStatus === 'rejected_oversized'
            ? 'Details unavailable: the record exceeded the size limit and was stored without a payload.'
            : `Details unavailable: payload schema ${evidence.schemaVersion} is not readable by this view.`}
        </p>
      ) : (
        <>
          {source && (
            <Field label="Source">
              {[source.title, source.artistNames.join(', '), source.albumName].filter(Boolean).join(' · ')}
              {' '}<Mono>({source.sourcePlatform}:{source.sourceTrackId})</Mono>
            </Field>
          )}
          <Field label="Search">
            <Mono>
              {evidence.trigger} · {evidence.retrieval?.status ?? 'unknown'}
              {evidence.retrieval?.reasonCode ? ` · ${evidence.retrieval.reasonCode}` : ''}
              {evidence.requestedTerritory ? ` · ${evidence.requestedTerritory}${evidence.territoryApplied === false ? ' not applied' : ''}` : ''}
            </Mono>
          </Field>
          {evidence.decision && (
            <Field label="Deterministic">
              <Mono>
                {evidence.decision.kind}
                {evidence.decision.selectedProviderTrackId ? ` · ${evidence.decision.selectedProviderTrackId}` : ''}
              </Mono>
            </Field>
          )}
          <Field label="Jev">
            {model ? (
              <Mono>
                {model.mode} · {model.applied ? 'applied' : 'not applied'} · {modelChoiceLabel(model.attempt)}
              </Mono>
            ) : (
              <span className="text-muted-foreground">No attempt recorded</span>
            )}
          </Field>
          {model && (
            <Field label="Model">
              <Mono>
                {model.attempt.requestedModel}
                {answer ? ` → ${answer.returnedModel}` : ''} · {model.attempt.promptVersion}
              </Mono>
            </Field>
          )}
          {model && (
            <Field label="Model timing">
              <Mono>
                added {formatMilliseconds(model.attempt.elapsedMilliseconds)} · request {formatMilliseconds(model.attempt.requestElapsedMilliseconds)}
                {answer ? ` · tokens ${answer.inputTokens.toLocaleString('en-US')} in, ${answer.outputTokens} out` : ''}
              </Mono>
            </Field>
          )}
          <Field label="Applied result"><Mono>{appliedResultLabel(evidence)}</Mono></Field>
          {evidence.hydration && (
            <Field label="Hydration">
              <Mono>
                {evidence.hydration.status}
                {evidence.hydration.reasonCode ? ` · ${evidence.hydration.reasonCode}` : ''}
                {evidence.hydration.disqualifiers?.length ? ` · ${evidence.hydration.disqualifiers.join(', ')}` : ''}
              </Mono>
            </Field>
          )}
          {evidence.options.length > 0 && (
            <table className="mt-1 w-full text-left text-[10px]">
              <caption className="sr-only">
                Candidate options with deterministic score and model probability for {evidence.evidenceId}
              </caption>
              <thead className="font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 pr-2 font-medium">Option</th>
                  <th scope="col" className="py-1 pr-2 text-right font-medium">Deterministic score</th>
                  <th scope="col" className="py-1 text-right font-medium">Model probability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {evidence.options.map(option => (
                  <tr key={option.providerTrackId}>
                    <td className="py-1 pr-2">
                      <Mono>{option.rank}. {option.providerTrackId}</Mono>
                      <p className="text-muted-foreground">
                        {[option.title, option.artistNames.join(', '), option.albumName].filter(Boolean).join(' · ')}
                      </p>
                      {option.disqualifiers.length > 0 && (
                        <p className="text-destructive">Excluded: {option.disqualifiers.join(', ')}</p>
                      )}
                    </td>
                    <td className="py-1 pr-2 text-right font-mono tabular-nums">{option.score}</td>
                    <td className="py-1 text-right font-mono tabular-nums">{formatProbability(option.modelProbability)}</td>
                  </tr>
                ))}
                {answer && (
                  <tr>
                    <td className="py-1 pr-2"><Mono>no_match</Mono></td>
                    <td className="py-1 pr-2 text-right font-mono">—</td>
                    <td className="py-1 text-right font-mono tabular-nums">{formatProbability(answer.probabilities.no_match)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
