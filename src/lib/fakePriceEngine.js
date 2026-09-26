export function fakePriceEngine({ materialTier = 2, laborHours = 5, complexity = 3 }) {
  // deterministic weighted formula
  const materialWeight = materialTier * 0.4
  const laborWeight = Math.min(40, laborHours) * 0.35
  const complexityWeight = complexity * 0.25

  const base = 200
  const score = base + materialWeight * 200 + laborWeight * 15 + complexityWeight * 100

  const min = Math.round(score * 0.85)
  const max = Math.round(score * 1.25)
  const recommended = Math.round((min + max) / 2)

  const breakdown = [
    { factor: 'Material', weight: 0.4, contribution: Math.round(materialWeight * 200) },
    { factor: 'Labor', weight: 0.35, contribution: Math.round(laborWeight * 15) },
    { factor: 'Complexity', weight: 0.25, contribution: Math.round(complexityWeight * 100) }
  ]

  return { min, max, recommended, breakdown }
}
