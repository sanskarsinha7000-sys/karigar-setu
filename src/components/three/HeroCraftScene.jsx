import React from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, Float } from '@react-three/drei'

const craftMaterial = (color, metalness = 0.1) => <meshPhysicalMaterial color={color} roughness={0.35} metalness={metalness} clearcoat={0.3} clearcoatRoughness={0.2} />

function Pot(){
  return <Float speed={2.8} rotationIntensity={0.6} floatIntensity={0.8}><group position={[-3.5, 0, 0]} scale={.78} rotation={[0, -0.2, 0]}><mesh><cylinderGeometry args={[.78, 1.05, 1.65, 32]} />{craftMaterial('#a95735')}</mesh><mesh position={[0, .86, 0]}><torusGeometry args={[.72, .13, 16, 48]} />{craftMaterial('#873f2b')}</mesh><mesh position={[0, -.83, 0]}><torusGeometry args={[.78, .09, 12, 40]} />{craftMaterial('#c47b50')}</mesh><mesh position={[0, .1, .8]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.16, .035, 10, 24]} />{craftMaterial('#d9a06d')}</mesh></group></Float>
}

function Basket(){
  return <Float speed={2.8} rotationIntensity={0.6} floatIntensity={0.8}><group position={[-1, .3, -1]} scale={.78} rotation={[0, .25, -.05]}><mesh scale={[1.15, .9, 1.15]}><sphereGeometry args={[1.05, 32, 20]} />{craftMaterial('#ad7b4e')}</mesh><mesh position={[0, .84, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.72, .13, 16, 48]} />{craftMaterial('#caa06a')}</mesh><mesh position={[0, .58, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.91, .1, 16, 48]} />{craftMaterial('#93643d')}</mesh><mesh position={[0, .24, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.02, .08, 16, 48]} />{craftMaterial('#caa06a')}</mesh><mesh position={[0, 1.25, 0]}><torusGeometry args={[.59, .08, 16, 40]} />{craftMaterial('#855b3e')}</mesh></group></Float>
}

function TextileRoll(){
  return <Float speed={2.8} rotationIntensity={0.6} floatIntensity={0.8}><group position={[1.5, 0, .5]} scale={.78} rotation={[0, -.15, .12]}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.65, .65, 1.85, 32]} />{craftMaterial('#536f78')}</mesh><mesh position={[0, .12, .64]} rotation={[0, 0, -.1]}><boxGeometry args={[1.55, .55, .12]} />{craftMaterial('#ad7858')}</mesh><mesh position={[0, -.25, .68]} rotation={[0, 0, .1]}><boxGeometry args={[1.4, .35, .1]} />{craftMaterial('#cbb486')}</mesh><mesh position={[0, -.93, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[.65, .08, 12, 40]} />{craftMaterial('#3f5b63')}</mesh></group></Float>
}

function Jewellery(){
  return <Float speed={2.8} rotationIntensity={0.6} floatIntensity={0.8}><group position={[3.5, .4, -.5]} scale={.78} rotation={[.2, -.2, .1]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.7, .12, 16, 56]} />{craftMaterial('#b28b3f', .8)}</mesh><mesh position={[-.48, -.65, 0]}><sphereGeometry args={[.2, 24, 16]} />{craftMaterial('#a7654d', .7)}</mesh><mesh position={[0, .78, 0]}><sphereGeometry args={[.25, 24, 16]} />{craftMaterial('#c5a14b', .85)}</mesh><mesh position={[.5, -.4, .1]}><sphereGeometry args={[.16, 24, 16]} />{craftMaterial('#65758a', .75)}</mesh></group></Float>
}

export default function HeroCraftScene(){
  return (
    <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 1.5, 9], fov: 40 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#fdf6ec']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#fff4e0" />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#8899ff" />
      <Environment preset="studio" />
      <Pot /><Basket /><TextileRoll /><Jewellery />
      <ContactShadows position={[0, -1.2, 0]} opacity={0.4} blur={2} scale={11} far={4} />
      <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
    </Canvas>
  )
}
