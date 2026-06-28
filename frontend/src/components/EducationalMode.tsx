import { useState } from 'react';

interface ArtifactExample {
  name: string;
  description: string;
  region: string;
  emoji: string;
}

const ARTIFACT_EXAMPLES: ArtifactExample[] = [
  {
    name: 'Eye Inconsistency',
    description: 'GAN models often struggle with eyes — look for asymmetric irises, unnatural reflections, or pupils that don\'t align with the light source.',
    region: 'Eyes',
    emoji: '👁️',
  },
  {
    name: 'Hairline Bleeding',
    description: 'Where hair meets the background is computationally hard. Fakes often show color bleeding, mismatched edges, or smooth transitions where there should be individual strands.',
    region: 'Hair / Edges',
    emoji: '💇',
  },
  {
    name: 'Ear / Jewelry Artifacts',
    description: 'Earrings, glasses, and ears are rarely generated correctly. Watch for missing accessories, asymmetry, or geometric distortions.',
    region: 'Ears / Accessories',
    emoji: '💎',
  },
  {
    name: 'Skin Over-Smoothing',
    description: 'AI images tend to have unnaturally smooth, poreless skin. Real faces have pores, fine lines, and subtle texture variation.',
    region: 'Skin / Texture',
    emoji: '🫧',
  },
  {
    name: 'Background Incoherence',
    description: 'Objects in the background may appear blurry, repeated, or geometrically impossible — especially near the subject\'s silhouette.',
    region: 'Background',
    emoji: '🌆',
  },
  {
    name: 'Lighting Contradiction',
    description: 'Shadows and highlights on the face may contradict the environmental lighting. Nose and chin shadows are common failure points.',
    region: 'Shadows / Lighting',
    emoji: '💡',
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
        className="flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-left text-sm font-semibold text-blue-800 transition hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <span>📚 Educational Mode — How to spot a deepfake</span>
        <span aria-hidden="true" className="text-lg">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          id="educational-panel"
          role="region"
          aria-label="Deepfake artifact guide"
          className="mt-2 animate-fade-in rounded-xl border border-blue-100 bg-white p-5"
        >
          <p className="mb-4 text-sm text-gray-600">
            Modern deepfake detectors look for statistical fingerprints invisible to the naked eye. Here are the most common visual tells you can check yourself:
          </p>

          <ul className="grid gap-3 sm:grid-cols-2" role="list">
            {ARTIFACT_EXAMPLES.map((example) => (
              <li
                key={example.name}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span aria-hidden="true" className="text-xl">{example.emoji}</span>
                  <h4 className="text-sm font-semibold text-gray-800">{example.name}</h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{example.description}</p>
                <p className="mt-2 text-xs font-medium text-blue-600">Region: {example.region}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
