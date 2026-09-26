import React from 'react'
import { useForm } from 'react-hook-form'
import { fakeCatalogGenerator } from '../lib/fakeCatalogGenerator'
import { useProductStore } from '../store/productStore'
import { useDraftStore } from '../store/draftStore'
import Button from '../components/ui/Button'
import { useTranslation } from '../i18n'

// Only genuine image references may be persisted as product images (audit P2-1): the upload
// flow leaves placeholder text ('image-placeholder') or a bare filename ('pot.jpg') on the
// draft, and neither is a usable image source. This mirrors the validity concept ProductCard
// applies when it selects a product image: data:image/, http(s):// and blob: references only.
const IMAGE_REFERENCE = /^(data:image\/|https?:\/\/|blob:)/i

function toProductImages(imageSource) {
  const src = typeof imageSource === 'string' ? imageSource.trim() : ''
  return IMAGE_REFERENCE.test(src) ? [src] : []
}

export default function SmartCatalog(){
  const { t } = useTranslation()
  const { register, handleSubmit, setValue, getValues } = useForm({ defaultValues: { category: 'Home Decor', material: 'Terracotta', technique: 'Wheel-thrown', origin: 'Sundarpur', title: '', description: '', price: '' } })
  const publish = useProductStore(s => s.publish)
  const draft = useDraftStore(s=>s.draft)

  React.useEffect(()=>{
    if(draft){
      setValue('category', draft.category || 'Home Decor')
      setValue('material', draft.material || 'Terracotta')
      setValue('origin', draft.origin || 'Sundarpur')
      setValue('technique', draft.technique || 'Handmade')
      setValue('title', draft.catalogTitle || '')
      setValue('description', draft.catalogDescriptionEn || '')
    }
  },[draft])

  const generate = (data) => {
    const out = fakeCatalogGenerator({ category: data.category, material: data.material, technique: data.technique, origin: data.origin })
    setValue('title', out.title)
    setValue('description', out.description)
  }

  const onPublish = () => {
    const values = getValues()
    const enteredPrice = Number(values.price)
    const product = {
      title: values.title || `${values.origin} ${values.material} ${values.category}`,
      category: values.category,
      material: values.material,
      technique: values.technique,
      price: Number.isFinite(enteredPrice) && enteredPrice > 0 ? enteredPrice : 0,
      tags: [values.material.toLowerCase(), values.technique.toLowerCase()],
      images: toProductImages(draft?.image)
    }
    if (draft?.dominant_colors) product.dominant_colors = draft.dominant_colors
    const id = publish(product)
    useDraftStore.getState().clearDraft()
    alert(t('catalog.publishAlert', { id }))
  }

  return (
    <div>
      <h1 className="text-2xl font-heading text-rust">{t('catalog.title')}</h1>
      <form className="mt-4 grid grid-cols-2 gap-4" onSubmit={(e)=>e.preventDefault()}>
        <input {...register('category')} placeholder={t('catalog.categoryPh')} className="p-2 rounded-md" />
        <input {...register('material')} placeholder={t('catalog.materialPh')} className="p-2 rounded-md" />
        <input {...register('technique')} placeholder={t('catalog.techniquePh')} className="p-2 rounded-md" />
        <input {...register('origin')} placeholder={t('catalog.originPh')} className="p-2 rounded-md" />
        <input {...register('price')} type="number" min="0" step="1" inputMode="numeric" placeholder={t('pricing.yourPrice')} aria-label={t('pricing.yourPrice')} className="p-2 rounded-md" />
        <div className="col-span-2 flex gap-2"><button type="button" className="px-4 py-2 bg-terracotta text-white rounded-md" onClick={()=>{generate(getValues())}}>{t('catalog.autoGenerate')}</button></div>
        <input {...register('title')} placeholder={t('catalog.titlePh')} className="p-2 rounded-md col-span-2" />
        <textarea {...register('description')} placeholder={t('catalog.descriptionPh')} className="p-2 rounded-md col-span-2" />
        <div className="col-span-2 flex justify-end"><Button onClick={onPublish}>{t('catalog.publish')}</Button></div>
      </form>
    </div>
  )
}
