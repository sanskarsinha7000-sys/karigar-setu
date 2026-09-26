const segments = [
  { id: 'home-decor', name: 'Home Decor Retail', priorities: ['Home Decor', 'Wall Art', 'Planter'] },
  { id: 'corporate', name: 'Corporate/Gifting', priorities: ['Jewellery', 'Textiles', 'Gift'] },
  { id: 'tourism', name: 'Tourism', priorities: ['Wearable', 'Home Decor', 'Decor'] },
  { id: 'export', name: 'Export', priorities: ['Textiles', 'Jewellery', 'Home Decor'] }
]

export function fakeMatchEngine(product) {
  return segments.map((s, i) => {
    let score = 60
    if (s.priorities.includes(product.category)) score += 20
    if (product.price && product.price > 1000) score += 5
    score += (product.tags?.length || 0) * 3
    score = Math.min(95, score + i)
    const level = score > 80 ? 'High' : score > 70 ? 'Medium' : 'Good'
    const reason = `${s.name} values ${s.priorities.join(', ')}; this product matches by category${product.price ? ' and price' : ''}.`
    return { segment: s.name, score, level, reason }
  })
}
