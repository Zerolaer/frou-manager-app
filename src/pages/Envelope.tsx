// src/pages/Envelope.tsx
import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const CONFIG = {
  ticketLiftY: -110,
  shardsCount: 26,
}

const GREETING_TEXT = "С днём рождения, милая!"
const HINT_TEXT = "Нажми на кнопку, чтобы открыть"

export default function EnvelopePage() {
  const [opened, setOpened] = useState(false)

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-[#0ea5e9]/10 via-[#fdf2f8] to-[#f5f3ff] flex flex-col items-center justify-center">
      {/* Фоновые лучи */}
      <LightRays active={opened} />

      <div className="relative w-[92vw] max-w-[420px]" style={{ perspective: 1200 }}>
        {/* Частицы-осколки при открытии */}
        <AnimatePresence>{opened && <ShardsBurst count={CONFIG.shardsCount} />}</AnimatePresence>

        {/* Билет */}
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

        {/* Конверт */}
        <div className="relative mx-auto h-[270px] w-full">
          {/* Задняя панель */}
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

          {/* Клапан + печать + кнопка */}
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
            {/* «восковая» печать */}
            <motion.div
              className="absolute left-1/2 top-[90px] -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full"
              style={{
                background:
                  "radial-gradient(60% 60% at 40% 40%, #fbbf24 0%, #f59e0b 65%, #b45309 100%)",
                boxShadow:
                  "0 6px 12px rgba(0,0,0,0.25), inset 0 3px 8px rgba(255,255,255,0.45)",
              }}
              initial={false}
              animate={{ scale: opened ? 1.05 : 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />

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

          {/* Передний «карман» */}
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

          {/* Текст на конверте */}
          <div className="absolute inset-x-6 top-[172px] z-30 flex items-center justify-center">
            <span className="text-[18px] font-semibold text-neutral-800 drop-shadow">{GREETING_TEXT}</span>
          </div>
        </div>

        {/* Подсказка снизу */}
        <div className="absolute bottom-4 inset-x-0 flex justify-center">
          <span className="text-[13px] text-neutral-700 bg-white/80 backdrop-blur-sm rounded-full px-4 py-1 shadow-sm">
            {HINT_TEXT}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ============== Вспомогательные части ============== */

function HoloTicket() {
  return (
    <motion.div
      className="relative w-[320px] rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 30px 60px -20px rgba(31,41,55,0.45)", transformStyle: "preserve-3d" }}
      animate={{ rotateX: [0, 2, -2, 0], rotateY: [0, -2, 2, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Голографический слой */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: "conic-gradient(from 0deg, #8b5cf6, #ec4899, #f59e0b, #22d3ee, #8b5cf6)",
          mixBlendMode: "multiply",
        }}
      />
      <div className="relative bg-white/95 backdrop-blur-sm">
        {/* Шапка */}
        <div className="relative overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500" />
          {/* Блик */}
          <motion.div
            className="absolute -inset-y-3 -left-10 w-24 rotate-12 bg-white/35 blur-md"
            initial={{ x: -120, opacity: 0 }}
            animate={{ x: 380, opacity: 1 }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2 }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <div className="text-white/95">
              <div className="text-xs uppercase tracking-wider opacity-90">Winter Games 2026</div>
              <div className="text-base font-semibold">Figure Skating — Cat C</div>
            </div>
            <div className="text-right text-white/90">
              <div className="text-[10px] uppercase tracking-wider">Feb 13, 2026</div>
              <div className="text-xs font-medium">OFSK07</div>
            </div>
          </div>
        </div>

        {/* Тело билета */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-5 grid-rows-5 gap-[3px] p-2 rounded-md bg-neutral-100">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className={i % 3 === 0 ? "bg-neutral-800" : "bg-neutral-300"} style={{ width: 8, height: 8 }} />
              ))}
            </div>
            <div className="text-sm">
              <div className="text-neutral-800 font-semibold">Winter Essentials</div>
              <div className="text-neutral-600">Милан — Cortina 2026</div>
              <div className="mt-1 text-[11px] text-neutral-500">Вход с 18:00 • Сектор C • Электронный билет</div>
            </div>
          </div>
          {/* Перфорация */}
          <div className="relative my-4">
            <div className="h-px bg-neutral-200" />
            <div className="absolute -top-2 left-0 right-0 flex justify-between px-3 text-neutral-300">
              {Array.from({ length: 22 }).map((_, i) => (
                <span key={i}>•</span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-400">Holder</div>
              <div className="font-medium text-neutral-700">Your Guest</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400">Booking</div>
              <div className="font-semibold text-neutral-700">#135400</div>
            </div>
          </div>
        </div>
      </div>

      {/* Глянец */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{
          background: [
            "linear-gradient(130deg, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0.0) 65%)",
            "linear-gradient(130deg, rgba(255,255,255,0.0) 40%, rgba(255,255,255,0.35) 58%, rgba(255,255,255,0.0) 75%)",
          ],
        }}
        transition={{ duration: 2.8, repeat: Infinity }}
        style={{ mixBlendMode: "screen" }}
      />
    </motion.div>
  )
}

function LightRays({ active }: { active: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* мягкое свечение */}
      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8),transparent_60%)] blur-3xl" />
      {/* лучи */}
      <div className="absolute inset-0" style={{ maskImage: "radial-gradient(circle at 50% 40%, black 40%, transparent 70%)" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-[35%] h-[55vh] w-[2px] bg-white/30"
            style={{ transformOrigin: "top" }}
            initial={{ rotate: i * (360 / 9) }}
            animate={{ rotate: [i * 40, i * 40 + 10, i * 40] }}
            transition={{ duration: 6 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function ShardsBurst({ count }: { count: number }) {
  const shards = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 120 - 60,
        y: 160 + Math.random() * 80,
        rot: Math.random() * 360,
        w: 6 + Math.random() * 10,
        h: 10 + Math.random() * 16,
        hue: Math.floor(Math.random() * 360),
        delay: Math.random() * 0.1,
      })),
    [count]
  )
  return (
    <div className="pointer-events-none absolute left-1/2 top-[80px] -translate-x-1/2 z-20">
      {shards.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          initial={{ y: -10, x: 0, rotate: 0, opacity: 0, scale: 0.6 }}
          animate={{ y: s.y, x: s.x, rotate: s.rot, opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9 + Math.random() * 0.5, delay: s.delay, ease: "easeOut" }}
        >
          <div
            className="rounded-sm"
            style={{
              width: s.w,
              height: s.h,
              background: `linear-gradient(135deg, hsl(${s.hue} 85% 70%), hsl(${(s.hue + 60) % 360} 85% 60%))`,
              boxShadow: "0 6px 12px rgba(0,0,0,0.18)",
              transform: `skewY(${(Math.random() * 18 - 9).toFixed(1)}deg)`,
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}
