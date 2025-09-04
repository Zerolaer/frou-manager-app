import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const CONFIG = {
  ticketLiftY: -110,
}

const GREETING_TEXT = "С днём рождения, милая!"
const HINT_TEXT = "Нажми на кнопку, чтобы открыть"

export default function EnvelopePage() {
  const [opened, setOpened] = useState(false)

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-[#0ea5e9]/10 via-[#fdf2f8] to-[#f5f3ff] flex flex-col items-center justify-center">
      <div className="relative w-[92vw] max-w-[420px]" style={{ perspective: 1200 }}>
        <AnimatePresence>
          {opened && (
            <motion.div
              initial={{ y: 60, rotateX: -10, rotateY: -6, opacity: 0, scale: 0.95 }}
              animate={{ y: CONFIG.ticketLiftY, rotateX: 0, rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 16 }}
              className="absolute left-1/2 -translate-x-1/2 z-30"
            >
              <HoloTicket />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative mx-auto h-[270px] w-full">
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background:
                "radial-gradient(120% 120% at 50% 0%, #ffffff 0%, #fff0f6 45%, #eef2ff 100%)",
              boxShadow:
                "0 24px 70px -26px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.85)",
            }}
          />
          <div className="absolute inset-[5px] rounded-[22px] border border-amber-300/60" />

          <motion.div
            className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 origin-top z-40"
            style={{
              borderLeft: "calc(50% - 1px) solid transparent",
              borderRight: "calc(50% - 1px) solid transparent",
              borderTop: "160px solid",
              borderTopColor: "#fff6fb",
              background:
                "linear-gradient(135deg, #fef2f8 0%, #fae8ff 45%, #eef2ff 100%)",
              filter: "drop-shadow(0 12px 26px rgba(0,0,0,0.16))",
            }}
            animate={opened ? { rotateX: -180 } : { rotateX: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
          >
            <motion.button
              onClick={() => setOpened(true)}
              disabled={opened}
              className="pointer-events-auto absolute left-1/2 top-[90px] -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full border border-white/40 bg-gradient-to-b from-violet-600 to-fuchsia-600 text-white text-[11px] font-semibold tracking-wide shadow-md active:scale-[0.98] z-50"
              whileTap={{ scale: 0.96 }}
              aria-label="Открыть конверт"
              title={opened ? "Открыто" : "Открой меня"}
            >
              {opened ? "Открыто" : "Открой меня!"}
            </motion.button>
          </motion.div>

          <div className="absolute inset-x-0 bottom-0 top-[120px] z-10">
            <div
              className="absolute inset-0 rounded-b-3xl"
              style={{
                clipPath: "polygon(0% 16%, 50% 0%, 100% 16%, 100% 100%, 0% 100%)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,248,255,0.98) 100%)",
                boxShadow:
                  "0 25px 60px -22px rgba(0,0,0,0.25), inset 0 2px 6px rgba(255,255,255,0.7)",
              }}
            />
          </div>

          <div className="absolute inset-x-6 top-[172px] z-30 flex items-center justify-center">
            <span className="text-[18px] font-semibold text-neutral-800 drop-shadow">{GREETING_TEXT}</span>
          </div>
        </div>

        <div className="absolute bottom-4 inset-x-0 flex justify-center">
          <span className="text-[13px] text-neutral-700 bg-white/80 backdrop-blur-sm rounded-full px-4 py-1 shadow-sm">
            {HINT_TEXT}
          </span>
        </div>
      </div>
    </div>
  )
}

function HoloTicket() {
  return (
    <motion.div
      className="relative w-[320px] rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 30px 60px -20px rgba(31,41,55,0.45)" }}
    >
      <div className="relative bg-white/95 backdrop-blur-sm p-6 text-center text-xl font-bold text-neutral-800">
        Билет на Олимпийские игры 2026 🎉
      </div>
    </motion.div>
  )
}
