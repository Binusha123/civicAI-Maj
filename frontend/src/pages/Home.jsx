import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, MapPin, Camera, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRef } from 'react'

export default function Home() {
  const targetRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  })
  
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200])
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200])
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 80, damping: 20 } }
  }

  return (
    <div ref={targetRef} className="w-full">
      {/* Floating Images (Parallax effect to fill empty space) */}
      <motion.div style={{ y: y1 }} className="absolute left-[-5%] top-[20%] w-64 h-64 rounded-3xl overflow-hidden opacity-40 blur-[2px] hidden lg:block rotate-12">
        <img src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800" alt="Pothole" className="w-full h-full object-cover" />
      </motion.div>
      <motion.div style={{ y: y2 }} className="absolute right-[-2%] top-[40%] w-72 h-80 rounded-[3rem] overflow-hidden opacity-30 blur-[1px] hidden lg:block -rotate-6">
        <img src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=800" alt="Garbage" className="w-full h-full object-cover" />
      </motion.div>
      <motion.div style={{ y: y1 }} className="absolute left-[10%] bottom-[-10%] w-56 h-56 rounded-full overflow-hidden opacity-30 blur-[3px] hidden lg:block rotate-45">
        <img src="https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=800" alt="Water Leak" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center justify-center pt-32 pb-16 px-6 text-center max-w-6xl mx-auto relative z-10"
      >
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm font-medium mb-10 backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          Live in 4 Cities. Over 10,000 issues resolved.
        </motion.div>

        <motion.h1 variants={itemVariants} className="text-7xl md:text-[7rem] font-black text-white mb-6 tracking-tighter leading-[0.95] drop-shadow-2xl">
          Don't Just Walk Past It.<br/>
          <span className="bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent italic pr-4">
            Report It.
          </span>
        </motion.h1>

        <motion.p variants={itemVariants} className="text-xl md:text-2xl text-slate-400 mb-14 max-w-3xl font-light leading-relaxed">
          The AI-powered civic platform that sees what you see. Snap a photo of a pothole, leak, or hazard, and our vision models instantly route it to the right department.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
          <Link to="/report">
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(59, 130, 246, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-white text-black rounded-full font-bold text-xl flex items-center justify-center gap-3 transition-all w-full"
            >
              Report an Issue <ArrowRight size={24} />
            </motion.button>
          </Link>
          <Link to="/login">
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-white/5 border border-white/20 rounded-full font-bold text-xl text-white backdrop-blur-lg transition-all flex items-center justify-center gap-3 w-full shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            >
              Track Complaint
            </motion.button>
          </Link>
        </motion.div>

      </motion.div>

      {/* Animated Marquee */}
      <div className="w-full overflow-hidden whitespace-nowrap bg-gradient-to-r from-blue-600 to-purple-600 py-4 my-16 rotate-1 border-y border-white/20">
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 20, repeat: Infinity }}
          className="inline-block text-2xl font-black text-white uppercase tracking-widest"
        >
          <span className="mx-8">• FIX POTHOLES</span>
          <span className="mx-8">• CLEAN ILLEGAL DUMPING</span>
          <span className="mx-8">• REPAIR BROKEN STREETLIGHTS</span>
          <span className="mx-8">• STOP WATER LEAKS</span>
          <span className="mx-8">• SECURE FALLEN WIRES</span>
          <span className="mx-8">• FIX POTHOLES</span>
          <span className="mx-8">• CLEAN ILLEGAL DUMPING</span>
          <span className="mx-8">• REPAIR BROKEN STREETLIGHTS</span>
          <span className="mx-8">• STOP WATER LEAKS</span>
          <span className="mx-8">• SECURE FALLEN WIRES</span>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6 pb-32 perspective-1000"
      >
        <FeatureCard 
          icon={<Camera size={32} className="text-white"/>} 
          title="1. AI Vision Capture" 
          desc="Just point your camera. Our YOLO models detect the hazard type instantly without manual entry." 
          glowColor="rgba(59, 130, 246, 0.8)"
          gradient="from-blue-600 to-indigo-600"
        />
        <FeatureCard 
          icon={<MapPin size={32} className="text-white"/>} 
          title="2. Smart Geolocation" 
          desc="We pinpoint the exact coordinates and group similar reports within a 50m radius to prevent department spam." 
          glowColor="rgba(168, 85, 247, 0.8)"
          gradient="from-purple-600 to-pink-600"
        />
        <FeatureCard 
          icon={<CheckCircle2 size={32} className="text-white"/>} 
          title="3. Live Resolution" 
          desc="Watch the timeline progress from 'Assigned' to 'Resolved' with verified before-and-after photos." 
          glowColor="rgba(16, 185, 129, 0.8)"
          gradient="from-emerald-500 to-green-600"
        />
      </motion.div>
    </div>
  )
}

function FeatureCard({ icon, title, desc, glowColor, gradient }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.05, rotateY: 10, rotateX: -10, z: 50, boxShadow: `0 30px 60px -20px ${glowColor}` }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ transformStyle: "preserve-3d" }}
      className="relative p-10 rounded-[2rem] bg-[#0A0A0B] border border-white/10 transition-all group overflow-visible"
    >
      {/* 3D Grid Background inside card */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] rounded-[2rem] overflow-hidden opacity-50 [transform:translateZ(-20px)]" />
      
      {/* Animated Glowing Orb behind icon */}
      <div className={`absolute top-10 left-10 w-24 h-24 bg-gradient-to-r ${gradient} rounded-full blur-[40px] opacity-0 group-hover:opacity-40 transition-opacity duration-500 [transform:translateZ(-10px)] animate-pulse`} />
      
      <div className="relative z-10 flex flex-col items-start h-full [transform:translateZ(30px)]">
        <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight drop-shadow-lg">{title}</h3>
        <p className="text-slate-300 leading-relaxed text-sm drop-shadow-md">{desc}</p>
      </div>

      {/* Glass Reflection */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-white/0 via-white/[0.05] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none [transform:translateZ(40px)]" />
    </motion.div>
  )
}
