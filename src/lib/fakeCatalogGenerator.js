const templates = {
  'Home Decor': [
    "Handcrafted {material} {category} inspired by traditional {technique} from {origin}.",
    "A warm, handmade {material} {category} that brings heritage craft into modern homes.",
    "Artisan-made {category} in {material}, each piece shows the nuance of {technique}.",
    "Sustainably produced {material} {category}, finished with natural dyes and love."
  ],
  Textiles: [
    "Soft {material} {category} woven with {technique} methods passed through generations.",
    "A versatile {category} in {material} — light, durable, and full of story.",
    "Handloom {category} in {material} featuring {technique} motifs from {origin}.",
    "Elevate your wardrobe with this {material} {category}, slow-made and locally sourced."
  ],
  Jewellery: [
    "Hand-forged {material} {category} with artisanal finishes and a warm patina.",
    "A delicate {category} in {material} — each made by hand using {technique} techniques.",
    "Statement {category} crafted in {material}, ideal for gifting and keepsakes."
  ]
}

export function fakeCatalogGenerator({ category = 'Home Decor', material = 'natural', technique = 'handmade', origin = 'rural craft clusters' }) {
  const pool = templates[category] || templates['Home Decor']
  const idx = (category.length + material.length + technique.length) % pool.length
  const sentence = pool[idx].replace('{material}', material).replace('{category}', category.toLowerCase()).replace('{technique}', technique).replace('{origin}', origin)
  const title = `${origin} ${material} ${category}`
  const description = `${sentence} Care: gentle handwash or dry clean. Size and finishes may vary slightly — this is part of the handcrafted charm.`
  return { title, description }
}
