import { useState } from 'react';

interface ArtifactTell {
  name: string;
  description: string;
  region: string;
}

const ARTIFACT_TELLS: ArtifactTell[] = [
  {
    name: 'Eye Inconsistency',
    description:
      "GAN models often struggle with eyes — look for asymmetric irises, unnatural reflections, or pupils that don't align with the light source.",
    region: 'Eyes',
  },
  {
    name: 'Hairline Bleeding',
    description:
      'Where hair meets the background is computationally hard. Fakes often show color bleeding, mismatched edges, or smooth transitions where there should be individual strands.',
    region: 'Hair / Edges',
  },
  {
    name: 'Ear / Jewelry Artifacts',
    description:
      'Earrings, glasses, and ears are rarely generated correctly. Watch for missing accessories, asymmetry, or geometric distortions.',
    region: 'Ears / Accessories',
  },
  {
    name: 'Skin Over-Smoothing',
    description:
      'AI images tend to have unnaturally smooth, poreless skin. Real faces have pores, fine lines, and subtle texture variation.',
    region: 'Skin / Texture',
  },
  {
    name: 'Background Incoherence',
    description:
      "Objects in the background may appear blurry, repeated, or geometrically impossible — especially near the subject's silhouette.",
    region: 'Background',
  },
  {
    name: 'Lighting Contradiction',
    description:
      'Shadows and highlights on the face may contradict the environmental lighting. Nose and chin shadows are common failure points.',
    region: 'Shadows / Lighting',
  },
];

export function EducationalMode() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="educational-panel"
        className="flex w-full items-center justify-between rounded-lg border border-slate-750 bg-surface-raised px-5 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-surface-overlay"
      >
        <span className="font-display">Field Guide — How to spot a deepfake</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div
          id="educational-panel"
          role="region"
          aria-label="Deepfake artifact guide"
          className="mt-2 rounded-lg border border-slate-750 bg-surface-raised p-5"
        >
          <p className="mb-4 text-sm text-slate-400">
            Modern deepfake detectors look for statistical fingerprints invisible to the naked eye.
            Here are the most common visual tells you can check yourself:
          </p>

          <dl className="flex flex-col gap-3">
            {ARTIFACT_TELLS.map((tell) => (
              <div key={tell.name} className="rounded-md border border-slate-750 bg-surface p-4">
                <dt className="flex items-center justify-between">
                  <span className="font-display text-sm font-semibold text-slate-200">
                    {tell.name}
                  </span>
                  <span className="text-xs font-medium text-accent">{tell.region}</span>
                </dt>
                <dd className="mt-1 text-xs text-slate-400 leading-relaxed">{tell.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
